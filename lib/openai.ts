import OpenAI from 'openai';

// For client-side usage, the API key needs to be prefixed with NEXT_PUBLIC_
const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true // Required for client-side usage
});

export interface AtomicNote {
  title: string;
  content: string;
}

export async function generateAtomicNotes(sourceContent: string): Promise<AtomicNote[]> {
  if (!sourceContent.trim()) {
    return [];
  }

  // Check if API key is available
  if (!process.env.NEXT_PUBLIC_OPENAI_API_KEY) {
    console.warn('OpenAI API key not found, falling back to regex-based splitting');
    return fallbackSplitIntoAtomicNotes(sourceContent);
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Using the more cost-effective model
      messages: [
        {
          role: "system",
          content: `You are an expert at breaking down complex content into atomic notes. Each atomic note should contain exactly ONE big idea that stands alone and is self-contained.

Rules:
1. Each atomic note = 1 big idea only
2. Make each note self-contained (can be understood without context)
3. Preserve the original meaning and important details
4. Use clear, concise language
5. Don't create notes that are too granular (avoid splitting single concepts)
6. Aim for 3-8 atomic notes depending on content complexity

IMPORTANT: Return ONLY a valid JSON array of objects with "title" and "content" fields. Do not wrap in markdown code blocks or add any other text. The title should be a brief, descriptive phrase (3-6 words). The content should be a complete, self-contained explanation of the idea.

Example format:
[
  {
    "title": "Key Concept Name",
    "content": "Complete explanation of the concept that stands alone and can be understood without additional context."
  }
]`
        },
        {
          role: "user",
          content: `Please break this content into atomic notes:\n\n${sourceContent}`
        }
      ],
      temperature: 0.3, // Lower temperature for more consistent, focused output
      max_tokens: 2000,
    });

    const result = response.choices[0]?.message?.content;
    if (!result) {
      throw new Error('No response from OpenAI');
    }

    // Clean the response - remove markdown code blocks if present
    let cleanedResult = result.trim();
    if (cleanedResult.startsWith('```json')) {
      cleanedResult = cleanedResult.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanedResult.startsWith('```')) {
      cleanedResult = cleanedResult.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    // Parse the JSON response
    let atomicNotes: AtomicNote[];
    try {
      atomicNotes = JSON.parse(cleanedResult) as AtomicNote[];
    } catch (parseError) {
      console.error('Failed to parse OpenAI response as JSON:', cleanedResult);
      throw new Error(`Invalid JSON response from OpenAI: ${parseError}`);
    }
    
    // Validate the response structure
    if (!Array.isArray(atomicNotes)) {
      throw new Error('Invalid response format from OpenAI');
    }

    // Filter out any invalid notes and ensure they have both title and content
    return atomicNotes.filter(note => 
      note && 
      typeof note.title === 'string' && 
      typeof note.content === 'string' &&
      note.title.trim().length > 0 &&
      note.content.trim().length > 0
    );

  } catch (error) {
    console.error('Error generating atomic notes:', error);
    
    // Fallback to the original regex-based splitting if OpenAI fails
    return fallbackSplitIntoAtomicNotes(sourceContent);
  }
}

// Fallback function using the original logic
function fallbackSplitIntoAtomicNotes(content: string): AtomicNote[] {
  if (!content.trim()) {
    return [];
  }

  const sections: AtomicNote[] = [];
  
  // Split by headings first (# ## ### etc.)
  const headingSections = content.split(/(?=^#{1,6}\s+)/m);
  
  for (const section of headingSections) {
    if (!section.trim()) continue;
    
    // Check if this section starts with a heading
    const headingMatch = section.match(/^(#{1,6})\s+(.+?)(?:\n|$)/);
    
    if (headingMatch) {
      const remainingContent = section.substring(headingMatch[0].length).trim();
      
      if (remainingContent) {
        // Split content under heading more aggressively for atomic notes
        const subsections = remainingContent.split(/\n\s*\n+/);
        
        for (let i = 0; i < subsections.length; i++) {
          const subsection = subsections[i].trim();
          if (!subsection) continue;
          
          // Further split each subsection by sentences if it's long
          if (subsection.length > 200) {
            const sentences = subsection.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 20);
            sentences.forEach((sentence) => {
              const trimmed = sentence.trim();
              if (trimmed) {
                sections.push({
                  title: "", // No title for atomic notes
                  content: trimmed
                });
              }
            });
          } else {
            sections.push({
              title: "", // No title for atomic notes
              content: subsection
            });
          }
        }
      }
    } else {
      // No heading, split by multiple criteria for maximum atomicity
      const paragraphs = section.split(/\n\s*\n+/);
      
      for (const paragraph of paragraphs) {
        const trimmed = paragraph.trim();
        if (!trimmed) continue;
        
        // Check if this is a list section
        const listMatch = trimmed.match(/^(?:\d+\.\s+|\*\s+|\-\s+|•\s+)/);
        
        if (listMatch) {
          // Split lists into individual items for true atomicity
          const listItems = trimmed.split(/\n(?=\s*(?:\d+\.\s+|\*\s+|\-\s+|•\s+))/);
          
          listItems.forEach((item) => {
            const itemTrimmed = item.trim();
            if (!itemTrimmed) return;
            
            sections.push({
              title: "", // No title for atomic notes
              content: itemTrimmed
            });
          });
        } else if (trimmed.length > 300) {
          // Split long paragraphs into sentences for atomicity
          const sentences = trimmed.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 20);
          
          if (sentences.length > 1) {
            sentences.forEach((sentence) => {
              const sentenceTrimmed = sentence.trim();
              if (sentenceTrimmed) {
                sections.push({
                  title: "", // No title for atomic notes
                  content: sentenceTrimmed + (sentenceTrimmed.match(/[.!?]$/) ? "" : ".")
                });
              }
            });
          } else {
            // Single long sentence or paragraph
            sections.push({
              title: "", // No title for atomic notes
              content: trimmed
            });
          }
        } else {
          // Regular paragraph - keep as atomic unit
          sections.push({
            title: "", // No title for atomic notes
            content: trimmed
          });
        }
      }
    }
  }
  
  // If no sections were created, try to split by sentences or create multiple atomic notes
  if (sections.length === 0) {
    const sentences = content.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 10);
    
    if (sentences.length > 1) {
      sentences.forEach((sentence) => {
        const trimmed = sentence.trim();
        if (trimmed) {
          sections.push({
            title: "", // No title for atomic notes
            content: trimmed + (trimmed.match(/[.!?]$/) ? "" : ".")
          });
        }
      });
    } else {
      // Even single content should become an atomic note
      sections.push({
        title: "", // No title for atomic notes
        content: content.trim()
      });
    }
  }
  
  return sections.filter(section => section.content.trim().length > 0);
} 