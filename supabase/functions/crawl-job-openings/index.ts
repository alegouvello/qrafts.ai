import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { companyName, careersUrl, userResumeText, userId } = await req.json();

    if (!companyName) {
      return new Response(JSON.stringify({ error: "companyName is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!FIRECRAWL_API_KEY) {
      return new Response(JSON.stringify({ error: "Firecrawl not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Step 1: Determine careers URL
    let targetUrl = careersUrl;
    if (!targetUrl) {
      // Try to get from company_profiles
      const { data: profile } = await supabase
        .from("company_profiles")
        .select("careers_url, website_url, domain")
        .eq("company_name", companyName)
        .maybeSingle();

      if (profile?.careers_url) {
        targetUrl = profile.careers_url;
      } else if (profile?.website_url) {
        targetUrl = `${profile.website_url}/careers`;
      } else if (profile?.domain) {
        targetUrl = `https://${profile.domain}/careers`;
      } else {
        targetUrl = `https://${companyName.toLowerCase().replace(/\s+/g, "")}.com/careers`;
      }
    }

    console.log(`Crawling careers page for ${companyName}: ${targetUrl}`);

    // Step 2: Scrape careers page
    const scrapeResponse = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: targetUrl,
        formats: ["markdown", "links"],
        onlyMainContent: true,
      }),
    });

    const scrapeData = await scrapeResponse.json();
    if (!scrapeResponse.ok) {
      console.error("Firecrawl error:", scrapeData);
      return new Response(JSON.stringify({ error: "Failed to scrape careers page", details: scrapeData }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const markdown = scrapeData.data?.markdown || scrapeData.markdown || "";
    const links = scrapeData.data?.links || scrapeData.links || [];

    if (!markdown || markdown.length < 100) {
      return new Response(JSON.stringify({ error: "Insufficient content found on careers page", jobs: [] }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 3: Use AI to extract job listings
    const extractPrompt = `Extract all job openings from this careers page content. For each job, extract:
- title: the job title
- url: the application/detail URL if available (look in the links list too)
- location: where the job is located (remote, city, etc.)
- department: the team or department if mentioned

Return ONLY a JSON array of objects. If no jobs found, return an empty array [].

Careers page content:
${markdown.slice(0, 8000)}

Available links on the page:
${links.slice(0, 50).join("\n")}`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You extract job listings from careers page content. Always respond with valid JSON array only, no markdown." },
          { role: "user", content: extractPrompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errText);
      return new Response(JSON.stringify({ error: "AI extraction failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const rawContent = aiData.choices?.[0]?.message?.content || "[]";

    let jobs: any[] = [];
    try {
      const cleaned = rawContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      jobs = JSON.parse(cleaned);
      if (!Array.isArray(jobs)) jobs = [];
    } catch {
      console.error("Failed to parse jobs:", rawContent);
      jobs = [];
    }

    console.log(`Found ${jobs.length} jobs for ${companyName}`);

    // Step 4: Upsert jobs into job_openings
    const now = new Date().toISOString();
    for (const job of jobs) {
      if (!job.title) continue;
      const { error } = await supabase
        .from("job_openings")
        .upsert(
          {
            company_name: companyName,
            title: job.title,
            url: job.url || null,
            location: job.location || null,
            department: job.department || null,
            description_snippet: job.description?.slice(0, 500) || null,
            last_seen_at: now,
            is_active: true,
          },
          { onConflict: "company_name,title,url" }
        );
      if (error) console.error("Upsert error:", error);
    }

    // Mark jobs not seen in this crawl as inactive
    await supabase
      .from("job_openings")
      .update({ is_active: false })
      .eq("company_name", companyName)
      .lt("last_seen_at", now);

    // Step 5: If user resume provided, score jobs
    let scoredJobs: any[] = [];
    if (userResumeText && userId && jobs.length > 0) {
      const scorePrompt = `Given this resume and list of job openings, score each job on a 0-100 scale for how well the candidate matches. Consider skills, experience level, and role alignment.

Resume:
${userResumeText.slice(0, 3000)}

Jobs:
${JSON.stringify(jobs.map((j: any, i: number) => ({ index: i, title: j.title, location: j.location, department: j.department })))}

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
        try {
          const cleaned = scoreContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
          const scores = JSON.parse(cleaned);
          if (Array.isArray(scores)) {
            // Get job_opening IDs
            const { data: dbJobs } = await supabase
              .from("job_openings")
              .select("id, title, url")
              .eq("company_name", companyName)
              .eq("is_active", true);

            for (const score of scores) {
              const job = jobs[score.index];
              if (!job) continue;
              const dbJob = dbJobs?.find(
                (dj: any) => dj.title === job.title && (dj.url === job.url || (!dj.url && !job.url))
              );
              if (!dbJob) continue;

              await supabase.from("job_match_scores").upsert(
                {
                  user_id: userId,
                  job_opening_id: dbJob.id,
                  match_score: Math.min(100, Math.max(0, Math.round(score.score))),
                  match_reasons: score.reasons || [],
                },
                { onConflict: "user_id,job_opening_id" }
              );

              scoredJobs.push({
                ...job,
                id: dbJob.id,
                match_score: score.score,
                match_reasons: score.reasons || [],
              });
            }
          }
        } catch (e) {
          console.error("Failed to parse scores:", e);
        }
      }
    }

    // Return jobs with scores
    return new Response(
      JSON.stringify({
        success: true,
        jobs: scoredJobs.length > 0 ? scoredJobs : jobs,
        totalFound: jobs.length,
        careersUrl: targetUrl,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("crawl-job-openings error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
