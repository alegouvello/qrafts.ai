import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2025-08-27.basil",
});

const supabaseClient = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const sendEmail = async (to: string, subject: string, html: string) => {
  try {
    const response = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-subscription-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
      },
      body: JSON.stringify({ to, subject, html }),
    });
    
    if (!response.ok) {
      console.error("Failed to send email:", await response.text());
    }
  } catch (error) {
    console.error("Error sending email:", error);
  }
};

const getEmailTemplate = (type: string, customerName: string, trialEndDate?: string, subscriptionEnd?: string) => {
  const templates = {
    trial_started: {
      subject: "Welcome to Your Qraft Pro Free Trial! 🎉",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #4F46E5;">Welcome to Qraft Pro!</h1>
          <p>Hi ${customerName},</p>
          <p>Your 14-day free trial has started! You now have full access to all Qraft Pro features:</p>
          <ul>
            <li>✨ Unlimited job applications</li>
            <li>🤖 AI-powered role fit analysis</li>
            <li>📊 Advanced analytics and insights</li>
            <li>🎯 Priority support</li>
          </ul>
          <p>Your trial will end on <strong>${trialEndDate}</strong>. After that, you'll be charged $5/month unless you cancel.</p>
          <p>Get started now and streamline your job search!</p>
          <p style="margin-top: 30px;">
            <a href="https://your-app-url.com/dashboard" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Go to Dashboard</a>
          </p>
          <p style="color: #6B7280; font-size: 14px; margin-top: 30px;">
            Best regards,<br>
            The Qraft Team
          </p>
        </div>
      `,
    },
    trial_ending: {
      subject: "Your Qraft Pro Trial Ends in 3 Days",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #4F46E5;">Your Trial is Ending Soon</h1>
          <p>Hi ${customerName},</p>
          <p>Just a friendly reminder that your Qraft Pro free trial will end in <strong>3 days</strong> on ${trialEndDate}.</p>
          <p>After your trial ends, you'll be charged $5/month to continue enjoying:</p>
          <ul>
            <li>✨ Unlimited job applications</li>
            <li>🤖 AI-powered role fit analysis</li>
            <li>📊 Advanced analytics and insights</li>
            <li>🎯 Priority support</li>
          </ul>
          <p><strong>Want to continue?</strong> No action needed! Your subscription will automatically start.</p>
          <p><strong>Want to cancel?</strong> You can cancel anytime from your settings page before ${trialEndDate}.</p>
          <p style="margin-top: 30px;">
            <a href="https://your-app-url.com/settings" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Manage Subscription</a>
          </p>
          <p style="color: #6B7280; font-size: 14px; margin-top: 30px;">
            Best regards,<br>
            The Qraft Team
          </p>
        </div>
      `,
    },
    payment_succeeded: {
      subject: "Payment Successful - Qraft Pro Subscription",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #10B981;">Payment Successful! ✓</h1>
          <p>Hi ${customerName},</p>
          <p>Your payment of <strong>$5.00</strong> for Qraft Pro has been processed successfully.</p>
          <p>Your subscription is active until <strong>${subscriptionEnd}</strong>.</p>
          <p>Thank you for being a valued Qraft Pro member! Continue enjoying all premium features:</p>
          <ul>
            <li>✨ Unlimited job applications</li>
            <li>🤖 AI-powered role fit analysis</li>
            <li>📊 Advanced analytics and insights</li>
            <li>🎯 Priority support</li>
          </ul>
          <p style="margin-top: 30px;">
            <a href="https://your-app-url.com/settings" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Receipt</a>
          </p>
          <p style="color: #6B7280; font-size: 14px; margin-top: 30px;">
            Best regards,<br>
            The Qraft Team
          </p>
        </div>
      `,
    },
    payment_failed: {
      subject: "Payment Failed - Action Required",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #EF4444;">Payment Failed</h1>
          <p>Hi ${customerName},</p>
          <p>We were unable to process your payment of <strong>$5.00</strong> for your Qraft Pro subscription.</p>
          <p>This could be due to:</p>
          <ul>
            <li>Insufficient funds</li>
            <li>Expired card</li>
            <li>Incorrect billing information</li>
          </ul>
          <p><strong>What happens next?</strong></p>
          <p>Your subscription will remain active while we retry payment. Please update your payment method to avoid interruption of service.</p>
          <p style="margin-top: 30px;">
            <a href="https://your-app-url.com/settings" style="background-color: #EF4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Update Payment Method</a>
          </p>
          <p style="color: #6B7280; font-size: 14px; margin-top: 30px;">
            Need help? Contact our support team.<br>
            The Qraft Team
          </p>
        </div>
      `,
    },
    subscription_canceled: {
      subject: "Subscription Canceled - We're Sorry to See You Go",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #6B7280;">Subscription Canceled</h1>
          <p>Hi ${customerName},</p>
          <p>Your Qraft Pro subscription has been canceled.</p>
          <p>You'll continue to have access to Pro features until <strong>${subscriptionEnd}</strong>. After that, your account will revert to the free plan.</p>
          <p><strong>We'd love to hear from you:</strong></p>
          <p>What made you cancel? Your feedback helps us improve.</p>
          <p><strong>Changed your mind?</strong> You can reactivate your subscription anytime!</p>
          <p style="margin-top: 30px;">
            <a href="https://your-app-url.com/settings" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Reactivate Subscription</a>
          </p>
          <p style="color: #6B7280; font-size: 14px; margin-top: 30px;">
            We hope to see you again soon!<br>
            The Qraft Team
          </p>
        </div>
      `,
    },
  };

  return templates[type as keyof typeof templates];
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      return new Response("No signature", { status: 400 });
    }

    const body = await req.text();
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    if (!webhookSecret) {
      console.error("STRIPE_WEBHOOK_SECRET not set");
      return new Response("Webhook secret not configured", { status: 500 });
    }

    const event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    console.log("Webhook event received:", event.type);

    // Handle different event types
    switch (event.type) {
      case "customer.subscription.trial_will_end": {
        // Trial ending in 3 days
        const subscription = event.data.object;
        const customer = await stripe.customers.retrieve(subscription.customer as string);
        
        if ('email' in customer && customer.email) {
          const trialEnd = new Date(subscription.trial_end! * 1000);
          const template = getEmailTemplate("trial_ending", customer.name || "there", trialEnd.toLocaleDateString());
          await sendEmail(customer.email, template.subject, template.html);
        }
        break;
      }

      case "customer.subscription.created": {
        // New subscription (trial started)
        const subscription = event.data.object;
        if (subscription.status === "trialing") {
          const customer = await stripe.customers.retrieve(subscription.customer as string);
          
          if ('email' in customer && customer.email) {
            const trialEnd = new Date(subscription.trial_end! * 1000);
            const template = getEmailTemplate("trial_started", customer.name || "there", trialEnd.toLocaleDateString());
            await sendEmail(customer.email, template.subject, template.html);
          }
        }
        break;
      }

      case "invoice.payment_succeeded": {
        // Payment successful
        const invoice = event.data.object;
        if (invoice.billing_reason === "subscription_cycle") {
          const customer = await stripe.customers.retrieve(invoice.customer as string);
          
          if ('email' in customer && customer.email) {
            const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
            const periodEnd = new Date(subscription.current_period_end * 1000);
            const template = getEmailTemplate("payment_succeeded", customer.name || "there", undefined, periodEnd.toLocaleDateString());
            await sendEmail(customer.email, template.subject, template.html);
          }
        }
        break;
      }

      case "invoice.payment_failed": {
        // Payment failed
        const invoice = event.data.object;
        const customer = await stripe.customers.retrieve(invoice.customer as string);
        
        if ('email' in customer && customer.email) {
          const template = getEmailTemplate("payment_failed", customer.name || "there");
          await sendEmail(customer.email, template.subject, template.html);
        }
        break;
      }

      case "customer.subscription.deleted": {
        // Subscription canceled
        const subscription = event.data.object;
        const customer = await stripe.customers.retrieve(subscription.customer as string);
        
        if ('email' in customer && customer.email) {
          let periodEndStr = "your current billing period ends";
          if (subscription.current_period_end && typeof subscription.current_period_end === 'number') {
            const periodEnd = new Date(subscription.current_period_end * 1000);
            periodEndStr = periodEnd.toLocaleDateString();
          } else if (subscription.canceled_at && typeof subscription.canceled_at === 'number') {
            const canceledAt = new Date(subscription.canceled_at * 1000);
            periodEndStr = canceledAt.toLocaleDateString();
          }
          const template = getEmailTemplate("subscription_canceled", customer.name || "there", undefined, periodEndStr);
          await sendEmail(customer.email, template.subject, template.html);
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Webhook error:", errorMessage);
    
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
