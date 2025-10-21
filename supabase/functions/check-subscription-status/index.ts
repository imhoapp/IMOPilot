import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import Stripe from "https://esm.sh/stripe@14.21.0";

// Inline config (avoid cross-file imports to prevent boot errors)
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || '';
const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY') || '';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION-STATUS] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = STRIPE_SECRET_KEY;
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    // Use service role for database operations
    const supabaseService = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    // Use anon client for user authentication
    const supabaseAnon = createClient(
      SUPABASE_URL,
      SUPABASE_ANON_KEY
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAnon.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);

    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Find Stripe customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let hasActiveSubscription = false;
    let subscriptionData = null;
    const unlockedSearches: string[] = [];

    if (customers.data.length > 0) {
      const customerId = customers.data[0].id;
      logStep("Found Stripe customer", { customerId });

      // Check for active subscriptions (including cancelled ones still in grace period)
      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: "active",
        limit: 1,
      });

      if (subscriptions.data.length > 0) {
        hasActiveSubscription = true;
        const subscription = subscriptions.data[0];
        subscriptionData = {
          id: subscription.id,
          status: subscription.status,
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          plan_type: "premium",
          cancel_at_period_end: subscription.cancel_at_period_end,
          canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null
        };
        logStep("Active subscription found", subscriptionData);

        // Update subscriptions table
        await supabaseService.from("subscriptions").upsert({
          user_id: user.id,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscription.id,
          plan_type: "premium",
          is_active: true,
          subscription_end: subscriptionData.current_period_end,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });

        // Update profile
        await supabaseService.from("profiles").update({
          subscription_tier: "premium",
          access_level: "premium",
          updated_at: new Date().toISOString()
        }).eq("id", user.id);

      } else {
        logStep("No active subscription found");

        // Update subscriptions table to inactive
        await supabaseService.from("subscriptions").upsert({
          user_id: user.id,
          stripe_customer_id: customerId,
          stripe_subscription_id: null,
          plan_type: "free",
          is_active: false,
          subscription_end: null,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });

        // Update profile to basic
        await supabaseService.from("profiles").update({
          subscription_tier: "free",
          access_level: "basic",
          updated_at: new Date().toISOString()
        }).eq("id", user.id);
      }

      // Check for successful one-time payments (search unlocks)
      const sessions = await stripe.checkout.sessions.list({
        customer: customerId,
        status: "complete",
        limit: 100,
      });

      const unlockSessions = sessions.data.filter(session =>
        session.metadata?.type === "unlock" &&
        session.payment_status === "paid"
      );

      for (const session of unlockSessions) {
        const searchQuery = session.metadata?.search_query;
        if (searchQuery) {
          unlockedSearches.push(searchQuery);

          // Ensure search unlock is recorded in database
          const { error: unlockError } = await supabaseService
            .from("search_unlocks")
            .upsert({
              user_id: user.id,
              search_query: searchQuery,
              payment_amount: 4.99,
              unlock_date: new Date(session.created * 1000).toISOString()
            }, {
              onConflict: 'user_id,search_query',
              ignoreDuplicates: true
            });

          if (unlockError) {
            logStep("Error recording search unlock", { searchQuery, error: unlockError });
          }
        }
      }

      logStep("Search unlocks processed", { unlockedSearches });
    } else {
      logStep("No Stripe customer found");

      // Ensure user has basic profile
      await supabaseService.from("profiles").upsert({
        id: user.id,
        email: user.email,
        subscription_tier: "free",
        access_level: "basic",
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });
    }

    // Get existing search unlocks from database
    const { data: existingUnlocks } = await supabaseService
      .from("search_unlocks")
      .select("search_query")
      .eq("user_id", user.id);

    const dbUnlockedSearches = existingUnlocks?.map(unlock => unlock.search_query) || [];
    const allUnlockedSearches = [...new Set([...unlockedSearches, ...dbUnlockedSearches])];

    const response = {
      hasActiveSubscription,
      subscription: subscriptionData,
      unlockedSearches: allUnlockedSearches,
      unlockedCategories: [], // Legacy support - empty array since we now use search queries
      accessLevel: hasActiveSubscription ? "premium" : "basic"
    };

    logStep("Returning status", response);

    return new Response(JSON.stringify(response), {
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