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
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all unique user-company pairs from applications
    const { data: applications, error: appErr } = await supabase
      .from("applications")
      .select("user_id, company");

    if (appErr) throw appErr;
    if (!applications || applications.length === 0) {
      console.log("No applications found, nothing to scan");
      return new Response(JSON.stringify({ success: true, scanned: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Also get watchlisted companies
    const { data: watchlist } = await supabase
      .from("company_watchlist")
      .select("user_id, company_name");

    // Build user -> companies map
    const userCompanies = new Map<string, Set<string>>();
    for (const app of applications) {
      if (!userCompanies.has(app.user_id)) userCompanies.set(app.user_id, new Set());
      userCompanies.get(app.user_id)!.add(app.company);
    }
    if (watchlist) {
      for (const w of watchlist) {
        if (!userCompanies.has(w.user_id)) userCompanies.set(w.user_id, new Set());
        userCompanies.get(w.user_id)!.add(w.company_name);
      }
    }

    // Deduplicate companies across all users
    const allCompanies = new Set<string>();
    for (const companies of userCompanies.values()) {
      for (const c of companies) allCompanies.add(c);
    }

    console.log(`Daily scan: ${allCompanies.size} unique companies across ${userCompanies.size} users`);

    // Crawl each company once (without user-specific scoring)
    let scanned = 0;
    let totalJobs = 0;
    for (const company of allCompanies) {
      try {
        // Use service role to call crawl-job-openings without user scoring
        // We'll score per-user afterwards
        const resp = await fetch(`${supabaseUrl}/functions/v1/crawl-job-openings`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseKey}`,
            "apikey": anonKey,
          },
          body: JSON.stringify({ companyName: company }),
        });

        if (resp.ok) {
          const data = await resp.json();
          totalJobs += data.totalFound || 0;
          scanned++;
          console.log(`✓ ${company}: ${data.totalFound || 0} jobs`);
        } else {
          console.error(`✗ ${company}: HTTP ${resp.status}`);
        }
      } catch (e) {
        console.error(`✗ ${company}: ${e}`);
      }
    }

    // Now score for each user
    let scoredUsers = 0;
    for (const [userId, companies] of userCompanies) {
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("resume_text, location")
        .eq("user_id", userId)
        .maybeSingle();

      if (!profile?.resume_text) continue;

      for (const company of companies) {
        try {
          await fetch(`${supabaseUrl}/functions/v1/crawl-job-openings`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${supabaseKey}`,
              "apikey": anonKey,
            },
            body: JSON.stringify({
              companyName: company,
              userResumeText: profile.resume_text,
              userId,
              userLocation: profile.location || null,
            }),
          });
        } catch (e) {
          console.error(`Score error for ${userId}/${company}: ${e}`);
        }
      }
      scoredUsers++;
    }

    console.log(`Daily scan complete: ${scanned} companies, ${totalJobs} jobs, ${scoredUsers} users scored`);

    return new Response(
      JSON.stringify({ success: true, scanned, totalJobs, scoredUsers }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("daily-scan-jobs error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
