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

Format your response with clear sections and bullet points for maximum readability:

## CURRENT ROLE
• [Position] at [Company]
• [Professional headline/bio]

## EXPERIENCE
• [Position] | [Company] | [Dates]
  - Key responsibilities or achievements
  
• [Position] | [Company] | [Dates]
  - Key responsibilities or achievements

## EDUCATION
• [Degree] - [School] ([Year])
• [Degree] - [School] ([Year])

## SKILLS
• [Skill 1], [Skill 2], [Skill 3], etc.

## CERTIFICATIONS
• [Certification] - [Issuer] ([Date])

## PUBLICATIONS
• [Title] - [Publisher] ([Date])

## LANGUAGES
• [Language] - [Proficiency level]

## VOLUNTEER WORK
• [Role] at [Organization]

## OTHER NOTABLE INFO
• Any awards, projects, or other relevant details

Use this exact structure with clear section headers (##), bullet points (•), and proper spacing. Be thorough but concise. Include all visible details with dates and company names.`;

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
