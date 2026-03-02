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

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get all unique companies the user has applied to
    const { data: applications } = await supabase
      .from("applications")
      .select("company")
      .eq("user_id", user.id);

    if (!applications || applications.length === 0) {
      return new Response(JSON.stringify({ success: true, scanned: 0, message: "No applications found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const uniqueCompanies = [...new Set(applications.map(a => a.company))];

    // Also include watchlisted companies
    const { data: watchlist } = await supabase
      .from("company_watchlist")
      .select("company_name")
      .eq("user_id", user.id);

    if (watchlist) {
      for (const w of watchlist) {
        if (!uniqueCompanies.includes(w.company_name)) {
          uniqueCompanies.push(w.company_name);
        }
      }
    }

    // Get user resume and location for scoring
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("resume_text, location")
      .eq("user_id", user.id)
      .maybeSingle();

    console.log(`Scanning ${uniqueCompanies.length} companies for user ${user.id}`);

    // Scan companies sequentially to avoid rate limits (max 10 at a time)
    const results: { company: string; jobsFound: number; error?: string }[] = [];
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    for (const company of uniqueCompanies) {
      try {
        const resp = await fetch(`${supabaseUrl}/functions/v1/crawl-job-openings`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${authHeader.replace("Bearer ", "")}`,
            "apikey": anonKey,
          },
          body: JSON.stringify({
            companyName: company,
            userResumeText: profile?.resume_text || null,
            userId: user.id,
            userLocation: profile?.location || null,
          }),
        });

        if (resp.ok) {
          const data = await resp.json();
          results.push({ company, jobsFound: data.totalFound || 0 });
          console.log(`✓ ${company}: ${data.totalFound || 0} jobs`);
        } else {
          results.push({ company, jobsFound: 0, error: `HTTP ${resp.status}` });
          console.error(`✗ ${company}: HTTP ${resp.status}`);
        }
      } catch (e) {
        results.push({ company, jobsFound: 0, error: e instanceof Error ? e.message : "Unknown" });
        console.error(`✗ ${company}: ${e}`);
      }
    }

    const totalJobs = results.reduce((sum, r) => sum + r.jobsFound, 0);

    return new Response(
      JSON.stringify({
        success: true,
        scanned: uniqueCompanies.length,
        totalJobs,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("scan-all-companies error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
