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

    const body = await req.json().catch(() => ({}));
    let userId = body.userId as string | null;
    const maxJobs = Math.min(body.limit || 25, 25); // Max 25 per call to stay within timeout

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
      return new Response(JSON.stringify({ scored: 0, total: 0, message: "No resume found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get already-scored job IDs for this user
    const { data: scoredJobIds } = await supabase
      .from("job_match_scores")
      .select("job_opening_id")
      .eq("user_id", userId);

    const scoredSet = new Set((scoredJobIds || []).map(s => s.job_opening_id));

    // Fetch active jobs not yet scored, up to maxJobs
    const PAGE_SIZE = 1000;
    let unscoredJobs: any[] = [];
    let page = 0;
    while (unscoredJobs.length < maxJobs) {
      const { data: pageJobs } = await supabase
        .from("job_openings")
        .select("id, title, location, department, description_snippet, company_name")
        .eq("is_active", true)
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (!pageJobs || pageJobs.length === 0) break;

      for (const job of pageJobs) {
        if (!scoredSet.has(job.id) && unscoredJobs.length < maxJobs) {
          unscoredJobs.push(job);
        }
      }

      if (pageJobs.length < PAGE_SIZE) break;
      page++;
    }

    console.log(`Found ${unscoredJobs.length} unscored jobs for user ${userId}`);

    if (unscoredJobs.length === 0) {
      return new Response(JSON.stringify({ scored: 0, total: 0, message: "All jobs already scored" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Score all jobs in a single AI call (max 25)
    const locationContext = profile.location
      ? `\n\nIMPORTANT - LOCATION PREFERENCE: The candidate is based in "${profile.location}". Jobs in or near this location should receive a significant boost (+10-15 points). Remote jobs should also get a small boost (+5 points).`
      : "";

    const scorePrompt = `Given this resume and list of job openings, score each job on a 0-100 scale for how well the candidate matches. Consider:
1. Skills and experience alignment with the SPECIFIC role
2. Experience level match
3. Role responsibilities fit
${locationContext}

Resume:
${profile.resume_text!.slice(0, 3000)}

Jobs:
${JSON.stringify(unscoredJobs.map((j: any, idx: number) => ({
  index: idx,
  title: j.title,
  location: j.location,
  department: j.department,
  company: j.company_name,
  description: j.description_snippet?.slice(0, 100) || null,
})))}

Return a JSON array with objects: { index: number, score: number, reasons: string[] }
Only return the JSON array, no markdown.`;

    let totalScored = 0;
    const MAX_RETRIES = 2;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const scoreResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: "You score job-resume match quality. Respond with JSON array only. No markdown fences." },
              { role: "user", content: scorePrompt },
            ],
          }),
        });

        if (!scoreResponse.ok) {
          console.error(`AI API error, attempt ${attempt}: HTTP ${scoreResponse.status}`);
          if (attempt < MAX_RETRIES) continue;
          break;
        }

        const scoreData = await scoreResponse.json();
        const scoreContent = scoreData.choices?.[0]?.message?.content || "[]";
        const cleaned = scoreContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

        let scores: any[];
        try {
          scores = JSON.parse(cleaned);
        } catch {
          const lastBracket = cleaned.lastIndexOf("}");
          if (lastBracket > 0) {
            try {
              scores = JSON.parse(cleaned.slice(0, lastBracket + 1) + "]");
              console.log(`Salvaged partial JSON: ${scores.length} scores`);
            } catch {
              console.error(`JSON unsalvageable, attempt ${attempt}`);
              if (attempt < MAX_RETRIES) continue;
              scores = [];
            }
          } else {
            if (attempt < MAX_RETRIES) continue;
            scores = [];
          }
        }

        if (Array.isArray(scores)) {
          for (const score of scores) {
            const job = unscoredJobs[score.index];
            if (!job || typeof score.score !== "number") continue;

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
        break; // Success
      } catch (e) {
        console.error(`Scoring error, attempt ${attempt}:`, e);
        if (attempt >= MAX_RETRIES) break;
      }
    }

    console.log(`Scored ${totalScored}/${unscoredJobs.length} jobs for user ${userId}`);

    return new Response(
      JSON.stringify({ scored: totalScored, total: unscoredJobs.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("score-unscored-jobs error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
