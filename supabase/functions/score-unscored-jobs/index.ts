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
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Accept userId from body (for daily-scan service role calls) or from auth
    const body = await req.json().catch(() => ({}));
    let userId = body.userId as string | null;

    if (!userId) {
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
      userId = user.id;
    }

    // Get user's resume
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("resume_text, location")
      .eq("user_id", userId)
      .maybeSingle();

    if (!profile?.resume_text) {
      return new Response(JSON.stringify({ scored: 0, message: "No resume found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find all active job openings that DON'T have a score for this user
    // We do this with a left join approach: get all active jobs, then subtract scored ones
    const { data: scoredJobIds } = await supabase
      .from("job_match_scores")
      .select("job_opening_id")
      .eq("user_id", userId);

    const scoredSet = new Set((scoredJobIds || []).map(s => s.job_opening_id));

    // Fetch all active jobs in batches
    const PAGE_SIZE = 1000;
    let allUnscoredJobs: any[] = [];
    let page = 0;
    while (true) {
      const { data: pageJobs } = await supabase
        .from("job_openings")
        .select("id, title, location, department, description_snippet, company_name")
        .eq("is_active", true)
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (!pageJobs || pageJobs.length === 0) break;

      for (const job of pageJobs) {
        if (!scoredSet.has(job.id)) {
          allUnscoredJobs.push(job);
        }
      }

      if (pageJobs.length < PAGE_SIZE) break;
      page++;
    }

    console.log(`Found ${allUnscoredJobs.length} unscored jobs for user ${userId}`);

    if (allUnscoredJobs.length === 0) {
      return new Response(JSON.stringify({ scored: 0, message: "All jobs already scored" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Score in batches of 50 jobs at a time (to fit in AI context)
    const SCORE_BATCH = 50;
    let totalScored = 0;
    const locationContext = profile.location
      ? `\n\nIMPORTANT - LOCATION PREFERENCE: The candidate is based in "${profile.location}". Jobs in or near this location should receive a significant boost (+10-15 points). Remote jobs should also get a small boost (+5 points).`
      : "";

    // Stream progress
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        controller.enqueue(encoder.encode(JSON.stringify({
          type: "start",
          total: allUnscoredJobs.length,
        }) + "\n"));

        for (let i = 0; i < allUnscoredJobs.length; i += SCORE_BATCH) {
          const batch = allUnscoredJobs.slice(i, i + SCORE_BATCH);

          try {
            const scorePrompt = `Given this resume and list of job openings, score each job on a 0-100 scale for how well the candidate matches. Consider:
1. Skills and experience alignment with the SPECIFIC role
2. Experience level match
3. Role responsibilities fit
${locationContext}

Resume:
${profile.resume_text!.slice(0, 3000)}

Jobs:
${JSON.stringify(batch.map((j: any, idx: number) => ({
  index: idx,
  title: j.title,
  location: j.location,
  department: j.department,
  company: j.company_name,
  description: j.description_snippet?.slice(0, 100) || null,
})))}

Return a JSON array with objects: { index: number, score: number, reasons: string[] }
Only return the JSON array, no markdown.`;

            const scoreResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${LOVABLE_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "google/gemini-2.5-flash",
                messages: [
                  { role: "system", content: "You score job-resume match quality. Respond with JSON array only." },
                  { role: "user", content: scorePrompt },
                ],
              }),
            });

            if (scoreResponse.ok) {
              const scoreData = await scoreResponse.json();
              const scoreContent = scoreData.choices?.[0]?.message?.content || "[]";
              const cleaned = scoreContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
              const scores = JSON.parse(cleaned);

              if (Array.isArray(scores)) {
                for (const score of scores) {
                  const job = batch[score.index];
                  if (!job) continue;

                  await supabase.from("job_match_scores").upsert(
                    {
                      user_id: userId,
                      job_opening_id: job.id,
                      match_score: Math.min(100, Math.max(0, Math.round(score.score))),
                      match_reasons: score.reasons || [],
                    },
                    { onConflict: "user_id,job_opening_id" }
                  );
                  totalScored++;
                }
              }
            }
          } catch (e) {
            console.error(`Scoring batch error at offset ${i}:`, e);
          }

          controller.enqueue(encoder.encode(JSON.stringify({
            type: "progress",
            scored: totalScored,
            processed: Math.min(i + SCORE_BATCH, allUnscoredJobs.length),
            total: allUnscoredJobs.length,
          }) + "\n"));
        }

        controller.enqueue(encoder.encode(JSON.stringify({
          type: "complete",
          scored: totalScored,
          total: allUnscoredJobs.length,
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
    console.error("score-unscored-jobs error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
