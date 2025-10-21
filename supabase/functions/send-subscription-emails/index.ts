import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  type: 'welcome' | 'subscription_active' | 'subscription_cancelled' | 'payment_failed' | 'grace_period';
  userEmail: string;
  userName?: string;
  planType?: string;
  amount?: number;
  graceEndDate?: string;
}

const emailTemplates = {
  welcome: (userName: string) => ({
    subject: "Welcome to ProductFinder Pro!",
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 40px;">
          <h1 style="color: #2563eb; margin-bottom: 10px;">Welcome to ProductFinder Pro!</h1>
          <p style="font-size: 18px; color: #6b7280;">Your AI-powered product discovery journey starts here</p>
        </div>
        
        <div style="background: #f8fafc; border-radius: 12px; padding: 30px; margin-bottom: 30px;">
          <h2 style="color: #1f2937; margin-bottom: 20px;">Hi ${userName || 'there'}! 👋</h2>
          <p style="color: #4b5563; line-height: 1.6; margin-bottom: 20px;">
            Thank you for joining ProductFinder Pro! We're excited to help you discover the perfect products with our AI-powered analysis.
          </p>
          <p style="color: #4b5563; line-height: 1.6;">
            You're currently on our <strong>Free Plan</strong>, which gives you access to:
          </p>
          <ul style="color: #4b5563; line-height: 1.6; margin: 15px 0;">
            <li>✅ View up to 3 products per search</li>
            <li>✅ Basic product information and reviews</li>
            <li>✅ Limited category access</li>
          </ul>
        </div>
        
        <div style="background: linear-gradient(135deg, #fef3c7, #fcd34d); border-radius: 12px; padding: 20px; margin-bottom: 30px;">
          <h3 style="color: #92400e; margin-bottom: 15px;">🚀 Ready to unlock more?</h3>
          <p style="color: #92400e; margin-bottom: 15px;">
            Upgrade to Premium for unlimited access to all categories and products!
          </p>
          <a href="${Deno.env.get("SITE_URL") || "https://localhost:3000"}/profile" 
             style="background: #2563eb; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; display: inline-block; font-weight: 500;">
            View Plans →
          </a>
        </div>
        
        <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; font-size: 14px;">
            Happy product hunting!<br>
            The ProductFinder Pro Team
          </p>
        </div>
      </div>
    `,
  }),

  subscription_active: (userName: string, planType: string, amount: number) => ({
    subject: "🎉 Welcome to Premium!",
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 40px;">
          <div style="background: linear-gradient(135deg, #fbbf24, #f59e0b); width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
            <span style="font-size: 32px;">👑</span>
          </div>
          <h1 style="color: #2563eb; margin-bottom: 10px;">Welcome to Premium!</h1>
          <p style="font-size: 18px; color: #6b7280;">Your subscription is now active</p>
        </div>
        
        <div style="background: #f8fafc; border-radius: 12px; padding: 30px; margin-bottom: 30px;">
          <h2 style="color: #1f2937; margin-bottom: 20px;">Hi ${userName || 'there'}! 🎉</h2>
          <p style="color: #4b5563; line-height: 1.6; margin-bottom: 20px;">
            Congratulations! Your <strong>${planType} subscription</strong> is now active. You now have unlimited access to all our premium features.
          </p>
          <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="color: #1f2937; margin-bottom: 15px;">What's included:</h3>
            <ul style="color: #4b5563; line-height: 1.6; margin: 0; padding-left: 20px;">
              <li>🔓 Access to ALL product categories</li>
              <li>🔍 Unlimited product searches</li>
              <li>🤖 Priority AI analysis</li>
              <li>⭐ Advanced filtering and sorting</li>
              <li>📈 Premium analytics dashboard</li>
            </ul>
          </div>
          <p style="color: #4b5563; line-height: 1.6;">
            <strong>Subscription Details:</strong><br>
            Plan: ${planType}<br>
            Amount: $${amount}/month<br>
            Billing: Monthly (cancel anytime)
          </p>
        </div>
        
        <div style="text-align: center; margin-bottom: 30px;">
          <a href="${Deno.env.get("SITE_URL") || "https://localhost:3000"}" 
             style="background: #2563eb; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; display: inline-block; font-weight: 500; margin-right: 10px;">
            Start Exploring →
          </a>
          <a href="${Deno.env.get("SITE_URL") || "https://localhost:3000"}/profile" 
             style="background: transparent; color: #2563eb; text-decoration: none; padding: 12px 24px; border-radius: 8px; display: inline-block; font-weight: 500; border: 1px solid #2563eb;">
            Manage Subscription
          </a>
        </div>
        
        <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; font-size: 14px;">
            Thank you for upgrading!<br>
            The ProductFinder Pro Team
          </p>
        </div>
      </div>
    `,
  }),

  subscription_cancelled: (userName: string) => ({
    subject: "We're sorry to see you go",
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 40px;">
          <h1 style="color: #ef4444; margin-bottom: 10px;">Subscription Cancelled</h1>
          <p style="font-size: 18px; color: #6b7280;">We're sorry to see you go</p>
        </div>
        
        <div style="background: #fef2f2; border-radius: 12px; padding: 30px; margin-bottom: 30px; border-left: 4px solid #ef4444;">
          <h2 style="color: #1f2937; margin-bottom: 20px;">Hi ${userName || 'there'},</h2>
          <p style="color: #4b5563; line-height: 1.6; margin-bottom: 20px;">
            Your premium subscription has been cancelled successfully. You'll continue to have access to premium features until the end of your current billing period.
          </p>
          <p style="color: #4b5563; line-height: 1.6;">
            After that, you'll be moved to our free tier, which includes:
          </p>
          <ul style="color: #4b5563; line-height: 1.6; margin: 15px 0;">
            <li>✅ View up to 3 products per search</li>
            <li>✅ Basic product information</li>
            <li>✅ Limited category access</li>
          </ul>
        </div>
        
        <div style="background: #f0f9ff; border-radius: 12px; padding: 20px; margin-bottom: 30px;">
          <h3 style="color: #0369a1; margin-bottom: 15px;">💙 We'd love to have you back!</h3>
          <p style="color: #0369a1; margin-bottom: 15px;">
            You can reactivate your subscription anytime to regain access to all premium features.
          </p>
          <a href="${Deno.env.get("SITE_URL") || "https://localhost:3000"}/profile" 
             style="background: #2563eb; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; display: inline-block; font-weight: 500;">
            Reactivate Subscription
          </a>
        </div>
        
        <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; font-size: 14px;">
            Thank you for trying ProductFinder Pro<br>
            The ProductFinder Pro Team
          </p>
        </div>
      </div>
    `,
  }),

  payment_failed: (userName: string, graceEndDate: string) => ({
    subject: "⚠️ Payment Issue - Action Required",
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 40px;">
          <div style="background: #fbbf24; width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
            <span style="font-size: 32px;">⚠️</span>
          </div>
          <h1 style="color: #dc2626; margin-bottom: 10px;">Payment Issue</h1>
          <p style="font-size: 18px; color: #6b7280;">We couldn't process your payment</p>
        </div>
        
        <div style="background: #fef2f2; border-radius: 12px; padding: 30px; margin-bottom: 30px; border-left: 4px solid #dc2626;">
          <h2 style="color: #1f2937; margin-bottom: 20px;">Hi ${userName || 'there'},</h2>
          <p style="color: #4b5563; line-height: 1.6; margin-bottom: 20px;">
            We encountered an issue processing your recent payment for ProductFinder Pro. This could be due to:
          </p>
          <ul style="color: #4b5563; line-height: 1.6; margin: 15px 0;">
            <li>• Expired credit card</li>
            <li>• Insufficient funds</li>
            <li>• Changed billing address</li>
            <li>• Bank security restrictions</li>
          </ul>
          <p style="color: #4b5563; line-height: 1.6;">
            <strong>Grace Period:</strong> Your premium access will continue until <strong>${graceEndDate}</strong> to give you time to update your payment method.
          </p>
        </div>
        
        <div style="text-align: center; margin-bottom: 30px;">
          <a href="${Deno.env.get("SITE_URL") || "https://localhost:3000"}/profile" 
             style="background: #dc2626; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; display: inline-block; font-weight: 500; margin-bottom: 10px;">
            Update Payment Method →
          </a>
          <p style="color: #6b7280; font-size: 14px;">
            Click above to update your payment information
          </p>
        </div>
        
        <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; font-size: 14px;">
            Need help? Reply to this email<br>
            The ProductFinder Pro Team
          </p>
        </div>
      </div>
    `,
  }),

  grace_period: (userName: string) => ({
    subject: "⏰ Premium Access Ending Soon",
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 40px;">
          <div style="background: #f59e0b; width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
            <span style="font-size: 32px;">⏰</span>
          </div>
          <h1 style="color: #dc2626; margin-bottom: 10px;">Access Ending Soon</h1>
          <p style="font-size: 18px; color: #6b7280;">Your premium access expires soon</p>
        </div>
        
        <div style="background: #fffbeb; border-radius: 12px; padding: 30px; margin-bottom: 30px; border-left: 4px solid #f59e0b;">
          <h2 style="color: #1f2937; margin-bottom: 20px;">Hi ${userName || 'there'},</h2>
          <p style="color: #4b5563; line-height: 1.6; margin-bottom: 20px;">
            Your premium access to ProductFinder Pro will end soon due to the recent payment issue. 
            After expiration, you'll be moved to our free tier.
          </p>
          <p style="color: #4b5563; line-height: 1.6; margin-bottom: 20px;">
            <strong>What happens next:</strong>
          </p>
          <ul style="color: #4b5563; line-height: 1.6; margin: 15px 0;">
            <li>• Access limited to 3 products per search</li>
            <li>• Basic product information only</li>
            <li>• Limited category access</li>
            <li>• No premium AI analysis</li>
          </ul>
        </div>
        
        <div style="text-align: center; margin-bottom: 30px;">
          <a href="${Deno.env.get("SITE_URL") || "https://localhost:3000"}/profile" 
             style="background: #2563eb; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; display: inline-block; font-weight: 500; margin-bottom: 10px;">
            Reactivate Premium →
          </a>
          <p style="color: #6b7280; font-size: 14px;">
            Update your payment method to continue enjoying premium features
          </p>
        </div>
        
        <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; font-size: 14px;">
            We're here to help!<br>
            The ProductFinder Pro Team
          </p>
        </div>
      </div>
    `,
  }),
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header provided");
    }

    // Create Supabase client for authentication
    const { config } = await import('../_shared/config.ts');
    const supabaseClient = createClient(
      config.supabase.url,
      config.supabase.key,
      { auth: { persistSession: false } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);

    const emailData: EmailRequest = await req.json();
    
    if (!emailData.userEmail || !emailData.type) {
      throw new Error("Missing required fields: userEmail and type");
    }

    let template;
    switch (emailData.type) {
      case 'welcome':
        template = emailTemplates.welcome(emailData.userName || '');
        break;
      case 'subscription_active':
        template = emailTemplates.subscription_active(
          emailData.userName || '', 
          emailData.planType || 'Premium', 
          emailData.amount || 10.99
        );
        break;
      case 'subscription_cancelled':
        template = emailTemplates.subscription_cancelled(emailData.userName || '');
        break;
      case 'payment_failed':
        template = emailTemplates.payment_failed(
          emailData.userName || '', 
          emailData.graceEndDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()
        );
        break;
      case 'grace_period':
        template = emailTemplates.grace_period(emailData.userName || '');
        break;
      default:
        throw new Error(`Unknown email type: ${emailData.type}`);
    }

    const emailResponse = await resend.emails.send({
      from: "ProductFinder Pro <noreply@productfinderpro.com>",
      to: [emailData.userEmail],
      subject: template.subject,
      html: template.html,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailId: emailResponse.data?.id }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-subscription-emails function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);