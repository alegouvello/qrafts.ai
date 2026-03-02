import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Helper: fetch with timeout
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 25000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

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

    const uniqueCompanies: string[] = [];
    if (applications) {
      for (const a of applications) {
        if (!uniqueCompanies.includes(a.company)) uniqueCompanies.push(a.company);
      }
    }

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

    if (uniqueCompanies.length === 0) {
      return new Response(JSON.stringify({ success: true, scanned: 0, message: "No companies to scan" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user resume and location for scoring
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("resume_text, location")
      .eq("user_id", user.id)
      .maybeSingle();

    console.log(`Scanning ${uniqueCompanies.length} companies for user ${user.id}`);

    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const token = authHeader.replace("Bearer ", "");
    const results: { company: string; jobsFound: number; error?: string }[] = [];

    // Process in parallel batches of 5 with per-request timeout
    const BATCH_SIZE = 5;
    for (let i = 0; i < uniqueCompanies.length; i += BATCH_SIZE) {
      const batch = uniqueCompanies.slice(i, i + BATCH_SIZE);
      const batchPromises = batch.map(async (company) => {
        try {
          const resp = await fetchWithTimeout(
            `${supabaseUrl}/functions/v1/crawl-job-openings`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`,
                "apikey": anonKey,
              },
              body: JSON.stringify({
                companyName: company,
                userResumeText: profile?.resume_text || null,
                userId: user.id,
                userLocation: profile?.location || null,
              }),
            },
            25000 // 25s timeout per company
          );

          if (resp.ok) {
            const data = await resp.json();
            console.log(`✓ ${company}: ${data.totalFound || 0} jobs`);
            return { company, jobsFound: data.totalFound || 0 };
          } else {
            console.error(`✗ ${company}: HTTP ${resp.status}`);
            return { company, jobsFound: 0, error: `HTTP ${resp.status}` };
          }
        } catch (e) {
          const msg = e instanceof Error ? (e.name === "AbortError" ? "timeout" : e.message) : "Unknown";
          console.error(`✗ ${company}: ${msg}`);
          return { company, jobsFound: 0, error: msg };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    const totalJobs = results.reduce((sum, r) => sum + r.jobsFound, 0);
    const successCount = results.filter(r => !r.error).length;

    return new Response(
      JSON.stringify({
        success: true,
        scanned: uniqueCompanies.length,
        successful: successCount,
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
