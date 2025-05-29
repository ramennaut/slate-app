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
  if (!term.trim()) {
    return null;
  }

  // Check if API key is available
  if (!process.env.NEXT_PUBLIC_OPENAI_API_KEY) {
    console.log("OpenAI API key not found, cannot generate definition");
    return null;
  }

  try {
    const contextPrompt = context 
      ? `The term appears in this context: "${context}"\n\n`
      : "";

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
    let definition: { title: string; content: string };
    try {
      definition = JSON.parse(cleanedResult);
    } catch (parseError) {
      console.error("Failed to parse OpenAI definition response:", cleanedResult);
      throw new Error(`Invalid JSON response: ${parseError}`);
    }

    // Validate the response structure
    if (!definition.title || !definition.content) {
      throw new Error("Invalid response format from OpenAI");
    }

    return {
      title: definition.title.trim(),
      content: definition.content.trim()
    };
  } catch (error) {
    console.error("Error generating term definition:", error);
    return null;
  }
}
