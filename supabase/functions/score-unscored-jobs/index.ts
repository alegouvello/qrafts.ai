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
    const maxJobs = Math.min(body.limit || 50, 50); // Max 50 per call

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

    // Build set of companies the user cares about (applied + watchlist)
    const userCompanies = new Set<string>();
    let appPage = 0;
    while (true) {
      const { data: apps } = await supabase
        .from("applications")
        .select("company")
        .eq("user_id", userId)
        .range(appPage * 1000, (appPage + 1) * 1000 - 1);
      if (!apps || apps.length === 0) break;
      for (const a of apps) userCompanies.add(a.company);
      if (apps.length < 1000) break;
      appPage++;
    }
    let wlPage = 0;
    while (true) {
      const { data: wl } = await supabase
        .from("company_watchlist")
        .select("company_name")
        .eq("user_id", userId)
        .range(wlPage * 1000, (wlPage + 1) * 1000 - 1);
      if (!wl || wl.length === 0) break;
      for (const w of wl) userCompanies.add(w.company_name);
      if (wl.length < 1000) break;
      wlPage++;
    }

    if (userCompanies.size === 0) {
      return new Response(JSON.stringify({ scored: 0, total: 0, message: "No companies to score" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.log(`User has ${userCompanies.size} companies to score`);

    // Get ALL already-scored job IDs for this user (paginate past 1000-row limit)
    const scoredSet = new Set<string>();
    let scoredPage = 0;
    const SCORED_PAGE_SIZE = 1000;
    while (true) {
      const { data: scoredBatch } = await supabase
        .from("job_match_scores")
        .select("job_opening_id")
        .eq("user_id", userId)
        .range(scoredPage * SCORED_PAGE_SIZE, (scoredPage + 1) * SCORED_PAGE_SIZE - 1);
      
      if (!scoredBatch || scoredBatch.length === 0) break;
      for (const s of scoredBatch) scoredSet.add(s.job_opening_id);
      if (scoredBatch.length < SCORED_PAGE_SIZE) break;
      scoredPage++;
    }
    console.log(`User has ${scoredSet.size} already-scored jobs`);

    // Fetch active jobs from user's companies only, not yet scored, up to maxJobs
    const companyList = Array.from(userCompanies);
    const PAGE_SIZE = 1000;
    let unscoredJobs: any[] = [];
    // Query in company batches to use .in() filter (max ~100 per .in())
    const COMPANY_BATCH = 50;
    for (let ci = 0; ci < companyList.length && unscoredJobs.length < maxJobs; ci += COMPANY_BATCH) {
      const companyBatch = companyList.slice(ci, ci + COMPANY_BATCH);
      let page = 0;
      while (unscoredJobs.length < maxJobs) {
        const { data: pageJobs } = await supabase
          .from("job_openings")
          .select("id, title, location, department, description_snippet, company_name")
          .eq("is_active", true)
          .in("company_name", companyBatch)
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
    }

    console.log(`Found ${unscoredJobs.length} unscored jobs for user ${userId}`);

    if (unscoredJobs.length === 0) {
      return new Response(JSON.stringify({ scored: 0, total: 0, message: "All jobs already scored" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Score all jobs in a single AI call (max 50)
    const locationContext = profile.location
      ? `\n\nLOCATION PREFERENCE: The candidate is based in "${profile.location}". Jobs in or near this location get +5 points. Remote jobs get +3 points. Do NOT give location bonus otherwise.`
      : "";

    const scorePrompt = `Score each job 0-100 for how well the candidate's resume matches. Be STRICT and realistic:

CALIBRATION GUIDE:
- 90-100: Near-perfect match — same role type, matching seniority, directly relevant skills and industry
- 75-89: Strong match — closely related role, most key skills present, reasonable seniority fit
- 55-74: Moderate match — some transferable skills, but different function, seniority gap, or missing key requirements
- 30-54: Weak match — different field/function, significant skill gaps, wrong seniority level
- 0-29: Poor match — completely unrelated role

KEY RULES:
- A software engineer resume should NOT score 90+ on Sales/Account Executive roles
- Seniority mismatches (junior resume vs senior role, or vice versa) should cap at ~70
- Different job functions (engineering vs sales, marketing vs finance) should rarely exceed 50
- Only give 90+ when the candidate could realistically be shortlisted for the role
${locationContext}

Resume:
${profile.resume_text!.slice(0, 4000)}

Jobs:
${JSON.stringify(unscoredJobs.map((j: any, idx: number) => ({
  index: idx,
  title: j.title,
  location: j.location,
  department: j.department,
  company: j.company_name,
  description: j.description_snippet?.slice(0, 300) || null,
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
              { role: "system", content: "You are a strict job-resume match scorer. Be realistic — most cross-functional matches should score below 50. Respond with JSON array only. No markdown fences." },
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
