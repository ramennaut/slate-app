"use client";

import { Note } from "@/lib/types";
import { Button } from "./ui/button";
import { ExternalLink } from "lucide-react";

interface NoteContentRendererProps {
  content: string;
  notes: Note[];
  onSelectNote: (note: Note) => void;
  className?: string;
  linksOnly?: boolean;
}

export default function NoteContentRenderer({
  content,
  notes,
  onSelectNote,
  className = "",
  linksOnly = false
}: NoteContentRendererProps) {
  // Parse content and replace atomic note links with clickable elements
  const parseContent = (text: string) => {
    const parts = [];
    let lastIndex = 0;
    
    // Regex to match [text](atomic-note:id) format
    const linkRegex = /\[([^\]]+)\]\(atomic-note:([^)]+)\)/g;
    let match;
    
    // If linksOnly mode, collect all links and render them as a list
    if (linksOnly) {
      const links = [];
      while ((match = linkRegex.exec(text)) !== null) {
        const linkText = match[1];
        const noteId = match[2];
        const targetNote = notes.find(note => note.id === noteId);
        
        if (targetNote) {
          links.push(
            <button
              key={`link-${match.index}`}
              onClick={() => onSelectNote(targetNote)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 hover:bg-primary/20 text-primary hover:text-primary/90 text-xs font-medium rounded-full border border-primary/20 hover:border-primary/30 transition-all duration-200 cursor-pointer"
            >
              <ExternalLink className="h-3 w-3" />
              {linkText}
            </button>
          );
        }
      }
      
      if (links.length > 0) {
        return [
          <div key="links-header" className="text-xs font-medium text-muted-foreground mb-3">
            Referenced Atomic Notes:
          </div>,
          <div key="links-container" className="flex flex-wrap gap-2">
            {links}
          </div>
        ];
      }
      return [];
    }
    
    // Regular mode - render full content with inline links
    while ((match = linkRegex.exec(text)) !== null) {
      // Add text before the link
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index));
      }
      
      const linkText = match[1];
      const noteId = match[2];
      const targetNote = notes.find(note => note.id === noteId);
      
      if (targetNote) {
        parts.push(
          <Button
            key={`link-${match.index}`}
            variant="link"
            size="sm"
            className="h-auto p-0 text-primary hover:text-primary/80 underline font-normal inline"
            onClick={() => onSelectNote(targetNote)}
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            {linkText}
          </Button>
        );
      } else {
        // If note not found, render as plain text
        parts.push(`[${linkText}](note not found)`);
      }
      
      lastIndex = linkRegex.lastIndex;
    }
    
    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }
    
    return parts;
  };

  const renderedContent = parseContent(content);

  return (
    <div className={className}>
      {renderedContent.map((part, index) => (
        typeof part === 'string' ? (
          <span key={index} style={{ whiteSpace: 'pre-wrap' }}>
            {part}
          </span>
        ) : (
          part
        )
      ))}
    </div>
  );
} 