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
    const { resumeText, position, company, roleSummary } = await req.json();
    
    if (!resumeText) {
      return new Response(
        JSON.stringify({ error: 'Resume text is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build context about the role
    let roleContext = `Position: ${position} at ${company}\n\n`;
    if (roleSummary) {
      if (roleSummary.description) roleContext += `Description: ${roleSummary.description}\n\n`;
      if (roleSummary.responsibilities && roleSummary.responsibilities.length > 0) {
        roleContext += `Key Responsibilities:\n${roleSummary.responsibilities.map((r: string) => `- ${r}`).join('\n')}\n\n`;
      }
      if (roleSummary.requirements && roleSummary.requirements.length > 0) {
        roleContext += `Requirements:\n${roleSummary.requirements.map((r: string) => `- ${r}`).join('\n')}\n\n`;
      }
    }

    const systemPrompt = `You are an expert resume writer and career coach. Your job is to analyze a user's resume and suggest specific improvements to tailor it for a particular job role.

CRITICAL CONSTRAINTS:
- DO NOT hallucinate or invent any information
- ONLY reword and reposition existing content from the original resume
- DO NOT add experiences, skills, achievements, or qualifications that are not in the original resume
- DO NOT exaggerate or embellish the candidate's actual experience
- ONLY suggest ways to emphasize and reframe what is already present

Analyze the resume section by section and provide concrete, actionable suggestions. For each section:
1. Identify what's currently there
2. Suggest specific improvements that highlight relevant experience for this role by rewording existing content
3. Recommend keyword additions that match the job requirements but only if they accurately describe existing experience
4. Suggest ways to quantify achievements when possible, but only using information already present

Be specific and practical. Don't just say "improve this" - provide actual suggested text and examples based solely on the original resume content.`;

    const userPrompt = `Here is the job I'm applying for:
${roleContext}

Here is my current resume:
${resumeText}

Please analyze my resume and provide specific, tailored suggestions for improving it for this role. Break down your analysis by resume section (e.g., Summary, Experience, Skills, Education) and provide:

1. What's working well in each section
2. Specific text suggestions or rewrites to better align with this role
3. Keywords or phrases from the job description I should incorporate
4. Quantifiable achievements I could emphasize
5. Any gaps or missing information I should address

Format your response in a structured way that I can easily review and implement.`;

    console.log('Calling Lovable AI for resume tailoring');

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add more credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ error: 'Failed to generate resume suggestions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    const suggestions = aiData.choices[0].message.content;

    console.log('Resume tailoring completed successfully');

    return new Response(
      JSON.stringify({ suggestions }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in tailor-resume function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
