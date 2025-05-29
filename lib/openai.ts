import OpenAI from "openai";

// For client-side usage, the API key needs to be prefixed with NEXT_PUBLIC_
const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true, // Required for client-side usage
});

export interface AtomicNote {
  title: string;
  content: string;
}

// Interface for OpenAI response items
interface OpenAIAtomicNoteResponse {
  content: string;
}

export interface TrainOfThought {
  theme: string;
  description: string;
  atomicNoteIds: string[];
  confidence: number;
}

export interface HubNoteAnalysis {
  trainsOfThought: TrainOfThought[];
  newThemes: TrainOfThought[];
  existingThemeUpdates: Array<{
    hubNoteId: string;
    newAtomicNoteIds: string[];
  }>;
}

export async function generateAtomicNotes(
  sourceContent: string
): Promise<AtomicNote[]> {
  console.log("generateAtomicNotes called with content length:", sourceContent.length);
  
  if (!sourceContent.trim()) {
    console.log("Empty content provided, returning empty array");
    return [];
  }

  // Check if API key is available
  if (!process.env.NEXT_PUBLIC_OPENAI_API_KEY) {
    console.log("OpenAI API key not found, falling back to regex-based splitting");
    const fallbackResult = fallbackSplitIntoAtomicNotes(sourceContent);
    console.log("Fallback produced", fallbackResult.length, "atomic notes");
    return fallbackResult;
  }

  console.log("Using OpenAI API to generate atomic notes");

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Using the more cost-effective model
      messages: [
        {
          role: "system",
          content: `You are an expert at breaking down complex or expressive content into atomic notes. Each atomic note should express exactly ONE meaningful idea or observation. The goal is to create a set of clear, self-contained notes that are useful for future thinking, writing, or linking.

General Rules:
1. Each atomic note = 1 big idea, quote, or insight.
2. Make each note self-contained — it must make sense on its own.
3. Use clear, concise language, but preserve depth and nuance.
4. Don't over-split concepts into overly granular fragments.
5. Return 1–8 atomic notes depending on the input's complexity and richness.

Special Rules for Literary or Poetic Input:
1. If the text is emotional, poetic, or ambiguous, prioritize preserving standout quotes or phrases as atomic notes.
2. You may also create a second note interpreting the quote if its meaning is not obvious.
3. Avoid flattening poetic language into generic summaries — preserve tone and voice when the expression is meaningful.
4. If a line has layered meaning, you can capture each interpretation as its own atomic note (up to 2–3 max).

IMPORTANT: Return ONLY a valid JSON array of objects with a "content" field. Do not wrap in markdown code blocks or add any other text. The content should be a complete, self-contained explanation of the idea.

Example format:
[
  {
    "content": "A full explanation, observation, or quote that stands alone"
  }
]`,
        },
        {
          role: "user",
          content: `Please break this content into atomic notes:\n\n${sourceContent}`,
        },
      ],
      temperature: 0.3, // Lower temperature for more consistent, focused output
      max_tokens: 2000,
    });

    console.log("OpenAI API response received");

    const result = response.choices[0]?.message?.content;
    if (!result) {
      throw new Error("No response from OpenAI");
    }

    // Clean the response - remove markdown code blocks if present
    let cleanedResult = result.trim();
    if (cleanedResult.startsWith("```json")) {
      cleanedResult = cleanedResult
        .replace(/^```json\s*/, "")
        .replace(/\s*```$/, "");
    } else if (cleanedResult.startsWith("```")) {
      cleanedResult = cleanedResult
        .replace(/^```\s*/, "")
        .replace(/\s*```$/, "");
    }

    console.log("Cleaned OpenAI response:", cleanedResult);

    // Parse the JSON response
    let rawResponse: OpenAIAtomicNoteResponse[];
    try {
      rawResponse = JSON.parse(cleanedResult) as OpenAIAtomicNoteResponse[];
    } catch (parseError) {
      console.error("Failed to parse OpenAI response as JSON:", cleanedResult);
      throw new Error(`Invalid JSON response from OpenAI: ${parseError}`);
    }

    // Validate the response structure
    if (!Array.isArray(rawResponse)) {
      throw new Error("Invalid response format from OpenAI");
    }

    console.log("Parsed OpenAI response, processing", rawResponse.length, "items");

    // Convert to AtomicNote format (adding empty title since the interface requires it)
    const atomicNotes: AtomicNote[] = rawResponse
      .map((item) => {
        if (!item || typeof item !== 'object' || !item.content) {
          return null;
        }

        return {
          title: "", // Empty title since we don't use it in the UI
          content: item.content.trim()
        };
      })
      .filter((note): note is AtomicNote => 
        note !== null && 
        note.content.length > 0
      );

    console.log("OpenAI API produced", atomicNotes.length, "valid atomic notes");
    return atomicNotes;
  } catch (error) {
    console.error("Error generating atomic notes:", error);

    // Fallback to the original regex-based splitting if OpenAI fails
    console.log("Falling back to regex-based splitting due to error");
    const fallbackResult = fallbackSplitIntoAtomicNotes(sourceContent);
    console.log("Fallback produced", fallbackResult.length, "atomic notes");
    return fallbackResult;
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
            const sentences = subsection
              .split(/(?<=[.!?])\s+/)
              .filter((s) => s.trim().length > 20);
            sentences.forEach((sentence) => {
              const trimmed = sentence.trim();
              if (trimmed) {
                sections.push({
                  title: "",
                  content: trimmed,
                });
              }
            });
          } else {
            sections.push({
              title: "",
              content: subsection,
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
          const listItems = trimmed.split(
            /\n(?=\s*(?:\d+\.\s+|\*\s+|\-\s+|•\s+))/
          );

          listItems.forEach((item) => {
            const itemTrimmed = item.trim();
            if (!itemTrimmed) return;

            sections.push({
              title: "",
              content: itemTrimmed,
            });
          });
        } else if (trimmed.length > 300) {
          // Split long paragraphs into sentences for atomicity
          const sentences = trimmed
            .split(/(?<=[.!?])\s+/)
            .filter((s) => s.trim().length > 20);

          if (sentences.length > 1) {
            sentences.forEach((sentence) => {
              const sentenceTrimmed = sentence.trim();
              if (sentenceTrimmed) {
                sections.push({
                  title: "",
                  content:
                    sentenceTrimmed +
                    (sentenceTrimmed.match(/[.!?]$/) ? "" : "."),
                });
              }
            });
          } else {
            // Single long sentence or paragraph
            sections.push({
              title: "",
              content: trimmed,
            });
          }
        } else {
          // Regular paragraph - keep as atomic unit
          sections.push({
            title: "",
            content: trimmed,
          });
        }
      }
    }
  }

  // If no sections were created, try to split by sentences or create multiple atomic notes
  if (sections.length === 0) {
    const sentences = content
      .split(/(?<=[.!?])\s+/)
      .filter((s) => s.trim().length > 10);

    if (sentences.length > 1) {
      sentences.forEach((sentence) => {
        const trimmed = sentence.trim();
        if (trimmed) {
          sections.push({
            title: "",
            content: trimmed + (trimmed.match(/[.!?]$/) ? "" : "."),
          });
        }
      });
    } else {
      // Even single content should become an atomic note
      sections.push({
        title: "",
        content: content.trim(),
      });
    }
  }

  return sections.filter((section) => section.content.trim().length > 0);
}

export async function analyzeAtomicNotesForHubNotes(
  atomicNotes: Array<{ id: string; content: string }>,
  existingHubNotes: Array<{ id: string; title: string; content: string }>
): Promise<HubNoteAnalysis> {
  if (!atomicNotes.length) {
    return {
      trainsOfThought: [],
      newThemes: [],
      existingThemeUpdates: [],
    };
  }

  // Check if API key is available
  if (!process.env.NEXT_PUBLIC_OPENAI_API_KEY) {
    console.warn("OpenAI API key not found, skipping hub note analysis");
    return {
      trainsOfThought: [],
      newThemes: [],
      existingThemeUpdates: [],
    };
  }

  try {
    const atomicNotesText = atomicNotes
      .map((note) => `[${note.id}] ${note.content}`)
      .join("\n\n");

    const existingHubNotesText =
      existingHubNotes.length > 0
        ? existingHubNotes
            .map(
              (hub) =>
                `Hub Note ID: ${hub.id}\nTitle: ${hub.title}\nContent: ${hub.content}`
            )
            .join("\n\n---\n\n")
        : "No existing hub notes.";

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an expert at identifying conceptual connections and trains of thought between atomic notes. Your job is to analyze atomic notes and determine:

1. What trains of thought (themes/concepts) exist among the atomic notes
2. Which existing hub notes should be updated with new atomic notes
3. What new hub notes should be created

Rules:
- A train of thought must connect at least 2 atomic notes
- Trains of thought should be meaningful conceptual connections, not superficial word matches
- Be conservative - only group notes that genuinely relate to the same concept/theme
- For existing hub notes, only suggest updates if the atomic notes genuinely fit the existing theme
- New themes should be distinct from existing hub note themes
- The description should explain what the train of thought is ABOUT, not just that notes are connected

IMPORTANT: Return ONLY a valid JSON object with this exact structure:
{
  "trainsOfThought": [
    {
      "theme": "Brief theme name (3-6 words)",
      "description": "One sentence explaining what this train of thought is about - the actual subject matter, concepts, or ideas being explored",
      "atomicNoteIds": ["id1", "id2", ...],
      "confidence": 0.8
    }
  ],
  "newThemes": [
    {
      "theme": "Theme name for new hub note",
      "description": "One sentence explaining what this topic/train of thought is about - focus on the subject matter and key concepts",
      "atomicNoteIds": ["id1", "id2", ...],
      "confidence": 0.9
    }
  ],
  "existingThemeUpdates": [
    {
      "hubNoteId": "existing-hub-id",
      "newAtomicNoteIds": ["id1", "id2"]
    }
  ]
}

Confidence should be 0.7-1.0 (only suggest connections you're confident about).
The description should focus on WHAT the topic is about, not HOW the notes are connected.`,
        },
        {
          role: "user",
          content: `Analyze these atomic notes for trains of thought:

ATOMIC NOTES:
${atomicNotesText}

EXISTING HUB NOTES:
${existingHubNotesText}

Please identify trains of thought and suggest hub note updates/creations.`,
        },
      ],
      temperature: 0.2,
      max_tokens: 2000,
    });

    const result = response.choices[0]?.message?.content;
    if (!result) {
      throw new Error("No response from OpenAI");
    }

    // Clean the response
    let cleanedResult = result.trim();
    if (cleanedResult.startsWith("```json")) {
      cleanedResult = cleanedResult
        .replace(/^```json\s*/, "")
        .replace(/\s*```$/, "");
    } else if (cleanedResult.startsWith("```")) {
      cleanedResult = cleanedResult
        .replace(/^```\s*/, "")
        .replace(/\s*```$/, "");
    }

    // Parse the JSON response
    let analysis: HubNoteAnalysis;
    try {
      analysis = JSON.parse(cleanedResult) as HubNoteAnalysis;
    } catch (parseError) {
      console.error("Failed to parse OpenAI hub note analysis:", cleanedResult);
      throw new Error(`Invalid JSON response from OpenAI: ${parseError}`);
    }

    // Validate the response structure
    if (
      !analysis.trainsOfThought ||
      !analysis.newThemes ||
      !analysis.existingThemeUpdates
    ) {
      throw new Error("Invalid response format from OpenAI");
    }

    // Filter out low-confidence suggestions and validate structure
    analysis.newThemes = analysis.newThemes.filter(
      (theme) =>
        theme &&
        theme.confidence >= 0.7 &&
        theme.atomicNoteIds &&
        theme.atomicNoteIds.length >= 2 &&
        typeof theme.theme === "string" &&
        typeof theme.description === "string"
    );

    analysis.existingThemeUpdates = analysis.existingThemeUpdates.filter(
      (update) =>
        update &&
        update.hubNoteId &&
        update.newAtomicNoteIds &&
        update.newAtomicNoteIds.length > 0
    );

    return analysis;
  } catch (error) {
    console.error("Error analyzing atomic notes for hub notes:", error);
    return {
      trainsOfThought: [],
      newThemes: [],
      existingThemeUpdates: [],
    };
  }
}

export async function generateHubNoteContent(
  atomicNotes: Array<{ content: string }>
): Promise<{ title: string; description: string }> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an expert at creating concise hub notes that connect related ideas. Given a collection of atomic notes, generate a title and one-line description that captures the central theme or concept connecting these ideas.

The output should be:
- Title: Concise (2-6 words), descriptive of the main theme
- Description: One sentence (15-25 words) explaining what this topic is about

Return ONLY a valid JSON object with this exact structure:
{
  "title": "Brief Theme Title",
  "description": "One sentence describing what this topic explores or connects."
}

Focus on the conceptual connections and overarching themes, not just listing what the notes contain.`,
        },
        {
          role: "user",
          content: `Generate a title and description for a hub note that connects these atomic notes:

${atomicNotes
  .map((note, index) => `${index + 1}. ${note.content}`)
  .join("\n\n")}

Please identify the central theme and create a hub note title and description.`,
        },
      ],
      temperature: 0.7,
      max_tokens: 150,
    });

    const result = response.choices[0]?.message?.content?.trim();

    if (!result) {
      throw new Error("No response generated");
    }

    // Clean the response - remove markdown code blocks if present
    let cleanedResult = result;
    if (cleanedResult.startsWith("```json")) {
      cleanedResult = cleanedResult
        .replace(/^```json\s*/, "")
        .replace(/\s*```$/, "");
    } else if (cleanedResult.startsWith("```")) {
      cleanedResult = cleanedResult
        .replace(/^```\s*/, "")
        .replace(/\s*```$/, "");
    }

    // Parse the JSON response
    let hubContent: { title: string; description: string };
    try {
      hubContent = JSON.parse(cleanedResult);
    } catch (parseError) {
      console.error("Failed to parse OpenAI hub note response:", cleanedResult);
      throw new Error(`Invalid JSON response: ${parseError}`);
    }

    // Validate the response structure
    if (!hubContent.title || !hubContent.description) {
      throw new Error("Invalid response format from OpenAI");
    }

    return hubContent;
  } catch (error) {
    console.error("Error generating hub note content:", error);
    // Fallback to generic content
    return {
      title: `Topic - ${new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })}`,
      description: `This hub note connects ${atomicNotes.length} related atomic notes. Review the linked notes to identify common themes and patterns.`,
    };
  }
}

export async function generateStructureNoteTitle(
  atomicNotes: Array<{ content: string }>
): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an expert at creating concise, descriptive titles for academic and professional writing. 

Given a collection of atomic notes (small, focused ideas), generate a clear, engaging title that captures the main theme or concept that connects these ideas.

The title should be:
- Concise (3-8 words)
- Descriptive of the main theme
- Professional/academic in tone
- Suitable for a blog post, article, or book chapter

Return only the title, nothing else.`,
        },
        {
          role: "user",
          content: `Generate a title for a structure note that synthesizes these atomic notes:

${atomicNotes
  .map((note, index) => `${index + 1}. ${note.content}`)
  .join("\n\n")}

Title:`,
        },
      ],
      temperature: 0.7,
      max_tokens: 50,
    });

    const title = response.choices[0]?.message?.content?.trim();

    if (!title) {
      throw new Error("No title generated");
    }

    return title;
  } catch (error) {
    console.error("Error generating structure note title:", error);
    // Fallback to a generic title
    return `Structure Note - ${new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })}`;
  }
}

export async function generateTermDefinition(
  term: string,
  context?: string
): Promise<{ title: string; content: string } | null> {
  console.log("generateTermDefinition called with:", { term, contextLength: context?.length || 0 });
  
  if (!term.trim()) {
    console.log("Empty term provided, returning null");
    return null;
  }

  // Check if API key is available
  if (!process.env.NEXT_PUBLIC_OPENAI_API_KEY) {
    console.log("OpenAI API key not found, cannot generate definition");
    return null;
  }

  console.log("API key found, proceeding with OpenAI call");

  try {
    const contextPrompt = context 
      ? `The term appears in this context: "${context}"\n\n`
      : "";

    console.log("Making OpenAI API call for term definition");

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an expert at creating clear, concise definitions for terms, concepts, jargon, and technical vocabulary. Your goal is to make complex ideas accessible while maintaining accuracy.

Rules:
1. Create a short, descriptive title (2-6 words) that captures the essence of the term
2. Write a clear, self-contained definition that explains what the term means
3. If it's technical jargon, explain it in plain language
4. If context is provided, tailor the definition to that specific usage
5. Keep the definition concise but comprehensive (1-3 sentences)
6. Make it understandable to someone not familiar with the field

Return ONLY a valid JSON object with this exact structure:
{
  "title": "Short descriptive title",
  "content": "Clear, comprehensive definition of the term that stands alone and makes sense to someone unfamiliar with the concept."
}`
        },
        {
          role: "user",
          content: `${contextPrompt}Please define this term: "${term}"`
        }
      ],
      temperature: 0.3,
      max_tokens: 300,
    });

    console.log("OpenAI API call completed successfully");

    const result = response.choices[0]?.message?.content?.trim();

    if (!result) {
      console.log("No response content from OpenAI");
      throw new Error("No response generated");
    }

    console.log("Raw OpenAI response:", result);

    // Clean the response - remove markdown code blocks if present
    let cleanedResult = result;
    if (cleanedResult.startsWith("```json")) {
      cleanedResult = cleanedResult
        .replace(/^```json\s*/, "")
        .replace(/\s*```$/, "");
    } else if (cleanedResult.startsWith("```")) {
      cleanedResult = cleanedResult
        .replace(/^```\s*/, "")
        .replace(/\s*```$/, "");
    }

    console.log("Cleaned response:", cleanedResult);

    // Parse the JSON response
    let definition: { title: string; content: string };
    try {
      definition = JSON.parse(cleanedResult);
      console.log("Successfully parsed JSON:", definition);
    } catch (parseError) {
      console.error("Failed to parse OpenAI definition response:", cleanedResult);
      throw new Error(`Invalid JSON response: ${parseError}`);
    }

    // Validate the response structure
    if (!definition.title || !definition.content) {
      console.log("Invalid response structure:", definition);
      throw new Error("Invalid response format from OpenAI");
    }

    const finalResult = {
      title: definition.title.trim(),
      content: definition.content.trim()
    };
    
    console.log("Returning final definition:", finalResult);
    return finalResult;
  } catch (error) {
    console.error("Error generating term definition:", error);
    return null;
  }
}

export async function answerQuestionWithAtomicNotes(
  question: string,
  atomicNotes: Array<{ id: string; content: string; globalNumber?: number }>
): Promise<{ answer: string; sourcedNotes: Array<{ id: string; content: string; globalNumber?: number }> } | null> {
  if (!question.trim() || atomicNotes.length === 0) {
    return null;
  }

  // Check if API key is available
  if (!process.env.NEXT_PUBLIC_OPENAI_API_KEY) {
    console.warn("OpenAI API key not found, cannot answer question");
    return null;
  }

  try {
    // First, find the most relevant atomic notes using embedding similarity
    // For now, we'll use a simpler keyword-based relevance scoring
    const relevantNotes = atomicNotes
      .map(note => {
        let score = 0;
        const noteContent = note.content.toLowerCase();
        const questionWords = question.toLowerCase().split(/\s+/).filter(word => word.length > 2);
        
        // Score based on keyword matches
        questionWords.forEach(word => {
          if (noteContent.includes(word)) {
            score += word.length; // Longer words get higher scores
            
            // Bonus for word boundary matches
            const wordBoundaryRegex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i');
            if (wordBoundaryRegex.test(note.content)) {
              score += 5;
            }
          }
        });
        
        return { note, score };
      })
      .filter(result => result.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8) // Take top 8 most relevant notes
      .map(result => result.note);

    if (relevantNotes.length === 0) {
      return {
        answer: "I couldn't find any atomic notes that seem relevant to your question. Try rephrasing your question or creating atomic notes on this topic first.",
        sourcedNotes: []
      };
    }

    // Generate context from relevant notes
    const context = relevantNotes
      .map(note => {
        const refId = note.globalNumber ? `AN-${note.globalNumber}` : `Note-${note.id.slice(-4)}`;
        return `[${refId}] ${note.content}`;
      })
      .join('\n\n');

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an intelligent assistant that answers questions based on a user's atomic notes collection. 

CRITICAL GUIDELINES:
1. ONLY answer based on information explicitly present in the provided atomic notes
2. If the notes do not contain information to answer the question, be honest about it
3. Do NOT make assumptions or infer information not directly stated in the notes
4. Do NOT hallucinate or create information not found in the notes

ANSWER FORMAT:
- If notes CAN answer the question: Provide the answer with citations (AN-X format)
- If notes CANNOT answer the question: Use this exact format:
  "You do not have a note that can help answer that question. However, according to related notes, [provide a brief one-line summary of the most relevant information from the notes, if any]."

CITATION RULES:
- ALWAYS cite specific atomic note references (like AN-1, AN-5) when making claims
- Use the exact reference format: AN-X where X is the number
- If multiple notes support a point, cite all relevant ones
- Make citations natural in the text like: "According to AN-3, machine learning requires..."

STRICT REQUIREMENTS:
- Never answer about groups, people, or entities not explicitly mentioned in the notes
- Never extrapolate beyond what the notes actually say
- If asked about "what [specific group] says" and that group isn't mentioned, say you don't have that information
- Be precise about what the notes do and don't contain

The atomic notes are prefixed with their reference numbers in [brackets].`
        },
        {
          role: "user",
          content: `Question: ${question}

Relevant atomic notes:
${context}

Please answer the question based on these atomic notes, citing the specific note references (AN-X) where you found the information.`
        }
      ],
      temperature: 0.3,
      max_tokens: 800,
    });

    const answer = response.choices[0]?.message?.content?.trim();

    if (!answer) {
      throw new Error("No response generated");
    }

    // Extract cited note references from the answer
    const citedReferences: string[] = answer.match(/AN-\d+/g) || [];
    
    // Filter source notes to only include those that were actually cited
    const actuallySourcedNotes = relevantNotes.filter(note => {
      const refId = note.globalNumber ? `AN-${note.globalNumber}` : `Note-${note.id.slice(-4)}`;
      return citedReferences.includes(refId);
    });

    return {
      answer,
      sourcedNotes: actuallySourcedNotes
    };
  } catch (error) {
    console.error("Error answering question with atomic notes:", error);
    return null;
  }
}
