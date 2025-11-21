import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { interviewerId, linkedinUrl } = await req.json();

    if (!interviewerId || !linkedinUrl) {
      return new Response(
        JSON.stringify({ error: 'Missing interviewerId or linkedinUrl' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!firecrawlApiKey) {
      console.error('FIRECRAWL_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Firecrawl API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Extracting LinkedIn profile:', linkedinUrl);

    // Scrape the LinkedIn profile using Firecrawl API
    const scrapeResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: linkedinUrl,
        formats: ['markdown', 'html'],
      }),
    });

    if (!scrapeResponse.ok) {
      const errorText = await scrapeResponse.text();
      console.error('Failed to scrape LinkedIn profile:', errorText);
      return new Response(
        JSON.stringify({ 
          error: 'LinkedIn scraping not available',
          message: 'LinkedIn requires enterprise Firecrawl plan. Please add interviewer details manually.'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const scrapeResult = await scrapeResponse.json();

    if (!scrapeResult.success) {
      console.error('Failed to scrape LinkedIn profile:', scrapeResult);
      return new Response(
        JSON.stringify({ 
          error: 'LinkedIn scraping not available',
          message: scrapeResult.error || 'LinkedIn requires enterprise Firecrawl plan. Please add interviewer details manually.'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('LinkedIn profile scraped successfully');

    // Update the interviewer record with extracted data
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { error: updateError } = await supabase
      .from('interviewers')
      .update({
        extracted_data: {
          markdown: scrapeResult.data?.markdown,
          html: scrapeResult.data?.html,
          metadata: scrapeResult.data?.metadata,
          extracted_at: new Date().toISOString()
        }
      })
      .eq('id', interviewerId);

    if (updateError) {
      console.error('Failed to update interviewer:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to save extracted data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'LinkedIn profile extracted successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in extract-linkedin-profile:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});