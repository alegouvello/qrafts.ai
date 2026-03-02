import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    // Use Firecrawl to scrape company website
    const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
    if (!firecrawlKey) {
      // Return existing or empty if no Firecrawl
      return new Response(
        JSON.stringify({ success: true, profile: existing || null, cached: !!existing }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const targetDomain = domain || `${companyName.toLowerCase().replace(/\s+/g, "")}.com`;
    const targetUrl = `https://${targetDomain}`;

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
      console.error("Firecrawl error:", scrapeData);
      return new Response(
        JSON.stringify({ success: true, profile: existing || null, cached: !!existing }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract info
    const summary = scrapeData.data?.summary || scrapeData.summary || null;
    const metadata = scrapeData.data?.metadata || scrapeData.metadata || {};
    const links = scrapeData.data?.links || scrapeData.links || [];

    // Try to find careers and linkedin links — only use real URLs found on the page
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

    // Upsert into company_profiles
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
