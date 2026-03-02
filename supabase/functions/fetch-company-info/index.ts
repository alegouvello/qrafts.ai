import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function findCompanyUrl(companyName: string, domain: string | null, firecrawlKey: string): Promise<string> {
  // If domain provided, use it directly
  if (domain) return `https://${domain}`;

  // Clean company name for domain guessing
  const cleanName = companyName
    .replace(/,?\s*(inc\.?|llc\.?|corp\.?|ltd\.?|gmbh|s\.?a\.?|plc)$/i, "")
    .replace(/\s*\([^)]*\)\s*/g, " ") // remove parenthetical like (AWS)
    .replace(/&/g, "and")
    .replace(/[^a-zA-Z0-9\s-]/g, "")
    .trim()
    .toLowerCase();

  const hyphenated = cleanName.replace(/\s+/g, "-");
  const compact = cleanName.replace(/\s+/g, "");

  // Try common domain patterns with HEAD requests
  const candidates = [`${compact}.com`, `${hyphenated}.com`];
  for (const d of candidates) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const resp = await fetch(`https://${d}`, { method: "HEAD", redirect: "follow", signal: controller.signal });
      clearTimeout(timeout);
      await resp.text();
      if (resp.ok || resp.status < 500) {
        console.log(`Domain resolved: ${d}`);
        return `https://${d}`;
      }
    } catch { /* domain doesn't resolve or timed out */ }
  }

  // Fallback: use Firecrawl search to find the real website
  console.log(`Domain guessing failed, searching for "${companyName}" website...`);
  try {
    const searchResp = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${firecrawlKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: `${companyName} official website`,
        limit: 3,
      }),
    });
    const searchData = await searchResp.json();
    if (searchResp.ok && searchData.data?.length > 0) {
      const url = searchData.data[0].url;
      console.log(`Found via search: ${url}`);
      // Extract just the origin
      try {
        const parsed = new URL(url);
        return parsed.origin;
      } catch {
        return url;
      }
    }
  } catch (e) {
    console.error("Search fallback failed:", e);
  }

  // Last resort
  return `https://${compact}.com`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { companyName, domain } = await req.json();
    if (!companyName) {
      return new Response(
        JSON.stringify({ error: "companyName is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if we already have a recent profile (< 7 days old)
    const { data: existing } = await supabase
      .from("company_profiles")
      .select("*")
      .eq("company_name", companyName)
      .maybeSingle();

    if (existing && existing.fetched_at) {
      const age = Date.now() - new Date(existing.fetched_at).getTime();
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      if (age < sevenDays) {
        return new Response(JSON.stringify({ success: true, profile: existing, cached: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
    if (!firecrawlKey) {
      return new Response(
        JSON.stringify({ success: true, profile: existing || null, cached: !!existing }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const targetUrl = await findCompanyUrl(companyName, domain, firecrawlKey);
    const targetDomain = new URL(targetUrl).hostname;
    console.log("Scraping company info from:", targetUrl);

    const scrapeResponse = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${firecrawlKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: targetUrl,
        formats: ["summary", "links"],
        onlyMainContent: true,
      }),
    });

    const scrapeData = await scrapeResponse.json();

    if (!scrapeResponse.ok) {
      console.error("Firecrawl scrape error:", scrapeData);
      return new Response(
        JSON.stringify({ success: true, profile: existing || null, cached: !!existing }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract info — filter out error-like content
    const rawSummary = scrapeData.data?.summary || scrapeData.summary || null;
    const metadata = scrapeData.data?.metadata || scrapeData.metadata || {};
    const links = scrapeData.data?.links || scrapeData.links || [];
    
    // Don't use summaries that look like error/access-denied messages
    const isErrorContent = rawSummary && /access denied|restricted|blocked|forbidden|error|reference number/i.test(rawSummary);
    const summary = isErrorContent ? null : rawSummary;

    // Only use real URLs found on the page
    const careersUrl = links.find((l: string) =>
      /career|jobs|join|hiring|work-with-us|openings/i.test(l)
    ) || null;

    const linkedinUrl = links.find((l: string) =>
      /linkedin\.com\/company/i.test(l)
    ) || null;

    const profile = {
      company_name: companyName,
      domain: targetDomain,
      description: summary || metadata.description || null,
      website_url: targetUrl,
      linkedin_url: linkedinUrl,
      careers_url: careersUrl,
      fetched_at: new Date().toISOString(),
    };

    const { data: upserted, error: upsertError } = await supabase
      .from("company_profiles")
      .upsert(profile, { onConflict: "company_name" })
      .select()
      .single();

    if (upsertError) {
      console.error("Upsert error:", upsertError);
    }

    return new Response(
      JSON.stringify({ success: true, profile: upserted || profile, cached: false }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
