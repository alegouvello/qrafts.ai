import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!RESEND_API_KEY || !FIRECRAWL_API_KEY || !LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "Missing required secrets" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 1: Get all users with watchlists
    const { data: watchlistEntries, error: watchError } = await supabase
      .from("company_watchlist")
      .select("user_id, company_name");

    if (watchError || !watchlistEntries?.length) {
      console.log("No watchlist entries found");
      return new Response(JSON.stringify({ success: true, processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Group by company to avoid duplicate crawls
    const companiesSet = new Set(watchlistEntries.map((w) => w.company_name));
    const usersByCompany: Record<string, string[]> = {};
    for (const entry of watchlistEntries) {
      if (!usersByCompany[entry.company_name]) usersByCompany[entry.company_name] = [];
      usersByCompany[entry.company_name].push(entry.user_id);
    }

    let alertsSent = 0;

    for (const company of companiesSet) {
      // Crawl the company careers page (invoke our own function internally)
      const crawlResponse = await fetch(`${supabaseUrl}/functions/v1/crawl-job-openings`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${supabaseKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ companyName: company }),
      });

      if (!crawlResponse.ok) {
        console.error(`Failed to crawl ${company}`);
        continue;
      }

      // For each watching user, score and alert
      const userIds = usersByCompany[company] || [];
      for (const userId of userIds) {
        // Get user's resume
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("resume_text, email, full_name")
          .eq("user_id", userId)
          .maybeSingle();

        if (!profile?.resume_text || !profile?.email) continue;

        // Score jobs for this user
        const scoreResponse = await fetch(`${supabaseUrl}/functions/v1/crawl-job-openings`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${supabaseKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            companyName: company,
            userResumeText: profile.resume_text,
            userId,
          }),
        });

        if (!scoreResponse.ok) continue;

        // Find new high-match jobs that haven't been alerted
        const { data: highMatches } = await supabase
          .from("job_match_scores")
          .select("*, job_openings(*)")
          .eq("user_id", userId)
          .gte("match_score", 80)
          .eq("alerted", false);

        if (!highMatches?.length) continue;

        // Send email
        const jobList = highMatches
          .map(
            (m: any) =>
              `• ${m.job_openings.title} (${m.match_score}% match) - ${m.job_openings.location || "Location TBD"}${m.job_openings.url ? `\n  Apply: ${m.job_openings.url}` : ""}`
          )
          .join("\n\n");

        const emailHtml = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1a1a1a;">🎯 New Job Matches at ${company}</h2>
            <p style="color: #666;">Hi ${profile.full_name || "there"},</p>
            <p style="color: #666;">We found <strong>${highMatches.length} new high-match job${highMatches.length > 1 ? "s" : ""}</strong> at ${company} that align with your profile:</p>
            ${highMatches
              .map(
                (m: any) => `
              <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 12px 0;">
                <h3 style="margin: 0; color: #1a1a1a;">${m.job_openings.title}</h3>
                <p style="margin: 4px 0; color: #666; font-size: 14px;">${m.job_openings.location || "Location TBD"} ${m.job_openings.department ? `· ${m.job_openings.department}` : ""}</p>
                <div style="display: inline-block; background: ${m.match_score >= 90 ? "#22c55e" : "#3b82f6"}; color: white; padding: 4px 12px; border-radius: 9999px; font-size: 13px; font-weight: 600; margin-top: 8px;">
                  ${m.match_score}% Match
                </div>
                ${m.match_reasons?.length ? `<p style="color: #888; font-size: 13px; margin-top: 8px;">${m.match_reasons.join(" · ")}</p>` : ""}
                ${m.job_openings.url ? `<a href="${m.job_openings.url}" style="display: inline-block; margin-top: 8px; color: #3b82f6; text-decoration: none; font-size: 14px;">View & Apply →</a>` : ""}
              </div>`
              )
              .join("")}
            <p style="color: #999; font-size: 13px; margin-top: 24px;">You're receiving this because you're watching ${company} on Qrafts. Manage your watchlist in the company profile page.</p>
          </div>
        `;

        const emailResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Qrafts <notifications@qrafts.lovable.app>",
            to: [profile.email],
            subject: `🎯 ${highMatches.length} new job match${highMatches.length > 1 ? "es" : ""} at ${company}`,
            html: emailHtml,
          }),
        });

        if (emailResponse.ok) {
          // Mark as alerted
          for (const match of highMatches) {
            await supabase
              .from("job_match_scores")
              .update({ alerted: true })
              .eq("id", match.id);
          }
          alertsSent += highMatches.length;
          console.log(`Sent ${highMatches.length} alerts to ${profile.email} for ${company}`);
        } else {
          console.error("Email send failed:", await emailResponse.text());
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, alertsSent, companiesProcessed: companiesSet.size }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("send-job-alerts error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
