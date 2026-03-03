import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 12000): Promise<Response> {
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
      return new Response(JSON.stringify({ type: "complete", scanned: 0, totalJobs: 0, message: "No companies" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("resume_text, location")
      .eq("user_id", user.id)
      .maybeSingle();

    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const token = authHeader.replace("Bearer ", "");
    const total = uniqueCompanies.length;

    console.log(`Scanning ${total} companies for user ${user.id}`);

    // Stream progress using newline-delimited JSON
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        // Send initial event with total count
        controller.enqueue(encoder.encode(JSON.stringify({ type: "start", total }) + "\n"));

        let completed = 0;
        let totalJobs = 0;
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
                25000
              );

              if (resp.ok) {
                const data = await resp.json();
                const found = data.totalFound || 0;
                console.log(`✓ ${company}: ${found} jobs`);
                return { company, jobsFound: found };
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

          for (const r of batchResults) {
            completed++;
            totalJobs += r.jobsFound;
            // Send progress event for each company
            controller.enqueue(encoder.encode(JSON.stringify({
              type: "progress",
              completed,
              total,
              company: r.company,
              jobsFound: r.jobsFound,
              error: r.error,
            }) + "\n"));
          }
        }

        // Send completion event
        controller.enqueue(encoder.encode(JSON.stringify({
          type: "complete",
          scanned: total,
          totalJobs,
        }) + "\n"));

        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (error) {
    console.error("scan-all-companies error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
