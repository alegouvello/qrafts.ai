import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { companyName, careersUrl, userResumeText, userId, userLocation } = await req.json();

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

    console.log(`Crawling careers for ${companyName}: ${targetUrl}`);

    // ─── Strategy 1: Firecrawl search for job listings ───
    console.log("Strategy 1: Searching for job listings via Firecrawl search...");
    const searchResponse = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: `${companyName} individual job openings hiring positions apply now`,
        limit: 5,
        scrapeOptions: { formats: ["markdown"] },
      }),
    });

    let allMarkdown = "";
    let allLinks: string[] = [];

    if (searchResponse.ok) {
      const searchData = await searchResponse.json();
      const results = searchData.data || searchData.results || [];
      for (const r of results) {
        if (r.markdown) allMarkdown += "\n\n---\n" + r.markdown;
        if (r.url) allLinks.push(r.url);
      }
      console.log(`Search returned ${results.length} results, ${allMarkdown.length} chars`);
    }

    // ─── Strategy 2: Scrape careers page directly ───
    console.log("Strategy 2: Scraping careers page directly...");
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
        waitFor: 3000,
      }),
    });

    if (scrapeResponse.ok) {
      const scrapeData = await scrapeResponse.json();
      const scrapedMarkdown = scrapeData.data?.markdown || scrapeData.markdown || "";
      const scrapedLinks = scrapeData.data?.links || scrapeData.links || [];
      allMarkdown += "\n\n---\nDIRECT CAREERS PAGE:\n" + scrapedMarkdown;
      allLinks = [...allLinks, ...scrapedLinks];
      console.log(`Scrape returned ${scrapedMarkdown.length} chars, ${scrapedLinks.length} links`);
    }

    // ─── Strategy 2.5: Try known job board platforms ───
    const companySlug = companyName.toLowerCase().replace(/\s+/g, "");
    const jobBoardUrls = [
      `https://boards.greenhouse.io/${companySlug}`,
      `https://jobs.lever.co/${companySlug}`,
      `https://jobs.ashbyhq.com/${companySlug}`,
      `https://${companySlug}.jobs.personio.com`,
    ];

    for (const boardUrl of jobBoardUrls) {
      try {
        console.log(`Strategy 2.5: Trying job board: ${boardUrl}`);
        const boardResp = await fetch("https://api.firecrawl.dev/v1/scrape", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url: boardUrl,
            formats: ["markdown", "links"],
            onlyMainContent: true,
            waitFor: 2000,
          }),
        });
        if (boardResp.ok) {
          const boardData = await boardResp.json();
          const boardMd = boardData.data?.markdown || boardData.markdown || "";
          const boardLinks = boardData.data?.links || boardData.links || [];
          if (boardMd.length > 200) {
            allMarkdown += `\n\n---\nJOB BOARD (${boardUrl}):\n${boardMd}`;
            allLinks = [...allLinks, ...boardLinks];
            console.log(`Job board ${boardUrl} returned ${boardMd.length} chars, ${boardLinks.length} links`);
            break; // Found a working job board, no need to try others
          }
        }
      } catch (e) {
        // Job board URL didn't work, try next
      }
    }

    // ─── Strategy 3: Map careers URLs ───
    console.log("Strategy 3: Mapping careers URLs...");
    const mapResponse = await fetch("https://api.firecrawl.dev/v1/map", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: targetUrl,
        search: "jobs positions openings careers",
        limit: 100,
        includeSubdomains: true,
      }),
    });

    let jobDetailLinks: string[] = [];
    if (mapResponse.ok) {
      const mapData = await mapResponse.json();
      const mappedLinks = mapData.links || mapData.data?.links || [];
      const jobLinks = mappedLinks.filter((l: string) =>
        /job|position|opening|career|role|apply/i.test(l) && !/blog|news|about|privacy|terms/i.test(l)
      );
      allLinks = [...allLinks, ...jobLinks];
      // Identify individual job detail pages (URLs with IDs/slugs at the end)
      jobDetailLinks = jobLinks.filter((l: string) =>
        /\/[a-f0-9-]{8,}|\/\d{4,}|\/[a-z]+-[a-z]+-[a-z]+/i.test(l)
      );
      console.log(`Map returned ${mappedLinks.length} total, ${jobLinks.length} job-like, ${jobDetailLinks.length} detail pages`);
    }

    // ─── Strategy 4: Deep crawl individual job pages for richer data ───
    // Scrape up to 15 individual job detail pages to get titles, descriptions, locations
    const detailPages = [...new Set(jobDetailLinks)].slice(0, 15);
    if (detailPages.length > 0) {
      console.log(`Strategy 4: Deep-scraping ${detailPages.length} individual job pages...`);
      const batchPromises = detailPages.map(async (url) => {
        try {
          const resp = await fetch("https://api.firecrawl.dev/v1/scrape", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              url,
              formats: ["markdown"],
              onlyMainContent: true,
              waitFor: 2000,
            }),
          });
          if (resp.ok) {
            const d = await resp.json();
            const md = d.data?.markdown || d.markdown || "";
            return { url, markdown: md.slice(0, 3000) }; // cap per page
          }
        } catch (e) {
          console.error(`Failed to scrape ${url}:`, e);
        }
        return null;
      });

      const detailResults = (await Promise.all(batchPromises)).filter(Boolean);
      for (const r of detailResults) {
        if (r) {
          allMarkdown += `\n\n---\nINDIVIDUAL JOB PAGE (${r.url}):\n${r.markdown}`;
        }
      }
      console.log(`Deep-scraped ${detailResults.length} job detail pages`);
    }

    // Deduplicate links
    allLinks = [...new Set(allLinks)];

    if (!allMarkdown || allMarkdown.length < 50) {
      return new Response(JSON.stringify({ error: "Insufficient content found", jobs: [] }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Step 3: AI extraction - individual roles, not departments ───
    const extractPrompt = `Extract ALL individual job openings/positions from this content about ${companyName}.

RULES:
1. Extract SPECIFIC job titles that a real person would apply to. Good examples: "Senior Software Engineer", "Account Executive, Mid-Market", "Financial Partnerships Manager, International", "Staff Product Designer".
2. SKIP these — they are NOT job titles:
   - Career program categories: "Experienced Professionals", "Students", "Young Professionals"
   - Standalone department/team names used as section headers: "Sales", "Engineering", "Business Development"
   - Generic one-word labels: "Consulting", "Corporate Functions"
3. However, if a title looks like a real role even if short (e.g. "Data Analyst", "Product Manager", "Solutions Architect"), DO include it.
4. If content shows departments with individual roles underneath, extract each individual role with its department.
5. For each job, extract:
   - title: the specific job title
   - url: the application/detail URL if available (match from links list)
   - location: city, state, country, or "Remote" if mentioned
   - department: the team or department if known
   - description: a 1-2 sentence summary if available from the content

Content from multiple sources:
${allMarkdown.slice(0, 40000)}

Available URLs:
${allLinks.slice(0, 150).join("\n")}

Return ONLY a valid JSON array. If genuinely no specific job titles found, return [].`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You extract individual job listings from careers page content. Always respond with valid JSON array only, no markdown fences. Extract specific role titles, NOT department/team names." },
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
      console.error("Failed to parse jobs:", rawContent.slice(0, 500));
      jobs = [];
    }

    console.log(`Found ${jobs.length} individual jobs for ${companyName}`);

    // ─── Step 4: Upsert jobs into job_openings ───
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
          { onConflict: "company_name,title" }
        );
      if (error) console.error("Upsert error:", error);
    }

    // Mark old jobs as inactive
    await supabase
      .from("job_openings")
      .update({ is_active: false })
      .eq("company_name", companyName)
      .lt("last_seen_at", now);

    // ─── Step 5: Score jobs with resume AND location preference ───
    let scoredJobs: any[] = [];
    if (userResumeText && userId && jobs.length > 0) {
      const locationContext = userLocation
        ? `\n\nIMPORTANT - LOCATION PREFERENCE: The candidate is based in "${userLocation}". Jobs in or near this location should receive a significant boost (+10-15 points). Remote jobs should also get a small boost (+5 points). Jobs far from this location should not be penalized but should not get the location bonus.`
        : "";

      const scorePrompt = `Given this resume and list of job openings, score each job on a 0-100 scale for how well the candidate matches. Consider:
1. Skills and experience alignment with the SPECIFIC role (not just department)
2. Experience level match
3. Role responsibilities fit
${locationContext}

Resume:
${userResumeText.slice(0, 3000)}

Jobs:
${JSON.stringify(jobs.map((j: any, i: number) => ({
  index: i,
  title: j.title,
  location: j.location,
  department: j.department,
  description: j.description || null,
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
            { role: "system", content: "You score job-resume match quality considering role specifics and location preferences. Respond with JSON array only." },
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
            const { data: dbJobs } = await supabase
              .from("job_openings")
              .select("id, title, url")
              .eq("company_name", companyName)
              .eq("is_active", true);

            for (const score of scores) {
              const job = jobs[score.index];
              if (!job) continue;
              const dbJob = dbJobs?.find((dj: any) => dj.title === job.title);
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
