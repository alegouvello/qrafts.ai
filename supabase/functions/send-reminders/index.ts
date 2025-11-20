import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TimelineEvent {
  id: string;
  event_type: string;
  title: string;
  description: string | null;
  event_date: string;
  application_id: string;
}

interface Application {
  company: string;
  position: string;
  user_id: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting reminder check...");

    // Initialize Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Calculate time window: next 24-48 hours
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const dayAfter = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    console.log("Checking events between:", tomorrow.toISOString(), "and", dayAfter.toISOString());

    // Query upcoming interviews and deadlines that haven't been reminded
    const { data: events, error: eventsError } = await supabaseAdmin
      .from("timeline_events")
      .select("id, event_type, title, description, event_date, application_id")
      .in("event_type", ["interview", "deadline"])
      .eq("reminder_sent", false)
      .gte("event_date", tomorrow.toISOString())
      .lte("event_date", dayAfter.toISOString());

    if (eventsError) {
      console.error("Error fetching events:", eventsError);
      throw eventsError;
    }

    console.log(`Found ${events?.length || 0} events to remind`);

    if (!events || events.length === 0) {
      return new Response(
        JSON.stringify({ message: "No reminders to send", count: 0 }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let sentCount = 0;
    const errors: string[] = [];

    // Process each event
    for (const event of events as TimelineEvent[]) {
      try {
        // Get application and user details
        const { data: application, error: appError } = await supabaseAdmin
          .from("applications")
          .select("company, position, user_id")
          .eq("id", event.application_id)
          .single();

        if (appError || !application) {
          console.error(`Error fetching application for event ${event.id}:`, appError);
          errors.push(`Failed to fetch application for event ${event.id}`);
          continue;
        }

        // Get user email
        const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(
          (application as Application).user_id
        );

        if (userError || !userData?.user?.email) {
          console.error(`Error fetching user for event ${event.id}:`, userError);
          errors.push(`Failed to fetch user for event ${event.id}`);
          continue;
        }

        const userEmail = userData.user.email;
        const eventDate = new Date(event.event_date);
        const formattedDate = eventDate.toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        });
        const formattedTime = eventDate.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        });

        // Send reminder email
        const emailSubject =
          event.event_type === "interview"
            ? `Reminder: Interview Tomorrow - ${(application as Application).company}`
            : `Reminder: Deadline Tomorrow - ${(application as Application).company}`;

        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Upcoming ${event.event_type === "interview" ? "Interview" : "Deadline"} Reminder</h2>
            <p>Hi there!</p>
            <p>This is a friendly reminder about your upcoming ${event.event_type}:</p>
            
            <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #2563eb;">${event.title}</h3>
              <p><strong>Company:</strong> ${(application as Application).company}</p>
              <p><strong>Position:</strong> ${(application as Application).position}</p>
              <p><strong>Date:</strong> ${formattedDate}</p>
              <p><strong>Time:</strong> ${formattedTime}</p>
              ${event.description ? `<p><strong>Details:</strong> ${event.description}</p>` : ""}
            </div>
            
            <p>Good luck! 🍀</p>
            <p style="color: #666; font-size: 12px; margin-top: 30px;">
              This is an automated reminder from your Job Application Tracker.
            </p>
          </div>
        `;

        const { error: sendError } = await resend.emails.send({
          from: "Job Application Tracker <onboarding@resend.dev>",
          to: [userEmail],
          subject: emailSubject,
          html: emailHtml,
        });

        if (sendError) {
          console.error(`Error sending email for event ${event.id}:`, sendError);
          errors.push(`Failed to send email for event ${event.id}`);
          continue;
        }

        // Mark event as reminded
        const { error: updateError } = await supabaseAdmin
          .from("timeline_events")
          .update({ reminder_sent: true })
          .eq("id", event.id);

        if (updateError) {
          console.error(`Error updating event ${event.id}:`, updateError);
          errors.push(`Failed to mark event ${event.id} as sent`);
          continue;
        }

        console.log(`Successfully sent reminder for event ${event.id}`);
        sentCount++;
      } catch (error) {
        console.error(`Error processing event ${event.id}:`, error);
        errors.push(`Error processing event ${event.id}: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }

    return new Response(
      JSON.stringify({
        message: "Reminder processing complete",
        sent: sentCount,
        total: events.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in send-reminders function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);
