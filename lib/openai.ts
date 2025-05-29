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

// Helper function to calculate cosine similarity between two vectors
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  return dotProduct / (magnitudeA * magnitudeB);
}

// Cache for embeddings to avoid repeated API calls
const embeddingCache = new Map<string, number[]>();

async function getEmbedding(text: string): Promise<number[]> {
  // Check cache first
  if (embeddingCache.has(text)) {
    return embeddingCache.get(text)!;
  }

  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small", // Cost-effective embedding model
      input: text.substring(0, 8000), // Limit text length for API
    });

    const embedding = response.data[0].embedding;
    embeddingCache.set(text, embedding);
    return embedding;
  } catch (error) {
    console.error("Error getting embedding:", error);
    throw error;
  }
}

export async function answerQuestionWithAtomicNotes(
  question: string,
  atomicNotes: Array<{ id: string; content: string; globalNumber?: number }>
): Promise<{ answer: string; sourcedNotes: Array<{ id: string; content: string; globalNumber?: number }> }> {
  
  // Handle empty question
  if (!question.trim()) {
    return {
      answer: "I need a question to answer! Please type something and try again.",
      sourcedNotes: []
    };
  }

  // Handle no atomic notes
  if (atomicNotes.length === 0) {
    return {
      answer: "You don't have any atomic notes yet. Create some atomic notes first by splitting your regular notes into smaller, focused ideas, then ask me questions about them!",
      sourcedNotes: []
    };
  }

  // Check if API key is available
  if (!process.env.NEXT_PUBLIC_OPENAI_API_KEY) {
    return {
      answer: "OpenAI API key is not configured. I need access to OpenAI's services to search your notes and provide answers. Please check your API key configuration.",
      sourcedNotes: []
    };
  }

  try {
    // Get embedding for the question
    console.log("Getting embedding for question:", question);
    let questionEmbedding: number[];
    
    try {
      questionEmbedding = await getEmbedding(question);
    } catch (embeddingError) {
      console.error("Failed to get question embedding:", embeddingError);
      // Fall back to keyword-only search
      return await fallbackKeywordSearch(question, atomicNotes);
    }

    // Get embeddings for all atomic notes and calculate similarity
    console.log(`Processing ${atomicNotes.length} atomic notes for similarity...`);
    const notesWithSimilarity = await Promise.all(
      atomicNotes.map(async (note) => {
        try {
          const noteEmbedding = await getEmbedding(note.content);
          const similarity = cosineSimilarity(questionEmbedding, noteEmbedding);
          return { note, similarity };
        } catch (error) {
          console.error(`Error getting embedding for note ${note.id}:`, error);
          // Fallback to keyword matching for this note
          const questionWords = question.toLowerCase().split(/\s+/).filter(word => word.length > 2);
          const noteContent = note.content.toLowerCase();
          let keywordScore = 0;
          
          questionWords.forEach(word => {
            if (noteContent.includes(word)) {
              keywordScore += 0.1; // Low score as fallback
            }
          });
          
          return { note, similarity: keywordScore };
        }
      })
    );

    // Log similarity scores for debugging
    const sortedByScore = notesWithSimilarity.sort((a, b) => b.similarity - a.similarity);
    console.log("Top 5 similarity scores:", sortedByScore.slice(0, 5).map(n => ({ 
      content: n.note.content.substring(0, 50) + "...", 
      similarity: n.similarity 
    })));

    // Try different thresholds progressively
    let relevantNotes = sortedByScore
      .filter(result => result.similarity > 0.2) // Even lower threshold
      .slice(0, 12)
      .map(result => result.note);

    console.log(`Found ${relevantNotes.length} notes with similarity > 0.2`);

    // If still not enough, try even lower threshold
    if (relevantNotes.length < 2) {
      relevantNotes = sortedByScore
        .filter(result => result.similarity > 0.1)
        .slice(0, 12)
        .map(result => result.note);
      console.log(`Found ${relevantNotes.length} notes with similarity > 0.1`);
    }

    // If still not enough, take the top scoring notes regardless of threshold
    if (relevantNotes.length < 2) {
      relevantNotes = sortedByScore
        .slice(0, 8) // Take top 8 no matter what
        .map(result => result.note);
      console.log(`Taking top ${relevantNotes.length} notes regardless of score`);
    }

    // If semantic search doesn't find enough results, fall back to keyword matching
    if (relevantNotes.length < 3) {
      console.log("Semantic search found few results, adding keyword matches...");
      
      const keywordMatches = atomicNotes
        .filter(note => !relevantNotes.some(rNote => rNote.id === note.id)) // Don't duplicate
        .map(note => {
          let score = 0;
          const noteContent = note.content.toLowerCase();
          const questionWords = question.toLowerCase().split(/\s+/).filter(word => word.length > 2);
          
          questionWords.forEach(word => {
            if (noteContent.includes(word)) {
              score += word.length;
            }
          });
          
          return { note, score };
        })
        .filter(result => result.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 6)
        .map(result => result.note);
      
      console.log(`Adding ${keywordMatches.length} keyword matches`);
      relevantNotes.push(...keywordMatches);
    }

    console.log(`Final relevant notes count: ${relevantNotes.length}`);

    if (relevantNotes.length === 0) {
      // Provide detailed debugging info
      const maxSimilarity = Math.max(...sortedByScore.map(n => n.similarity));
      const hasKeywordMatches = atomicNotes.some(note => {
        const noteContent = note.content.toLowerCase();
        const questionWords = question.toLowerCase().split(/\s+/).filter(word => word.length > 2);
        return questionWords.some(word => noteContent.includes(word));
      });

      return {
        answer: `I couldn't find relevant atomic notes for your question. Here's what I found:

**Semantic Analysis:**
• Highest similarity score: ${maxSimilarity.toFixed(3)} (needs >0.1 to be useful)
• Your question: "${question}"
• Notes analyzed: ${atomicNotes.length}

**Keyword Analysis:**
• Found keyword matches: ${hasKeywordMatches ? 'Yes' : 'No'}

**Possible reasons:**
• The topic isn't covered in your atomic notes yet
• Your question uses very different language than your notes
• Your notes might be too general/abstract for this specific question

**Suggestions:**
• Try rephrasing with different words
• Create atomic notes on this topic first
• Break down your question into simpler parts`,
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

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are an intelligent assistant that answers questions based on a user's atomic notes collection. 

ANALYSIS FRAMEWORK - What can you answer?
Before responding, analyze what the question is asking for:

1. FACTUAL CLAIMS about specific people, organizations, or events:
   - Example: "What does Obama think about AI safety?"
   - Rule: ONLY if explicitly mentioned in notes. Otherwise, clearly state you don't have that information.

2. CONCEPTUAL EXPLANATIONS or educational requests:
   - Examples: "Explain X like I'm 5", "How does X work?", "What is the significance of Y?"
   - Rule: CAN answer if the atomic notes contain relevant concepts, even if not explicitly structured as an explanation.

3. RELATIONSHIP and CONNECTION questions:
   - Examples: "How does A relate to B?", "What leads to X?", "What are the implications of Y?"
   - Rule: CAN answer by synthesizing information from multiple notes that discuss related concepts.

4. SYNTHESIS and ANALYSIS questions:
   - Examples: "What are the main themes?", "What patterns emerge?", "What conclusions can be drawn?"
   - Rule: CAN answer by analyzing and connecting information across notes.

5. PERSONAL REFLECTION and SELF-ASSESSMENT questions:
   - Examples: "Am I being too harsh?", "What kind of person am I?", "Am I making good decisions?"
   - Rule: CAN answer by analyzing patterns in notes about the user's behavior, relationships, actions, feedback received, conflicts, decisions, etc. Present what the notes reveal and let the user draw conclusions.

ANSWER APPROACH:
- For Type 1 (Factual): Be strict - only answer if explicitly stated
- For Types 2-5 (Conceptual/Relational/Personal): You may synthesize and explain based on relevant concepts in the notes
- Always cite specific notes (AN-X format) that inform your response
- Be transparent about what you're doing: "Based on the patterns in your notes, I can see..." vs "Your notes specifically state..."
- For personal questions: Present evidence from the notes, avoid definitive judgments, encourage self-reflection

WHEN TO DECLINE:
- When asked about specific people/organizations not mentioned in notes
- When the question requires information completely absent from the note collection
- When the question asks for predictions or opinions not supported by the notes

CITATION RULES:
- ALWAYS cite specific atomic note references (AN-X format)
- Make citations natural: "According to AN-3..." or "As described in AN-7..."
- For synthesis answers, cite all relevant contributing notes

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
        return {
          answer: `I received an empty response from the AI service. This is unusual. Here's what I tried:

• Question: "${question}"
• Relevant notes found: ${relevantNotes.length}
• Context provided: ${context.length} characters

Please try rephrasing your question or contact support if this persists.`,
          sourcedNotes: relevantNotes
        };
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

    } catch (chatError) {
      console.error("Error with OpenAI chat completion:", chatError);
      return {
        answer: `I found ${relevantNotes.length} relevant notes for your question, but encountered an error while generating the response:

**Your question:** "${question}"
**Error:** ${chatError instanceof Error ? chatError.message : 'Unknown error'}

**The notes I found seem related to:**
${relevantNotes.slice(0, 3).map((note, i) => `${i + 1}. ${note.content.substring(0, 100)}...`).join('\n')}

Please try again, or try rephrasing your question.`,
        sourcedNotes: relevantNotes
      };
    }

  } catch (error) {
    console.error("Unexpected error in answerQuestionWithAtomicNotes:", error);
    return {
      answer: `Something unexpected went wrong while processing your question. Here's what I know:

**Your question:** "${question}"
**Atomic notes available:** ${atomicNotes.length}
**Error:** ${error instanceof Error ? error.message : 'Unknown error'}

This might be a temporary issue. Please try again, or try a simpler question to test if the service is working.`,
      sourcedNotes: []
    };
  }
}

// Fallback keyword search when embeddings fail
async function fallbackKeywordSearch(
  question: string, 
  atomicNotes: Array<{ id: string; content: string; globalNumber?: number }>
): Promise<{ answer: string; sourcedNotes: Array<{ id: string; content: string; globalNumber?: number }> }> {
  
  console.log("Using fallback keyword search");
  
  const questionWords = question.toLowerCase().split(/\s+/).filter(word => word.length > 2);
  
  const keywordMatches = atomicNotes
    .map(note => {
      let score = 0;
      const noteContent = note.content.toLowerCase();
      
      questionWords.forEach(word => {
        if (noteContent.includes(word)) {
          score += word.length;
        }
      });
      
      return { note, score };
    })
    .filter(result => result.score > 0)
    .sort((a, b) => b.score - a.score);

  if (keywordMatches.length === 0) {
    return {
      answer: `I couldn't find any notes matching your question using keyword search (semantic search failed). 

**Your question:** "${question}"
**Keywords I looked for:** ${questionWords.join(', ')}
**Notes searched:** ${atomicNotes.length}

Try using different words or create atomic notes on this topic first.`,
      sourcedNotes: []
    };
  }

  const relevantNotes = keywordMatches.slice(0, 8).map(result => result.note);
  
  return {
    answer: `I found some relevant notes using keyword search (note: semantic search is currently unavailable):

**Your question:** "${question}"
**Matching notes:** ${relevantNotes.length}

Based on keyword matches, here are the most relevant notes:
${relevantNotes.slice(0, 3).map((note) => {
  const refId = note.globalNumber ? `AN-${note.globalNumber}` : `Note-${note.id.slice(-4)}`;
  return `${refId}: ${note.content}`;
}).join('\n\n')}

For better results, please check your internet connection and try again.`,
    sourcedNotes: relevantNotes
  };
}
