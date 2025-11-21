import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { imageData } = await req.json();
    
    if (!imageData) {
      return new Response(
        JSON.stringify({ error: 'No image data provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Extracting LinkedIn profile information from screenshot');
    
    // Use Lovable AI vision to extract information from the screenshot
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const systemPrompt = `You are a LinkedIn profile information extractor. Extract ALL relevant professional information from this LinkedIn profile screenshot.

Extract and return a comprehensive summary including:
- Current role and company
- Professional headline/title
- Career history (all positions with companies and dates)
- Education background
- Key skills and specializations
- Notable achievements or projects mentioned
- Publications or articles
- Certifications
- Languages
- Volunteer work
- Any other relevant professional information visible

Format the response as a well-organized, detailed summary that captures all the professional information visible in the screenshot. Be thorough and include dates, company names, and specific details.`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { 
            role: 'system', 
            content: systemPrompt 
          },
          { 
            role: 'user', 
            content: [
              {
                type: 'text',
                text: 'Extract all professional information from this LinkedIn profile screenshot. Be thorough and include all visible details.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageData
                }
              }
            ]
          }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Lovable AI error:', aiResponse.status, errorText);
      throw new Error('Failed to process with AI');
    }

    const aiData = await aiResponse.json();
    const extractedInfo = aiData.choices[0].message.content;
    
    console.log('Successfully extracted LinkedIn profile information');

    return new Response(
      JSON.stringify({
        success: true,
        extractedInfo
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in extract-linkedin-screenshot function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
