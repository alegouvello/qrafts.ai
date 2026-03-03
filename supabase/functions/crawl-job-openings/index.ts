import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Known company slug mappings for job board APIs ───
// Maps company names (lowercased) to their actual slugs on various platforms
const KNOWN_COMPANY_SLUGS: Record<string, { greenhouse?: string[]; lever?: string[]; ashby?: string[]; smartrecruiters?: string[]; workday?: { subdomain: string; instance: string; path: string }[] }> = {
  "netflix": { greenhouse: ["netflix"], lever: ["netflix"] },
  "stripe": { greenhouse: ["stripe"], lever: ["stripe"] },
  "airbnb": { greenhouse: ["airbnb"], lever: ["airbnb"] },
  "twitch": { greenhouse: ["twitch"], lever: ["twitch"] },
  "coinbase": { greenhouse: ["coinbase"], lever: ["coinbase"] },
  "figma": { greenhouse: ["figma"], lever: ["figma"] },
  "notion": { greenhouse: ["notion"], lever: ["notion"] },
  "discord": { greenhouse: ["discord"], lever: ["discord"] },
  "datadog": { greenhouse: ["datadog"], lever: ["datadog"] },
  "square": { greenhouse: ["squareup", "square"], lever: ["square"] },
  "block": { greenhouse: ["squareup", "block"], lever: ["block"] },
  "plaid": { greenhouse: ["plaid"], lever: ["plaid"] },
  "dropbox": { greenhouse: ["dropbox"], lever: ["dropbox"] },
  "instacart": { greenhouse: ["instacart"], lever: ["instacart"] },
  "doordash": { greenhouse: ["doordash"], lever: ["doordash"] },
  "lyft": { greenhouse: ["lyft"], lever: ["lyft"] },
  "uber": { greenhouse: ["uber"], lever: ["uber"] },
  "snap": { greenhouse: ["snap"], lever: ["snap"] },
  "snapchat": { greenhouse: ["snap"], lever: ["snap"] },
  "pinterest": { greenhouse: ["pinterest"], lever: ["pinterest"] },
  "reddit": { greenhouse: ["reddit"], lever: ["reddit"] },
  "robinhood": { greenhouse: ["robinhood"], lever: ["robinhood"] },
  "shopify": { greenhouse: ["shopify"], lever: ["shopify"] },
  "spotify": { greenhouse: ["spotify"], lever: ["spotify"] },
  "tiktok": { lever: ["bytedance"] },
  "bytedance": { lever: ["bytedance"] },
  "twilio": { greenhouse: ["twilio"], lever: ["twilio"] },
  "cloudflare": { greenhouse: ["cloudflare"], lever: ["cloudflare"] },
  "databricks": { greenhouse: ["databricks"], lever: ["databricks"] },
  "snowflake": { greenhouse: ["snowflakecomputing"], lever: ["snowflake"] },
  "palantir": { greenhouse: ["palantir"], lever: ["palantir"] },
  "scale ai": { greenhouse: ["scaleai"], lever: ["scaleai"] },
  "anduril": { greenhouse: ["andurilindustries"], lever: ["anduril"] },
  "openai": { greenhouse: ["openai"], lever: ["openai"] },
  "anthropic": { greenhouse: ["anthropic"], lever: ["anthropic"] },
  "meta": { smartrecruiters: ["Facebook2"] },
  "facebook": { smartrecruiters: ["Facebook2"] },
  "amazon": { smartrecruiters: ["AmazonCareers"] },
  "amazon web services": { smartrecruiters: ["AmazonCareers"] },
  "amazon web services (aws)": { smartrecruiters: ["AmazonCareers"] },
  "aws": { smartrecruiters: ["AmazonCareers"] },
  "google": { smartrecruiters: ["Google"] },
  "alphabet": { smartrecruiters: ["Google"] },
  "microsoft": { smartrecruiters: ["Microsoft"] },
  "apple": { smartrecruiters: ["apple"] },
  "nvidia": { smartrecruiters: ["NVIDIA"] },
  "salesforce": { smartrecruiters: ["Salesforce2"] },
  "adobe": { smartrecruiters: ["Adobe"] },
  "ibm": { smartrecruiters: ["IBMCareers"] },
  "oracle": { smartrecruiters: ["Oracle"] },
  "intel": { smartrecruiters: ["Intel"] },
  "cisco": { smartrecruiters: ["Cisco"] },
  "vmware": { smartrecruiters: ["VMware"] },
  "dell": { smartrecruiters: ["Dell"] },
  "hp": { smartrecruiters: ["HP"] },
  "qualcomm": { smartrecruiters: ["Qualcomm"] },
  "sony": { smartrecruiters: ["Sony"] },
  "samsung": { smartrecruiters: ["Samsung"] },
  "tesla": { smartrecruiters: ["Tesla"] },
  "spacex": { smartrecruiters: ["SpaceX"] },
  "walmart": { workday: [{ subdomain: "walmart", instance: "wd5", path: "WalmartExternal" }] },
  "jpmorgan": { smartrecruiters: ["JPMorganChase"] },
  "jpmorgan chase": { smartrecruiters: ["JPMorganChase"] },
  "jp morgan chase": { smartrecruiters: ["JPMorganChase"] },
  "jp morgan": { smartrecruiters: ["JPMorganChase"] },
  "goldman sachs": { smartrecruiters: ["GoldmanSachs"] },
  "morgan stanley": { smartrecruiters: ["MorganStanley"] },
  "deloitte": { smartrecruiters: ["Deloitte2"] },
  "mckinsey": { smartrecruiters: ["McKinsey"] },
  "boston consulting group": { smartrecruiters: ["BCG"] },
  "bcg": { smartrecruiters: ["BCG"] },
  "bain": { smartrecruiters: ["Bain"] },
  "visa": { smartrecruiters: ["Visa"] },
  "mastercard": { smartrecruiters: ["Mastercard"] },
  "paypal": { smartrecruiters: ["PayPal"] },
  // Additional mappings for missing companies
  "jpmorgan chase & co.": { smartrecruiters: ["JPMorganChase"] },
  "jpmorgan chase & co": { smartrecruiters: ["JPMorganChase"] },
  "rippling": { greenhouse: ["rippling"], ashby: ["rippling"] },
  "glean": { greenhouse: ["glean"], ashby: ["glean"] },
  "hugging face": { greenhouse: ["huggingface"], lever: ["huggingface"] },
  "navan": { greenhouse: ["navan"], lever: ["navan"] },
  "assembled": { greenhouse: ["assembled"], ashby: ["assembled"], lever: ["assembled"] },
  "kpmg": { smartrecruiters: ["KPMG"] },
  "ey": { smartrecruiters: ["EY"] },
  "ey-parthenon": { smartrecruiters: ["EY"] },
  "kkr": { smartrecruiters: ["KKR"] },
  "apollo global management": { smartrecruiters: ["ApolloGlobal"], greenhouse: ["apolloglobalmanagement", "apollo"] },
  "ares management": { greenhouse: ["aresmanagement"] },
  "ares management corporation": { greenhouse: ["aresmanagement"] },
  "alvarez & marsal": { greenhouse: ["alvarezandmarsal", "alvarez-marsal"] },
  "universal music group": { smartrecruiters: ["UniversalMusicGroup"] },
  "bilt": { greenhouse: ["bilt"], lever: ["bilt"], ashby: ["bilt"] },
  "knit": { greenhouse: ["knit"], lever: ["knit"], ashby: ["knit"] },
  "regal": { greenhouse: ["regal"], lever: ["regal"] },
  "distyl ai": { greenhouse: ["distylai", "distyl"], ashby: ["distyl"], lever: ["distyl"] },
  "signify technology": { greenhouse: ["signifytechnology"], lever: ["signifytechnology"] },
};

// Generate slug variations to try for unknown companies
function generateSlugVariations(companyName: string): string[] {
  const base = companyName.toLowerCase();
  const slugs = new Set<string>();
  // As-is without spaces
  slugs.add(base.replace(/\s+/g, ""));
  // Hyphenated
  slugs.add(base.replace(/\s+/g, "-"));
  // Remove common suffixes
  for (const suffix of [" inc", " inc.", " llc", " ltd", " ltd.", " corp", " corp.", " co", " co.", " group", " technologies", " technology", " labs", " ai"]) {
    if (base.endsWith(suffix)) {
      const stripped = base.slice(0, -suffix.length).trim();
      slugs.add(stripped.replace(/\s+/g, ""));
      slugs.add(stripped.replace(/\s+/g, "-"));
    }
  }
  return [...slugs];
}

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

    // Extract domain for scoping searches
    const companyDomain = (() => {
      try { return new URL(targetUrl).hostname; } catch { return null; }
    })();

    console.log(`Crawling careers for ${companyName}: ${targetUrl} (domain: ${companyDomain})`);

    const companyLower = companyName.toLowerCase().trim();
    // Try exact match first, then normalized variations
    const normalizeForLookup = (name: string): string[] => {
      const variants = [name];
      // Remove trailing legal suffixes
      const cleaned = name
        .replace(/,?\s*(inc\.?|llc\.?|corp\.?|ltd\.?|co\.?|gmbh|s\.?a\.?|plc|corporation|& co\.?)$/i, "")
        .trim();
      if (cleaned !== name) variants.push(cleaned);
      // Remove parenthetical like (AWS)
      const noParens = cleaned.replace(/\s*\([^)]*\)\s*/g, " ").trim();
      if (noParens !== cleaned) variants.push(noParens);
      return [...new Set(variants)];
    };
    const lookupVariants = normalizeForLookup(companyLower);
    const knownSlugs = lookupVariants.reduce<typeof KNOWN_COMPANY_SLUGS[string] | undefined>(
      (found, v) => found || KNOWN_COMPANY_SLUGS[v], undefined
    );
    const slugVariations = knownSlugs ? [] : generateSlugVariations(companyName);
    const companySlug = companyName.toLowerCase().replace(/\s+/g, "");

    // ─── Strategy 0: Direct job board APIs (structured data, no scraping needed) ───
    let apiJobs: any[] = [];

    // 0a: SmartRecruiters public Posting API (no auth required) — used by Google, Amazon, Meta, etc.
    const smartrecruitersIds = knownSlugs?.smartrecruiters || [];
    if (smartrecruitersIds.length > 0) {
      console.log(`Strategy 0a: Trying SmartRecruiters for ${companyName} with IDs: ${smartrecruitersIds.join(", ")}`);
      for (const srId of smartrecruitersIds) {
        if (apiJobs.length > 0) break;
        try {
          // SmartRecruiters paginates — fetch up to 500 jobs
          let offset = 0;
          const limit = 100;
          let allSrJobs: any[] = [];
          while (true) {
            const srUrl = `https://api.smartrecruiters.com/v1/companies/${srId}/postings?offset=${offset}&limit=${limit}`;
            const resp = await fetch(srUrl, { headers: { "Accept": "application/json" } });
            if (!resp.ok) break;
            const data = await resp.json();
            const content = data.content || [];
            if (content.length === 0) break;
            for (const j of content) {
              allSrJobs.push({
                title: j.name || j.title,
                url: j.ref || j.applyUrl || `https://jobs.smartrecruiters.com/${srId}/${j.id}`,
                location: j.location?.city ? `${j.location.city}${j.location.region ? ", " + j.location.region : ""}${j.location.country ? ", " + j.location.country : ""}` : (j.location?.remote ? "Remote" : null),
                department: j.department?.label || j.department?.id || null,
                description: (j.customField?.find((f: any) => f.fieldId === "description")?.valueLabel || "")?.slice(0, 200) || null,
              });
            }
            if (content.length < limit || allSrJobs.length >= 500) break;
            offset += limit;
          }
          if (allSrJobs.length > 0) {
            apiJobs = allSrJobs;
            console.log(`SmartRecruiters (${srId}): ${apiJobs.length} jobs found`);
          }
        } catch (e) {
          console.log(`SmartRecruiters (${srId}) failed:`, e);
        }
      }
    }

    // 0b: Standard job board APIs (Greenhouse, Lever, Ashby) with known slugs + variations
    if (apiJobs.length === 0) {
      const greenhouseSlugs = knownSlugs?.greenhouse || slugVariations;
      const leverSlugs = knownSlugs?.lever || slugVariations;
      const ashbySlugs = knownSlugs?.ashby || [companySlug];

      const jobBoardApis: { name: string; url: string; parse: (data: any) => any[] }[] = [];

      for (const slug of [...new Set(greenhouseSlugs)]) {
        jobBoardApis.push({
          name: `Greenhouse(${slug})`,
          url: `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs`,
          parse: (data: any) => (data.jobs || []).map((j: any) => ({
            title: j.title,
            url: j.absolute_url || null,
            location: j.location?.name || null,
            department: j.departments?.[0]?.name || null,
            description: null,
          })),
        });
      }

      for (const slug of [...new Set(leverSlugs)]) {
        jobBoardApis.push({
          name: `Lever(${slug})`,
          url: `https://api.lever.co/v0/postings/${slug}?mode=json`,
          parse: (data: any) => (Array.isArray(data) ? data : []).map((j: any) => ({
            title: j.text,
            url: j.hostedUrl || j.applyUrl || null,
            location: j.categories?.location || null,
            department: j.categories?.department || j.categories?.team || null,
            description: j.descriptionPlain?.slice(0, 200) || null,
          })),
        });
      }

      for (const slug of [...new Set(ashbySlugs)]) {
        jobBoardApis.push({
          name: `Ashby(${slug})`,
          url: `https://api.ashbyhq.com/posting-api/job-board/${slug}?includeCompensation=true`,
          parse: (data: any) => (data.jobs || []).filter((j: any) => j.isListed !== false).map((j: any) => ({
            title: j.title,
            url: j.jobUrl || j.applyUrl || null,
            location: j.location || j.locationName || null,
            department: j.departmentName || j.department || null,
            description: j.descriptionPlain?.slice(0, 200) || null,
          })),
        });
      }

      console.log(`Strategy 0b: Trying ${jobBoardApis.length} job board API endpoints...`);
      const apiPromises = jobBoardApis.map(async (board) => {
        try {
          const ctrl = new AbortController();
          const timeout = setTimeout(() => ctrl.abort(), 8000);
          const resp = await fetch(board.url, {
            headers: { "Accept": "application/json" },
            signal: ctrl.signal,
          });
          clearTimeout(timeout);
          if (resp.ok) {
            const data = await resp.json();
            const parsed = board.parse(data);
            if (parsed.length > 0) {
              console.log(`${board.name}: ${parsed.length} jobs found`);
              return { name: board.name, jobs: parsed };
            }
          }
        } catch {
          // API not available for this company
        }
        return null;
      });

      const apiResults = (await Promise.all(apiPromises)).filter(Boolean);
      const bestApi = apiResults.sort((a, b) => b!.jobs.length - a!.jobs.length)[0];
      if (bestApi && bestApi.jobs.length > 0) {
        apiJobs = bestApi.jobs;
        console.log(`Best API: ${bestApi.name} with ${apiJobs.length} jobs — skipping scraping`);
      }
    }

    // Job aggregator domains to exclude from search results
    const aggregatorDomains = ["indeed.com", "glassdoor.com", "linkedin.com", "ziprecruiter.com", "monster.com", "careerbuilder.com", "simplyhired.com"];

    let jobs: any[] = [];

    if (apiJobs.length > 0) {
      // Structured data from job board API — no scraping or AI needed
      jobs = apiJobs;
      console.log(`Using ${jobs.length} jobs from direct API — skipping scraping & AI`);
    } else {
      // ─── Fallback: Scrape + AI extraction ───
      console.log("No API results, falling back to scraping...");

      // Strategy 1: Firecrawl search scoped to company domain
      const siteFilter = companyDomain ? `site:${companyDomain}` : "";
      const searchResponse = await fetch("https://api.firecrawl.dev/v1/search", {
        method: "POST",
        headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          query: `${siteFilter} ${companyName} careers jobs openings apply`,
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
          if (aggregatorDomains.some(d => r.url?.includes(d))) continue;
          if (r.markdown) allMarkdown += "\n\n---\n" + r.markdown;
          if (r.url) allLinks.push(r.url);
        }
        console.log(`Search: ${results.length} results, ${allMarkdown.length} chars`);
      }

      // Strategy 1b: If site-scoped search yielded little, try broader search
      if (allMarkdown.length < 200) {
        console.log("Site-scoped search insufficient, trying broader search...");
        const broadResponse = await fetch("https://api.firecrawl.dev/v1/search", {
          method: "POST",
          headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            query: `"${companyName}" careers jobs openings "apply now" -site:indeed.com -site:linkedin.com -site:glassdoor.com`,
            limit: 5,
            scrapeOptions: { formats: ["markdown"] },
          }),
        });
        if (broadResponse.ok) {
          const broadData = await broadResponse.json();
          const results = broadData.data || broadData.results || [];
          for (const r of results) {
            if (aggregatorDomains.some(d => r.url?.includes(d))) continue;
            if (r.markdown) allMarkdown += "\n\n---\n" + r.markdown;
            if (r.url) allLinks.push(r.url);
          }
          console.log(`Broad search: ${results.length} results, total ${allMarkdown.length} chars`);
        }
      }

      // Strategy 2: Scrape careers page directly
      const scrapeResponse = await fetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ url: targetUrl, formats: ["markdown", "links"], onlyMainContent: true, waitFor: 3000 }),
      });
      if (scrapeResponse.ok) {
        const scrapeData = await scrapeResponse.json();
        const scrapedMarkdown = scrapeData.data?.markdown || scrapeData.markdown || "";
        const scrapedLinks = scrapeData.data?.links || scrapeData.links || [];
        allMarkdown += "\n\n---\nDIRECT CAREERS PAGE:\n" + scrapedMarkdown;
        allLinks = [...allLinks, ...scrapedLinks];
      }

      // Strategy 2.5: Try job board platforms via scrape (parallel)
      const jobBoardUrls = [
        `https://boards.greenhouse.io/${companySlug}`,
        `https://jobs.lever.co/${companySlug}`,
        `https://jobs.ashbyhq.com/${companySlug}`,
        `https://${companySlug}.jobs.personio.com`,
        `https://apply.workable.com/${companySlug}`,
      ];
      const boardPromises = jobBoardUrls.map(async (boardUrl) => {
        try {
          const resp = await fetch("https://api.firecrawl.dev/v1/scrape", {
            method: "POST",
            headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({ url: boardUrl, formats: ["markdown", "links"], onlyMainContent: true, waitFor: 3000 }),
          });
          if (resp.ok) {
            const d = await resp.json();
            return { url: boardUrl, markdown: d.data?.markdown || d.markdown || "", links: d.data?.links || d.links || [] };
          }
        } catch { /* skip */ }
        return null;
      });
      const boardResults = (await Promise.all(boardPromises)).filter(Boolean);
      const bestBoard = boardResults.sort((a, b) => (b!.markdown.length - a!.markdown.length))[0];
      if (bestBoard && bestBoard.markdown.length > 500) {
        allMarkdown += `\n\n---\nJOB BOARD (${bestBoard.url}):\n${bestBoard.markdown}`;
        allLinks = [...allLinks, ...bestBoard.links];
      }

      // Strategy 3: Map careers URLs
      const urlsToMap = [targetUrl];
      if (bestBoard && bestBoard.markdown.length > 500) urlsToMap.push(bestBoard.url);
      let jobDetailLinks: string[] = [];
      for (const mapUrl of urlsToMap) {
        const mapResponse = await fetch("https://api.firecrawl.dev/v1/map", {
          method: "POST",
          headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ url: mapUrl, search: "jobs positions openings careers", limit: 200, includeSubdomains: true }),
        });
        if (mapResponse.ok) {
          const mapData = await mapResponse.json();
          const mappedLinks = mapData.links || mapData.data?.links || [];
          const jobLinks = mappedLinks.filter((l: string) => /job|position|opening|career|role|apply/i.test(l) && !/blog|news|about|privacy|terms/i.test(l));
          allLinks = [...allLinks, ...jobLinks];
          jobDetailLinks = [...jobDetailLinks, ...jobLinks.filter((l: string) => /\/[a-f0-9-]{8,}|\/\d{4,}|\/[a-z]+-[a-z]+-[a-z]+/i.test(l))];
        }
      }

      // Strategy 4: Deep crawl individual job pages
      const detailPages = [...new Set(jobDetailLinks)].slice(0, 15);
      if (detailPages.length > 0) {
        const batchPromises = detailPages.map(async (url) => {
          try {
            const resp = await fetch("https://api.firecrawl.dev/v1/scrape", {
              method: "POST",
              headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
              body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: true, waitFor: 2000 }),
            });
            if (resp.ok) { const d = await resp.json(); return { url, markdown: (d.data?.markdown || d.markdown || "").slice(0, 3000) }; }
          } catch { /* skip */ }
          return null;
        });
        const detailResults = (await Promise.all(batchPromises)).filter(Boolean);
        for (const r of detailResults) { if (r) allMarkdown += `\n\n---\nINDIVIDUAL JOB PAGE (${r.url}):\n${r.markdown}`; }
      }

      allLinks = [...new Set(allLinks)];
      if (!allMarkdown || allMarkdown.length < 50) {
        return new Response(JSON.stringify({ error: "Insufficient content found", jobs: [] }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // AI extraction
      const extractPrompt = `Extract ALL individual job openings from this content about ${companyName}.
RULES: Extract SPECIFIC job titles. SKIP career categories, department headers, generic labels. Include valid short titles like "Data Analyst".
For each job: title, url, location, department, description (1-2 sentences).

Content:
${allMarkdown.slice(0, 40000)}

URLs:
${allLinks.slice(0, 150).join("\n")}

Return ONLY a valid JSON array.`;

      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: "Extract individual job listings. Respond with JSON array only, no markdown fences." },
            { role: "user", content: extractPrompt },
          ],
        }),
      });

      if (!aiResponse.ok) {
        console.error("AI error:", aiResponse.status, await aiResponse.text());
        return new Response(JSON.stringify({ error: "AI extraction failed" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const rawContent = (await aiResponse.json()).choices?.[0]?.message?.content || "[]";
      try {
        jobs = JSON.parse(rawContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
        if (!Array.isArray(jobs)) jobs = [];
      } catch {
        console.error("Failed to parse jobs:", rawContent.slice(0, 500));
        jobs = [];
      }
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
        ? `\nLOCATION PREFERENCE: The candidate is based in "${userLocation}". Jobs in or near this location get +5 points. Remote jobs get +3 points. Do NOT give location bonus otherwise.`
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
${userResumeText.slice(0, 4000)}

Jobs:
${JSON.stringify(jobs.map((j: any, i: number) => ({
  index: i,
  title: j.title,
  location: j.location,
  department: j.department,
  description: j.description?.slice(0, 300) || null,
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
            { role: "system", content: "You are a strict job-resume match scorer. Be realistic — most cross-functional matches should score below 50. Respond with JSON array only. No markdown." },
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
