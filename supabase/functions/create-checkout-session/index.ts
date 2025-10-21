import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT-SESSION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const { config } = await import('../_shared/config.ts');
    const stripeKey = config.stripe.secretKey;
    if (!stripeKey) throw new Error("Stripe secret key is not set");
    logStep("Stripe key verified", { testMode: config.stripe.testMode });

    // Use service role for database operations
    const supabaseService = createClient(
      config.supabase.url,
      config.supabase.key,
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseService.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);

    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const { type, category, search_query, redirect_url } = await req.json();
    if (!type || !["subscription", "unlock"].includes(type)) {
      throw new Error("Invalid or missing type. Must be 'subscription' or 'unlock'");
    }

    if (type === "unlock" && !search_query) {
      throw new Error("Search query is required for unlock type");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Check if customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Found existing customer", { customerId });
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { user_id: user.id }
      });
      customerId = customer.id;
      logStep("Created new customer", { customerId });
    }

    // Use redirect_url if provided, otherwise fall back to current origin
    const cancelUrl = redirect_url || `${req.headers.get("origin")}/payment-canceled?type=${type}${search_query ? `&search_query=${encodeURIComponent(search_query)}` : ''}`;
    const successUrl = redirect_url || `${req.headers.get("origin")}/payment-success?session_id={CHECKOUT_SESSION_ID}&type=${type}${search_query ? `&search_query=${encodeURIComponent(search_query)}` : ''}`;

    let sessionConfig: any = {
      customer: customerId,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        user_id: user.id,
        type: type,
        ...(search_query && { search_query }),
        ...(category && { category })
      }
    };

    if (type === "subscription") {
      // Monthly subscription - $10.99
      sessionConfig = {
        ...sessionConfig,
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: "Monthly Premium Subscription",
                description: "Access to all premium features and categories"
              },
              unit_amount: 1099, // $10.99
              recurring: { interval: "month" },
            },
            quantity: 1,
          },
        ],
        mode: "subscription",
      };
      logStep("Creating subscription checkout session");
    } else {
      // One-time unlock - $4.99
      sessionConfig = {
        ...sessionConfig,
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: `Search Unlock: ${search_query}`,
                description: `One-time unlock for search: "${search_query}"`
              },
              unit_amount: 499, // $4.99
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        metadata: {
          ...sessionConfig.metadata,
          search_query: search_query
        }
      };
      logStep("Creating one-time unlock checkout session", { search_query });
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);
    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    // Create payment transaction record
    const transactionData = {
      user_id: user.id,
      transaction_id: session.id,
      amount: type === "subscription" ? 10.99 : 4.99,
      type: type,
      status: "pending",
      stripe_session_id: session.id
    };

    const { error: insertError } = await supabaseService
      .from("payment_transactions")
      .insert(transactionData);

    if (insertError) {
      logStep("Error creating transaction record", { error: insertError });
    } else {
      logStep("Transaction record created");
    }

    return new Response(JSON.stringify({ url: session.url }), {
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