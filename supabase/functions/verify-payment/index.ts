import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VERIFY-PAYMENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Use service role for database operations
    const { config } = await import('../_shared/config.ts');

    const stripeKey = config.stripe.secretKey;
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified", { testMode: config.stripe.testMode });
    const supabaseService = createClient(
      config.supabase.url,
      config.supabase.key,
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    
    // Use the anon client first to validate the user token
    const supabaseAnon = createClient(
      config.supabase.url,
      config.supabase.anonKey
    );
    
    const { data: userData, error: userError } = await supabaseAnon.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);

    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const { session_id } = await req.json();
    if (!session_id) {
      throw new Error("Session ID is required");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Retrieve the checkout session from Stripe to verify payment
    const session = await stripe.checkout.sessions.retrieve(session_id);
    logStep("Retrieved Stripe session", { sessionId: session_id, status: session.payment_status });

    if (session.payment_status !== 'paid') {
      throw new Error("Payment not completed");
    }

    // Verify the session belongs to this user
    if (session.customer_email !== user.email && session.metadata?.user_id !== user.id) {
      throw new Error("Session does not belong to authenticated user");
    }

    const paymentType = session.metadata?.type;
    const searchQuery = session.metadata?.search_query;

    logStep("Session verified", { paymentType, searchQuery, amount: session.amount_total });

    if (paymentType === 'subscription') {
      // Handle subscription payment
      if (session.mode === 'subscription' && session.subscription) {
        // Retrieve the subscription details from Stripe
        const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
        logStep("Retrieved subscription", { subscriptionId: subscription.id, status: subscription.status });

        if (subscription.status === 'active') {
          // Calculate subscription end date
          const subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();

          // Check if subscription record already exists
          const { data: existingSubscription } = await supabaseService
            .from('subscriptions')
            .select('id')
            .eq('user_id', user.id)
            .eq('stripe_subscription_id', subscription.id)
            .single();

          if (!existingSubscription) {
            // Create new subscription record
            const { error: subscriptionError } = await supabaseService
              .from('subscriptions')
              .insert({
                user_id: user.id,
                stripe_customer_id: subscription.customer as string,
                stripe_subscription_id: subscription.id,
                is_active: true,
                plan_type: 'premium',
                subscription_end: subscriptionEnd,
              });

            if (subscriptionError) {
              logStep("Error creating subscription record", { error: subscriptionError });
              throw subscriptionError;
            }

            logStep("Successfully created subscription record", { subscriptionId: subscription.id });
          } else {
            // Update existing subscription record
            const { error: updateError } = await supabaseService
              .from('subscriptions')
              .update({
                is_active: true,
                subscription_end: subscriptionEnd,
                updated_at: new Date().toISOString(),
              })
              .eq('user_id', user.id)
              .eq('stripe_subscription_id', subscription.id);

            if (updateError) {
              logStep("Error updating subscription record", { error: updateError });
              throw updateError;
            }

            logStep("Successfully updated subscription record", { subscriptionId: subscription.id });
          }
        } else {
          throw new Error(`Subscription status is ${subscription.status}, not active`);
        }
      } else {
        throw new Error("Invalid subscription session");
      }
    } else if (paymentType === 'unlock' && searchQuery) {
      // Handle unlock payment
      // Check if unlock already recorded to prevent duplicates
      const { data: existingUnlock } = await supabaseService
        .from('search_unlocks')
        .select('id')
        .eq('user_id', user.id)
        .eq('search_query', searchQuery)
        .single();

      if (!existingUnlock) {
        const amount = session.amount_total ? (session.amount_total / 100) : 4.99; // Convert from cents

        const { error: unlockError } = await supabaseService
          .from('search_unlocks')
          .insert({
            user_id: user.id,
            search_query: searchQuery,
            payment_amount: amount,
            unlock_date: new Date().toISOString(),
          });

        if (unlockError) {
          logStep("Error recording search unlock", { error: unlockError });
          throw unlockError;
        }

        logStep("Successfully recorded search unlock", { searchQuery, amount });
      } else {
        logStep("Search unlock already exists", { searchQuery });
      }
    }

    // Update payment transaction status
    const { error: updateError } = await supabaseService
      .from('payment_transactions')
      .update({
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('stripe_session_id', session_id);

    if (updateError) {
      logStep("Error updating payment transaction", { error: updateError });
    } else {
      logStep("Payment transaction updated to completed");
    }

    return new Response(JSON.stringify({
      success: true,
      payment_verified: true,
      unlock_recorded: paymentType === 'unlock',
      subscription_recorded: paymentType === 'subscription'
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});