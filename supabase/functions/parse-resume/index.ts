import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import JSZip from 'https://esm.sh/jszip@3.10.1';

// PDF text extraction function using pdfjs-serverless
async function extractTextFromPdf(data: Uint8Array): Promise<string> {
  // Dynamic import to avoid build issues
  // deno-lint-ignore no-explicit-any
  const pdfjsServerless: any = await import('https://esm.sh/pdfjs-serverless@0.4.0?bundle');
  
  // Try to get the function from different export patterns
  let getDocument = pdfjsServerless.getDocument || pdfjsServerless.default?.getDocument;
  
  if (!getDocument && pdfjsServerless.resolvePDFJS) {
    // Fallback: resolve PDF.js and get the function
    const pdfjs = await pdfjsServerless.resolvePDFJS();
    getDocument = pdfjs.getDocument;
  }
  
  if (!getDocument) {
    throw new Error('Could not load PDF.js library');
  }
  
  const document = await getDocument({ data, useSystemFonts: true }).promise;
  return await extractPagesText(document);
}

// deno-lint-ignore no-explicit-any
async function extractPagesText(document: any): Promise<string> {
  let fullText = '';
  for (let i = 1; i <= document.numPages; i++) {
    const page = await document.getPage(i);
    const textContent = await page.getTextContent();
    // deno-lint-ignore no-explicit-any
    const pageText = textContent.items
      .filter((item: any) => item.str != null)
      .map((item: any) => item.str)
      .join(' ');
    fullText += pageText + '\n';
  }
  return fullText.trim();
}

// Convert Uint8Array to base64 without blowing the call stack (works for large files)
function uint8ToBase64(bytes: Uint8Array): string {
  const chunkSize = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

// OCR function using an AI vision-capable model for scanned PDFs
async function extractTextWithOCR(pdfData: Uint8Array, lovableApiKey: string): Promise<string> {
  console.log('Using AI OCR for scanned PDF...');

  // Practical guardrail: large PDFs can exceed request/compute limits and hang.
  // If you need larger docs later, we can implement page-by-page rendering + OCR.
  const maxBytes = 6_000_000; // ~6MB
  if (pdfData.byteLength > maxBytes) {
    throw new Error(`Scanned PDF is too large for OCR (${Math.round(pdfData.byteLength / 1024 / 1024)}MB). Please upload a smaller file or paste text.`);
  }

  const base64Pdf = uint8ToBase64(pdfData);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 55_000);

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // Flash is faster for OCR; keep output bounded to reduce latency.
        model: 'google/gemini-2.5-flash',
        max_tokens: 4000,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Perform OCR on this scanned resume PDF and return ONLY the extracted text. Preserve:
- headings/sections
- bullet points (including nesting)
- dates, locations, contact info
- job titles, company names, and descriptions
- education/certifications/skills
- URLs

No commentary, no JSON—just the raw text.`
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:application/pdf;base64,${base64Pdf}`
                }
              }
            ]
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OCR API error:', response.status, errorText);
      throw new Error('Failed to perform OCR on scanned PDF');
    }

    const data = await response.json();
    const extractedText = data.choices?.[0]?.message?.content || '';

    console.log('OCR extracted text length:', extractedText.length);
    return extractedText;
  } catch (err) {
    console.error('OCR request failed:', err);
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

// Detect ligature corruption from PDF.js
// Common patterns: semicolons replacing ligature chars (solu;ons, execu;ve, func;onal)
// or hyphens (solu-ons), or dropped chars entirely
function hasLigatureCorruption(text: string): boolean {
  // Pattern 1: semicolons replacing ligatures (most common in this project)
  // e.g. "solu;ons", "execu;ve", "func;onal", "produc;on", "consul;ng", "automo;ve"
  const semicolonPattern = /\b[a-z]{2,};[a-z]{2,}\b/gi;
  const semicolonMatches = text.match(semicolonPattern) || [];
  
  if (semicolonMatches.length >= 3) {
    console.log('Detected semicolon ligature corruption. Broken words:', semicolonMatches.slice(0, 10));
    return true;
  }

  // Pattern 2: hyphens replacing ligatures  
  // e.g. "solu-ons", "consul-ng", "opera-ng"
  const brokenWordPattern = /\b[a-z]{2,}-[a-z]{2,}\b/gi;
  const brokenMatches = text.match(brokenWordPattern) || [];
  const likelyCorrupted = brokenMatches.filter(w => {
    return /-(ons?|ng|on|ve|onal|ed|er|es|al|le|ly|fy|ne|ty|me|ce|de|cal|ble|ment|ness|ful|ous|ive|ant|ent|ary|ory)$/i.test(w);
  });

  if (likelyCorrupted.length >= 3) {
    console.log('Detected hyphen ligature corruption. Broken words:', likelyCorrupted.slice(0, 10));
    return true;
  }
  
  return false;
}

// Check if text appears to be from a scanned PDF (too short or mostly whitespace)
function isLikelyScannedPdf(text: string): boolean {
  // Remove whitespace and check if there's meaningful content
  const cleanText = text.replace(/\s+/g, ' ').trim();
  
  // If text is very short (less than 100 chars), it's likely scanned
  if (cleanText.length < 100) {
    console.log('PDF appears to be scanned (text too short):', cleanText.length, 'chars');
    return true;
  }
  
  // Check if text has very few recognizable words
  const words = cleanText.split(' ').filter(w => w.length > 2);
  if (words.length < 20) {
    console.log('PDF appears to be scanned (too few words):', words.length);
    return true;
  }
  
  return false;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  resumeUrl?: string;
  fileBase64?: string;
  fileName?: string;
}

interface WordParagraph {
  text: string;
  isHeading: boolean;
  isBullet: boolean;
  level: number;
}

async function extractStructuredTextFromDocx(arrayBuffer: ArrayBuffer): Promise<string> {
  const zip = await JSZip.loadAsync(arrayBuffer);
  
  // Extract document.xml which contains the main text
  const docXml = await zip.file('word/document.xml')?.async('string');
  if (!docXml) {
    throw new Error('Could not find document.xml in Word file');
  }

  // Extract relationships to get hyperlinks
  const relsXml = await zip.file('word/_rels/document.xml.rels')?.async('string');
  const relationships = new Map<string, string>();
  
  if (relsXml) {
    // Parse relationships for hyperlinks
    const relMatches = relsXml.matchAll(/<Relationship[^>]+Id="([^"]+)"[^>]+Target="([^"]+)"/g);
    for (const match of relMatches) {
      relationships.set(match[1], match[2]);
    }
  }

  const paragraphs: WordParagraph[] = [];
  
  // Parse paragraphs with better structure detection
  const paragraphRegex = /<w:p[^>]*>([\s\S]*?)<\/w:p>/g;
  let paragraphMatch;
  
  while ((paragraphMatch = paragraphRegex.exec(docXml)) !== null) {
    const paragraphContent = paragraphMatch[1];
    
    // Check if it's a heading
    const isHeading = /<w:pStyle[^>]+w:val="Heading[^"]*"/.test(paragraphContent);
    const headingMatch = paragraphContent.match(/<w:pStyle[^>]+w:val="Heading(\d+)"/);
    const level = headingMatch ? parseInt(headingMatch[1]) : 0;
    
    // Check if it's a bullet point and get indentation level
    const isBullet = /<w:numPr>/.test(paragraphContent);
    const indentMatch = paragraphContent.match(/<w:ilvl[^>]+w:val="(\d+)"/);
    const indentLevel = indentMatch ? parseInt(indentMatch[1]) : 0;
    
    // Extract text from all text runs
    let text = '';
    const textRegex = /<w:t[^>]*>([^<]*)<\/w:t>/g;
    let textMatch;
    
    while ((textMatch = textRegex.exec(paragraphContent)) !== null) {
      text += textMatch[1];
    }
    
    // Extract hyperlinks
    const hyperlinkRegex = /<w:hyperlink[^>]+r:id="([^"]+)"[^>]*>([\s\S]*?)<\/w:hyperlink>/g;
    let hyperlinkMatch;
    
    while ((hyperlinkMatch = hyperlinkRegex.exec(paragraphContent)) !== null) {
      const relId = hyperlinkMatch[1];
      const linkContent = hyperlinkMatch[2];
      
      // Extract text from the hyperlink
      const linkTextRegex = /<w:t[^>]*>([^<]*)<\/w:t>/g;
      let linkText = '';
      let linkTextMatch;
      
      while ((linkTextMatch = linkTextRegex.exec(linkContent)) !== null) {
        linkText += linkTextMatch[1];
      }
      
      // Add the link with its URL if available
      const url = relationships.get(relId);
      if (url && linkText) {
        text += ` [${linkText}](${url})`;
      }
    }
    
    // Clean and normalize the text
    text = text
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F-\x9F]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    if (text) {
      paragraphs.push({ text, isHeading, isBullet, level: isBullet ? indentLevel : level });
    }
  }
  
  // Format the paragraphs into structured text with nested bullets
  let structuredText = '';
  for (let i = 0; i < paragraphs.length; i++) {
    const para = paragraphs[i];
    if (para.isHeading) {
      structuredText += `\n${'#'.repeat(para.level)} ${para.text}\n`;
    } else if (para.isBullet) {
      // Add indentation marker for nested bullets
      const indent = '  '.repeat(para.level);
      structuredText += `${indent}• ${para.text}\n`;
    } else {
      structuredText += `${para.text}\n`;
    }
  }
  
  return structuredText.trim();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { resumeUrl, fileBase64, fileName: inputFileName }: RequestBody = await req.json();
    
    let extractedText = '';
    let fileArrayBuffer: ArrayBuffer;
    let fileName: string;
    let usedOcr = false;

    // Handle base64 input (from UploadCustomResumeDialog)
    if (fileBase64 && inputFileName) {
      console.log('Processing base64 file:', inputFileName);
      fileName = inputFileName.toLowerCase();
      
      // Decode base64 to ArrayBuffer
      const binaryString = atob(fileBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      fileArrayBuffer = bytes.buffer;
    } 
    // Handle storage URL (from UploadResumeDialog)
    else if (resumeUrl) {
      console.log('Parsing resume from storage:', resumeUrl);
      fileName = resumeUrl.toLowerCase();

      // Download the file
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('resumes')
        .download(resumeUrl);

      if (downloadError || !fileData) {
        console.error('Error downloading file:', downloadError);
        throw new Error('Failed to download resume file');
      }

      fileArrayBuffer = await fileData.arrayBuffer();
    } else {
      throw new Error('Either resumeUrl or fileBase64 with fileName must be provided');
    }

    console.log('File ready, detecting type and extracting text...');

    // Check if it's a Word document
    if (fileName.endsWith('.docx') || fileName.endsWith('.doc')) {
      console.log('Processing Word document...');
      
      try {
        extractedText = await extractStructuredTextFromDocx(fileArrayBuffer);
        console.log('Extracted structured text from Word document, length:', extractedText.length);
      } catch (e) {
        console.error('Error processing Word document:', e);
        throw new Error('Failed to extract text from Word document');
      }
    } 
    // Check if it's a PDF
    else if (fileName.endsWith('.pdf')) {
      console.log('Processing PDF document...');
      
      const pdfData = new Uint8Array(fileArrayBuffer);
      
      try {
        // First, try standard text extraction
        extractedText = await extractTextFromPdf(pdfData);
        console.log('Extracted text from PDF, length:', extractedText.length);
        
        // Check if this looks like a scanned PDF or has ligature corruption
        if (isLikelyScannedPdf(extractedText) || hasLigatureCorruption(extractedText)) {
          console.log('PDF text unusable (scanned or ligature corruption), falling back to OCR...');
          extractedText = await extractTextWithOCR(pdfData, lovableApiKey);
          usedOcr = true;
        }
      } catch (e) {
        console.error('Error with standard PDF extraction, trying OCR:', e);
        
        // If standard extraction fails, try OCR as fallback
        try {
          extractedText = await extractTextWithOCR(pdfData, lovableApiKey);
          usedOcr = true;
        } catch (ocrError) {
          console.error('OCR also failed:', ocrError);
          throw new Error('Failed to extract text from PDF. Please paste the text manually.');
        }
      }
    }
    else {
      // Fallback for other formats
      console.log('Unsupported document format:', fileName);
      throw new Error('Only PDF, DOC, and DOCX files are supported. Please paste the text manually for other formats.');
    }

    console.log('Sending extracted text to AI for structuring...');

    // Enhanced AI prompt for better data extraction
    const systemPrompt = `You are an expert resume parser. Extract ALL information from the resume text into structured JSON format.

CRITICAL RULES:
1. Extract EVERY piece of information - do not skip any sections
2. Preserve dates, locations, and time periods exactly as written
3. For publications, extract title, publisher/platform, date, and URL (if present in markdown links)
4. For experience, include: company, position, location, start_date, end_date, and FULL description
5. For education, include: institution, degree, field, location, start_date, end_date, gpa, honors, thesis/dissertation, and academic achievements - extract ALL education entries including certifications and training programs
6. Extract academic honors like "Summa Cum Laude", "Magna Cum Laude", "Dean's List", etc.
7. Extract thesis or dissertation titles if mentioned
8. Identify academic achievements like scholarships, research grants, publications during studies, teaching assistant roles
9. Identify and extract: skills, certifications, projects, awards, languages, volunteer work, interests

SUMMARY FORMATTING:
- Convert bullet points to proper HTML format
- Split summary by bullet character (•) or newline-separated points
- Wrap multiple bullet points in <ul><li> tags
- Preserve the exact text of each bullet point
- Example: "• Point 1 • Point 2" becomes "<ul><li>Point 1</li><li>Point 2</li></ul>"
- If no bullets, wrap in <p> tags

EXPERIENCE DESCRIPTION FORMATTING:
- Detect and preserve nested bullet structures
- Main bullet points should have sub-points indented beneath them
- Convert to nested HTML <ul> lists when there are sub-bullets
- Main point format: "<li>Main point<ul><li>Sub-point 1</li><li>Sub-point 2</li></ul></li>"
- Look for patterns like "Point:" followed by sub-points
- Preserve exact text of each bullet and sub-bullet
- If no nesting, use flat <ul><li> structure

PUBLICATION EXTRACTION:
- Look for sections titled "Publications", "Articles", "Writing", "Papers"
- Extract URLs from markdown links: [Title](URL)
- Parse formats like "Title | Publisher • Date" or "Title - Publisher, Date"
- Capture all metadata: title, publisher, date, url

Return ONLY valid JSON with this structure:
{
  "full_name": "string",
  "email": "string",
  "phone": "string",
  "linkedin_url": "string",
  "website_url": "string",
  "location": "string",
  "summary": "string (HTML formatted with <ul><li> tags or <p> tags)",
  "skills": ["string"],
  "experience": [
    {
      "company": "string",
      "position": "string",
      "location": "string",
      "start_date": "string",
      "end_date": "string",
      "description": "string (HTML formatted with <ul><li> tags)"
    }
  ],
  "education": [
    {
      "institution": "string (school or university name)",
      "degree": "string (degree or certification name)",
      "field": "string (field of study)",
      "location": "string (city, country)",
      "start_date": "string (e.g., '2009' or 'Sept 2009')",
      "end_date": "string (e.g., '2011' or 'Present')",
      "gpa": "string (e.g., '3.8/4.0' or '17.5/20')",
      "honors": ["string (e.g., 'Summa Cum Laude', 'Dean's List')"],
      "thesis": "string (title of thesis or dissertation if mentioned)",
      "achievements": ["string (academic achievements like scholarships, grants, publications, teaching roles)"]
    }
  ],
  "certifications": [
    {
      "name": "string",
      "issuer": "string",
      "date": "string"
    }
  ],
  "publications": [
    {
      "title": "string",
      "publisher": "string",
      "date": "string",
      "url": "string (extract from markdown links or leave empty)"
    }
  ],
  "projects": [
    {
      "name": "string",
      "description": "string",
      "url": "string"
    }
  ],
  "awards": [
    {
      "title": "string",
      "issuer": "string",
      "date": "string"
    }
  ],
  "languages": [
    {
      "language": "string",
      "proficiency": "string"
    }
  ],
  "volunteer_work": [
    {
      "organization": "string",
      "role": "string",
      "start_date": "string",
      "end_date": "string",
      "description": "string"
    }
  ],
  "interests": ["string"],
  "additional_skills": ["string"]
}`;

    // Use AI to structure the extracted text
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: `Extract all information from this resume. Pay special attention to preserving structure, dates, locations, and URLs (especially in publications). Return structured JSON:\n\n${extractedText}`
          }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', errorText);
      throw new Error('Failed to parse resume with AI');
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content in AI response');
    }

    console.log('AI response received, parsing JSON...');

    // Parse the JSON response
    let extractedData;
    try {
      // Remove markdown code blocks if present
      const jsonText = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      extractedData = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      console.error('AI response content:', content);
      throw new Error('Failed to parse AI response as JSON');
    }

    // Save to user_profiles – merge with existing data from previous resumes
    if (resumeUrl) {
      // Fetch existing profile to merge
      const { data: existingProfile } = await supabase
        .from('user_profiles')
        .select('resume_text')
        .eq('user_id', user.id)
        .single();

      let mergedData = extractedData;

      if (existingProfile?.resume_text) {
        try {
          const existingData = JSON.parse(existingProfile.resume_text);
          console.log('Merging new resume data with existing profile...');

          // Use AI to intelligently merge the two resume datasets
          const mergeResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${lovableApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'google/gemini-2.5-flash',
              max_tokens: 6000,
              messages: [
                {
                  role: 'system',
                  content: `You are a resume data merger. You receive two JSON objects representing parsed resume data from the same person (different resume versions).

Your job is to produce ONE merged JSON object that is the BEST, most COMPLETE version by:
1. Keeping the most detailed/recent version of each field (name, email, phone, location, etc.)
2. MERGING experience entries – deduplicate by company+position, keep the most detailed description
3. MERGING education entries – deduplicate by institution+degree, keep the most complete info
4. MERGING skills – combine all unique skills without duplicates
5. MERGING certifications, publications, projects, awards, languages, volunteer work – deduplicate and keep the most complete entries
6. For the summary – pick the longer/more comprehensive version, or combine them if they cover different aspects
7. NEVER invent or hallucinate new information – only combine what exists

Return ONLY valid JSON with the same structure as the inputs. No markdown, no commentary.`
                },
                {
                  role: 'user',
                  content: `Existing profile data:\n${JSON.stringify(existingData)}\n\nNew resume data:\n${JSON.stringify(extractedData)}\n\nMerge these into one comprehensive profile.`
                }
              ],
            }),
          });

          if (mergeResponse.ok) {
            const mergeResult = await mergeResponse.json();
            const mergeContent = mergeResult.choices?.[0]?.message?.content;
            if (mergeContent) {
              const jsonText = mergeContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
              mergedData = JSON.parse(jsonText);
              console.log('Successfully merged resume data from multiple uploads');
            }
          } else {
            console.error('Merge AI call failed, using new data only');
          }
        } catch (mergeErr) {
          console.error('Error merging resume data, using new data:', mergeErr);
        }
      }

      const { error: upsertError } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: user.id,
          full_name: mergedData.full_name || null,
          email: mergedData.email || null,
          phone: mergedData.phone || null,
          linkedin_url: mergedData.linkedin_url || null,
          website_url: mergedData.website_url || null,
          location: mergedData.location || null,
          resume_text: JSON.stringify(mergedData),
        }, {
          onConflict: 'user_id'
        });

      if (upsertError) {
        console.error('Error upserting profile:', upsertError);
        throw new Error('Failed to save profile data');
      }

      console.log('Profile saved successfully (merged from all resumes)');
    }

    return new Response(
      JSON.stringify({
        success: true,
        profile: extractedData,
        text: extractedText, // Return the raw extracted text for custom resume uploads
        usedOcr, // Indicate if OCR was used for the UI progress stepper
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in parse-resume function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
