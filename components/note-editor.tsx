"use client";

import { Note } from "@/lib/types";
import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "./ui/button";
import { Save, Check } from "lucide-react";

interface NoteEditorProps {
  note: Note;
  onSave: (note: Note) => void;
}

export default function NoteEditor({
  note,
  onSave,
}: NoteEditorProps) {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef({ title: note.title, content: note.content });
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isInitialMountRef = useRef(true);
  const isAutoConvertingRef = useRef(false);

  // Update local state when note prop changes (when switching notes)
  useEffect(() => {
    setTitle(note.title);
    setContent(note.content);
    lastSavedRef.current = { title: note.title, content: note.content };
    setSaveStatus('idle');
    isInitialMountRef.current = true;
  }, [note.id, note.title, note.content]); // Dependencies: note properties

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = e.currentTarget;
      const cursorPosition = textarea.selectionStart;
      const selectionEnd = textarea.selectionEnd;
      
      if (e.shiftKey) {
        // Shift+Tab: Remove indentation
        const textBeforeCursor = content.substring(0, cursorPosition);
        const textAfterCursor = content.substring(selectionEnd);
        
        // Find the current line start
        const lines = textBeforeCursor.split('\n');
        const currentLineIndex = lines.length - 1;
        const currentLine = lines[currentLineIndex];
        
        // Check if the line starts with spaces and remove up to 4 spaces
        if (currentLine.startsWith('    ')) {
          // Remove 4 spaces
          lines[currentLineIndex] = currentLine.substring(4);
          const newContent = lines.join('\n') + textAfterCursor;
          setContent(newContent);
          
          // Set cursor position (move back by 4 spaces)
          setTimeout(() => {
            if (textareaRef.current) {
              const newPosition = Math.max(0, cursorPosition - 4);
              textareaRef.current.setSelectionRange(newPosition, newPosition);
            }
          }, 0);
        } else if (currentLine.startsWith('   ')) {
          // Remove 3 spaces
          lines[currentLineIndex] = currentLine.substring(3);
          const newContent = lines.join('\n') + textAfterCursor;
          setContent(newContent);
          
          // Set cursor position (move back by 3 spaces)
          setTimeout(() => {
            if (textareaRef.current) {
              const newPosition = Math.max(0, cursorPosition - 3);
              textareaRef.current.setSelectionRange(newPosition, newPosition);
            }
          }, 0);
        } else if (currentLine.startsWith('  ')) {
          // Remove 2 spaces
          lines[currentLineIndex] = currentLine.substring(2);
          const newContent = lines.join('\n') + textAfterCursor;
          setContent(newContent);
          
          // Set cursor position (move back by 2 spaces)
          setTimeout(() => {
            if (textareaRef.current) {
              const newPosition = Math.max(0, cursorPosition - 2);
              textareaRef.current.setSelectionRange(newPosition, newPosition);
            }
          }, 0);
        } else if (currentLine.startsWith(' ')) {
          // Remove 1 space
          lines[currentLineIndex] = currentLine.substring(1);
          const newContent = lines.join('\n') + textAfterCursor;
          setContent(newContent);
          
          // Set cursor position (move back by 1 space)
          setTimeout(() => {
            if (textareaRef.current) {
              const newPosition = Math.max(0, cursorPosition - 1);
              textareaRef.current.setSelectionRange(newPosition, newPosition);
            }
          }, 0);
        }
      } else {
        // Tab: Add indentation
        const textBeforeCursor = content.substring(0, cursorPosition);
        const textAfterCursor = content.substring(selectionEnd);
        
        // Find the current line
        const lines = textBeforeCursor.split('\n');
        const currentLineIndex = lines.length - 1;
        const currentLine = lines[currentLineIndex];
        
        // Check if current line is a bullet point or numbered list
        const bulletMatch = currentLine.match(/^(\s*)• (.*)$/);
        const numberedMatch = currentLine.match(/^(\s*)(\d+)\. (.*)$/);
        
        if (bulletMatch || numberedMatch) {
          if (numberedMatch) {
            // For numbered lists: indent and reset to "1."
            const indent = numberedMatch[1];
            const numberedText = numberedMatch[3];
            lines[currentLineIndex] = '    ' + indent + '1. ' + numberedText;
            
            // Renumber all subsequent items at the same original indentation level
            const originalIndent = indent;
            for (let i = currentLineIndex + 1; i < lines.length; i++) {
              const line = lines[i];
              const match = line.match(/^(\s*)(\d+)\. (.*)$/);
              if (match && match[1] === originalIndent) {
                // This is a numbered item at the same original level - renumber it
                const currentNum = parseInt(match[2]);
                const newNum = currentNum - 1; // Decrease by 1 since we moved one item to nested level
                if (newNum > 0) {
                  lines[i] = match[1] + newNum + '. ' + match[3];
                }
              } else if (match && match[1].length < originalIndent.length) {
                // Hit a less indented item, stop renumbering
                break;
              }
            }
          } else if (bulletMatch) {
            // For bullet points: just indent the entire line
            lines[currentLineIndex] = '    ' + currentLine;
          }
          
          const newContent = lines.join('\n') + textAfterCursor;
          setContent(newContent);
          
          // Set cursor position (move forward by 4 spaces)
          setTimeout(() => {
            if (textareaRef.current) {
              const newPosition = cursorPosition + 4;
              textareaRef.current.setSelectionRange(newPosition, newPosition);
            }
          }, 0);
        } else {
          // Regular tab: Add indentation (4 spaces) at cursor position
          const newContent = textBeforeCursor + '    ' + textAfterCursor;
          setContent(newContent);
          
          // Set cursor position after the inserted spaces
          setTimeout(() => {
            if (textareaRef.current) {
              const newPosition = cursorPosition + 4;
              textareaRef.current.setSelectionRange(newPosition, newPosition);
            }
          }, 0);
        }
      }
    } else if (e.key === 'Backspace') {
      const textarea = e.currentTarget;
      const cursorPosition = textarea.selectionStart;
      const selectionEnd = textarea.selectionEnd;
      
      // Only handle if there's no text selection (cursor is just positioned)
      if (cursorPosition === selectionEnd) {
        const textBeforeCursor = content.substring(0, cursorPosition);
        const textAfterCursor = content.substring(cursorPosition);
        
        // Find the current line
        const lines = textBeforeCursor.split('\n');
        const currentLineIndex = lines.length - 1;
        const currentLine = lines[currentLineIndex];
        
        // Check if cursor is positioned right after leading spaces
        const leadingSpacesMatch = currentLine.match(/^(\s*)/);
        const leadingSpaces = leadingSpacesMatch ? leadingSpacesMatch[1] : '';
        const cursorPositionInLine = cursorPosition - (textBeforeCursor.length - currentLine.length);
        
        // If cursor is right after leading spaces (and there are spaces to remove)
        if (cursorPositionInLine === leadingSpaces.length && leadingSpaces.length > 0) {
          e.preventDefault();
          
          // Remove up to 4 spaces, but not more than what's available
          const spacesToRemove = Math.min(4, leadingSpaces.length);
          const newLine = currentLine.substring(spacesToRemove);
          lines[currentLineIndex] = newLine;
          
          const newContent = lines.join('\n') + textAfterCursor;
          setContent(newContent);
          
          // Set cursor position (move back by the number of spaces removed)
          setTimeout(() => {
            if (textareaRef.current) {
              const newPosition = Math.max(0, cursorPosition - spacesToRemove);
              textareaRef.current.setSelectionRange(newPosition, newPosition);
            }
          }, 0);
        }
      }
    } else if (e.key === 'Enter') {
      const textarea = e.currentTarget;
      const cursorPosition = textarea.selectionStart;
      const textBeforeCursor = content.substring(0, cursorPosition);
      const textAfterCursor = content.substring(cursorPosition);
      
      // Find the current line
      const lines = textBeforeCursor.split('\n');
      const currentLine = lines[lines.length - 1];
      
      // Check if current line is a bullet point
      const bulletMatch = currentLine.match(/^(\s*)• (.*)$/);
      
      // Check if current line is a numbered list item
      const numberedMatch = currentLine.match(/^(\s*)(\d+)\. (.*)$/);
      
      if (bulletMatch) {
        e.preventDefault();
        const indent = bulletMatch[1];
        const bulletText = bulletMatch[2];
        
        // If the bullet point is empty, remove it and exit bullet mode
        if (bulletText.trim() === '') {
          const newContent = textBeforeCursor.replace(/\n\s*• $/, '\n') + textAfterCursor;
          setContent(newContent);
          
          // Set cursor position
          setTimeout(() => {
            if (textareaRef.current) {
              const newPosition = cursorPosition - (indent.length + 2);
              textareaRef.current.setSelectionRange(newPosition, newPosition);
            }
          }, 0);
        } else {
          // Continue with new bullet point
          const newContent = textBeforeCursor + '\n' + indent + '• ' + textAfterCursor;
          setContent(newContent);
          
          // Set cursor position after the new bullet
          setTimeout(() => {
            if (textareaRef.current) {
              const newPosition = cursorPosition + indent.length + 3;
              textareaRef.current.setSelectionRange(newPosition, newPosition);
            }
          }, 0);
        }
      } else if (numberedMatch) {
        e.preventDefault();
        const indent = numberedMatch[1];
        const currentNumber = parseInt(numberedMatch[2]);
        const numberedText = numberedMatch[3];
        
        // If the numbered item is empty, remove it and exit numbered mode
        if (numberedText.trim() === '') {
          const newContent = textBeforeCursor.replace(/\n\s*\d+\. $/, '\n') + textAfterCursor;
          setContent(newContent);
          
          // Set cursor position
          setTimeout(() => {
            if (textareaRef.current) {
              const newPosition = cursorPosition - (indent.length + numberedMatch[2].length + 2);
              textareaRef.current.setSelectionRange(newPosition, newPosition);
            }
          }, 0);
        } else {
          // Continue with next numbered item
          const nextNumber = currentNumber + 1;
          const newContent = textBeforeCursor + '\n' + indent + nextNumber + '. ' + textAfterCursor;
          setContent(newContent);
          
          // Set cursor position after the new number
          setTimeout(() => {
            if (textareaRef.current) {
              const newPosition = cursorPosition + indent.length + nextNumber.toString().length + 3;
              textareaRef.current.setSelectionRange(newPosition, newPosition);
            }
          }, 0);
        }
      }
    }
  };

  // Handle automatic bullet point conversion
  useEffect(() => {
    const lines = content.split('\n');
    let hasChanges = false;
    
    const processedLines = lines.map(line => {
      // Convert "- " to bullet point at the beginning of a line
      if (line.match(/^(\s*)- (.+)$/)) {
        hasChanges = true;
        return line.replace(/^(\s*)- (.+)$/, '$1• $2');
      }
      // Convert standalone "- " to bullet point
      if (line.match(/^(\s*)- $/)) {
        hasChanges = true;
        return line.replace(/^(\s*)- $/, '$1• ');
      }
      return line;
    });
    
    if (hasChanges) {
      isAutoConvertingRef.current = true;
      const newContent = processedLines.join('\n');
      setContent(newContent);
      
      // Maintain cursor position
      setTimeout(() => {
        if (textareaRef.current) {
          const cursorPos = textareaRef.current.selectionStart;
          textareaRef.current.setSelectionRange(cursorPos, cursorPos);
        }
        isAutoConvertingRef.current = false;
      }, 0);
    }
  }, [content]);

  // Use useCallback to memoize the autoSave function to prevent stale closures
  const autoSave = useCallback(() => {
    const updatedNote = {
      ...note,
      title: title.trim() || "Untitled Note",
      content,
    };
    
    // Only save if content has actually changed
    if (lastSavedRef.current.title !== title || lastSavedRef.current.content !== content) {
      setSaveStatus('saving');
      onSave(updatedNote);
      lastSavedRef.current = { title, content };
      
      // Show "saved" status briefly
      setTimeout(() => {
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 1500);
      }, 100);
    }
  }, [note, title, content, onSave]);

  // Autosave effect
  useEffect(() => {
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Skip autosave on initial mount, if no changes, or during auto-conversion
    if (isInitialMountRef.current || isAutoConvertingRef.current) {
      if (isInitialMountRef.current) {
        isInitialMountRef.current = false;
      }
      return;
    }

    // Only set timeout if there are actual changes to save
    if (lastSavedRef.current.title !== title || lastSavedRef.current.content !== content) {
      // Set new timeout for autosave
      timeoutRef.current = setTimeout(() => {
        autoSave();
      }, 2000); // 2 seconds delay
    }

    // Cleanup function
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [autoSave, title, content]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleManualSave = useCallback(() => {
    // Clear any pending autosave
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    const updatedNote = {
      ...note,
      title: title.trim() || "Untitled Note",
      content,
    };
    
    setSaveStatus('saving');
    onSave(updatedNote);
    lastSavedRef.current = { title, content };
    
    setTimeout(() => {
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 1500);
    }, 100);
  }, [note, title, content, onSave]);

  const getSaveButtonContent = () => {
    switch (saveStatus) {
      case 'saving':
        return (
          <>
            <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2" />
            Saving...
          </>
        );
      case 'saved':
        return (
          <>
            <Check className="h-4 w-4 mr-2" />
            Saved
          </>
        );
      default:
        return (
          <>
            <Save className="h-4 w-4 mr-2" />
            Save
          </>
        );
    }
  };

  return (
    <div className="h-full flex flex-col max-w-4xl mx-auto">
      {/* Title Section */}
      <div className="pb-6 mb-8">
        <textarea
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              if (textareaRef.current) {
                textareaRef.current.focus();
                textareaRef.current.setSelectionRange(0, 0);
              }
            }
          }}
          placeholder="Note title"
          className="text-3xl font-bold border-none px-0 py-0 focus-visible:ring-0 focus:ring-0 focus:outline-none bg-transparent shadow-none rounded-none outline-none h-auto w-full placeholder:text-muted-foreground/40 break-words resize-none overflow-hidden"
          rows={1}
          style={{
            minHeight: 'auto',
            height: 'auto'
          }}
          onInput={(e) => {
            const target = e.target as HTMLTextAreaElement;
            target.style.height = 'auto';
            target.style.height = target.scrollHeight + 'px';
          }}
        />
      </div>
      
      {/* Content Section */}
      <div className="flex-1 flex flex-col">
        <textarea
          value={content}
          onChange={handleContentChange}
          onKeyDown={handleKeyDown}
          placeholder="Write your note here..."
          className="flex-1 resize-none border-none focus:ring-0 focus:outline-none p-0 bg-transparent text-base leading-relaxed shadow-none rounded-none outline-none min-h-0 placeholder:text-muted-foreground/40 break-words whitespace-pre-wrap w-full"
          ref={textareaRef}
          style={{
            fontFamily: 'inherit',
            fontSize: '16px',
            lineHeight: '1.5em'
          }}
        />
      </div>
      
      {/* Footer Section */}
      <div className="flex justify-between items-center pt-6 mt-8 border-t border-border/30">
        <div className="text-sm text-muted-foreground font-medium">
          {saveStatus === 'idle' && "Changes autosave after 2 seconds"}
          {saveStatus === 'saving' && (
            <span className="flex items-center">
              <div className="animate-spin h-3 w-3 border-2 border-current border-t-transparent rounded-full mr-2" />
              Saving...
            </span>
          )}
          {saveStatus === 'saved' && "✓ Autosaved"}
        </div>
        <div className="flex space-x-2">
          <Button 
            onClick={handleManualSave}
            disabled={saveStatus === 'saving'}
            size="sm"
            className="font-medium"
          >
            {getSaveButtonContent()}
          </Button>
        </div>
      </div>
      
      <style jsx>{`
        textarea {
          font-family: inherit;
          position: relative;
        }
        textarea::placeholder {
          color: hsl(var(--muted-foreground) / 0.4);
        }
        .gray-lists textarea {
          background: 
            linear-gradient(transparent, transparent),
            repeating-linear-gradient(
              0deg,
              transparent 0,
              transparent 1.5em,
              transparent 1.5em,
              transparent 3em
            );
          background-size: 100% 1.5em;
          background-attachment: local;
        }
      `}</style>
    </div>
  );
}
