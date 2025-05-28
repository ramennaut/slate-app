import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function splitIntoAtomicNotes(content: string): Array<{ title: string; content: string }> {
  if (!content.trim()) {
    return [];
  }

  const sections: Array<{ title: string; content: string }> = [];
  
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
