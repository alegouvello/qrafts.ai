import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    const { resumeData } = await req.json();

    if (!resumeData) {
      return new Response(
        JSON.stringify({ error: 'Resume data is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Analyze what sections are present
    const sections = [];
    if (resumeData.summary) sections.push('summary');
    if (resumeData.experience?.length > 0) sections.push('experience');
    if (resumeData.education?.length > 0) sections.push('education');
    if (resumeData.skills?.length > 0) sections.push('skills');
    if (resumeData.certifications?.length > 0) sections.push('certifications');
    if (resumeData.publications?.length > 0) sections.push('publications');
    if (resumeData.projects?.length > 0) sections.push('projects');
    if (resumeData.awards?.length > 0) sections.push('awards');
    if (resumeData.languages?.length > 0) sections.push('languages');
    if (resumeData.volunteer_work?.length > 0) sections.push('volunteer_work');
    if (resumeData.interests?.length > 0) sections.push('interests');

    // Prepare context for AI
    const experienceYears = resumeData.experience?.length || 0;
    const educationLevel = resumeData.education?.[0]?.degree || 'Unknown';
    const hasPhD = educationLevel.toLowerCase().includes('phd') || educationLevel.toLowerCase().includes('doctorate');
    const hasMasters = educationLevel.toLowerCase().includes('master');
    const hasPublications = (resumeData.publications?.length || 0) > 0;

    const systemPrompt = `You are a professional resume consultant who analyzes resumes and suggests optimal section ordering based on industry best practices.

Your task is to:
1. Determine the user's experience level (entry-level, mid-level, senior, executive, academic)
2. Identify the most relevant industry based on their experience and education
3. Suggest the optimal section order for their resume
4. Explain the reasoning behind your recommendations

Consider these factors:
- Entry-level candidates should lead with education
- Experienced professionals should lead with experience
- Academic roles should highlight publications and research
- Technical roles should emphasize skills and projects
- Creative roles should showcase projects and portfolio

Respond with a JSON object containing:
{
  "experienceLevel": "entry-level | mid-level | senior | executive | academic",
  "industry": "string describing the industry",
  "recommendedOrder": ["section1", "section2", ...],
  "reasoning": "detailed explanation of why this order is optimal",
  "keyInsights": ["insight1", "insight2", "insight3"]
}`;

    const userPrompt = `Analyze this resume and suggest the optimal section order:

Available sections: ${sections.join(', ')}

Resume details:
- Number of work experiences: ${experienceYears}
- Highest education: ${educationLevel}
- Has publications: ${hasPublications}
- Has PhD/Doctorate: ${hasPhD}
- Has Master's degree: ${hasMasters}
- Recent positions: ${resumeData.experience?.slice(0, 2).map((exp: any) => exp.position).join(', ') || 'None'}

Provide your analysis as a JSON object.`;

    console.log('Calling Lovable AI for resume order analysis');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
        tools: [{
          type: "function",
          function: {
            name: "suggest_resume_order",
            description: "Suggest optimal resume section order based on experience and industry",
            parameters: {
              type: "object",
              properties: {
                experienceLevel: {
                  type: "string",
                  enum: ["entry-level", "mid-level", "senior", "executive", "academic"],
                  description: "The candidate's experience level"
                },
                industry: {
                  type: "string",
                  description: "The primary industry or field"
                },
                recommendedOrder: {
                  type: "array",
                  items: { type: "string" },
                  description: "Ordered list of section names"
                },
                reasoning: {
                  type: "string",
                  description: "Detailed explanation of the recommended order"
                },
                keyInsights: {
                  type: "array",
                  items: { type: "string" },
                  description: "Key insights about the resume (3-5 points)"
                }
              },
              required: ["experienceLevel", "industry", "recommendedOrder", "reasoning", "keyInsights"],
              additionalProperties: false
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "suggest_resume_order" } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('AI response received');

    // Extract the tool call result
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error('No tool call in AI response');
    }

    const analysis = JSON.parse(toolCall.function.arguments);

    return new Response(
      JSON.stringify({ 
        success: true,
        analysis 
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Error in analyze-resume-order function:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    const errorDetails = error instanceof Error ? error.toString() : String(error);
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: errorDetails
      }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});