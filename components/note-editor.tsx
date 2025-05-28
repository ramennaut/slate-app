"use client";

import { Note } from "@/lib/types";
import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "./ui/button";
import { Save, Check, HelpCircle, X } from "lucide-react";

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
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('saved');
  const [showHelp, setShowHelp] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef({ title: note.title, content: note.content });
  const textareaRef = useRef<HTMLDivElement>(null);
  const isInitialMountRef = useRef(true);
  const isAutoConvertingRef = useRef(false);

  // Undo/Redo functionality
  const [history, setHistory] = useState<string[]>([note.content]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const isUndoRedoRef = useRef(false);
  const historyTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const helpRef = useRef<HTMLDivElement>(null);

  // Helper function to check if there are unsaved changes
  const hasUnsavedChanges = useCallback(() => {
    const normalizedLastContent = lastSavedRef.current.content.replace(/\s+/g, ' ').trim();
    const normalizedCurrentContent = content.replace(/\s+/g, ' ').trim();
    return lastSavedRef.current.title !== title || normalizedLastContent !== normalizedCurrentContent;
  }, [title, content]);

  // Helper function to detect platform for keyboard shortcuts
  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const cmdKey = isMac ? '⌘' : 'Ctrl';
  const altKey = isMac ? '⌥' : 'Alt';

  // Update local state when note prop changes (when switching notes)
  useEffect(() => {
    setTitle(note.title);
    setContent(note.content);
    lastSavedRef.current = { title: note.title, content: note.content };
    setSaveStatus('saved');
    isInitialMountRef.current = true;
    // Reset history when switching notes
    setHistory([note.content]);
    setHistoryIndex(0);
    
    // Update editor content
    if (textareaRef.current) {
      textareaRef.current.innerHTML = markdownToHtml(note.content);
    }
  }, [note.id, note.title, note.content]);

  // Function to convert markdown to HTML for display
  const markdownToHtml = (text: string) => {
    return text
      // Bold: **text** -> <strong>text</strong>
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // Italic: *text* -> <em>text</em>
      .replace(/(?<!\*)\*([^*]+?)\*(?!\*)/g, '<em>$1</em>')
      // Bullet points: • text -> <li>text</li>
      .replace(/^(\s*)• (.+)$/gm, '$1<li>$2</li>')
      // Numbered lists: 1. text -> <li>text</li>
      .replace(/^(\s*)(\d+)\. (.+)$/gm, '$1<li>$3</li>')
      // Handle multiple consecutive newlines (preserve paragraph spacing)
      .replace(/\n\n\n/g, '<br><br><br>')
      .replace(/\n\n/g, '<br><br>')
      // Convert remaining single newlines to line breaks
      .replace(/\n/g, '<br>');
  };

  // Function to convert HTML back to markdown for storage
  const htmlToMarkdown = (html: string) => {
    // First, normalize the HTML by handling browser-specific formatting
    let normalized = html
      // Handle empty divs that browsers create for empty lines
      .replace(/<div><br\s*\/?><\/div>/g, '\n')
      .replace(/<div><\/div>/g, '\n')
      // Handle divs with content (browsers often wrap lines in divs)
      .replace(/<div>(.*?)<\/div>/g, (match, content) => {
        // If the content is just whitespace or empty, treat as line break
        if (!content.trim()) return '\n';
        return '\n' + content;
      })
      // Handle paragraph elements
      .replace(/<p><br\s*\/?><\/p>/g, '\n')
      .replace(/<p><\/p>/g, '\n')
      .replace(/<p>(.*?)<\/p>/g, (match, content) => {
        if (!content.trim()) return '\n';
        return '\n' + content;
      });

    return normalized
      // Strong tags to markdown bold
      .replace(/<strong>(.*?)<\/strong>/g, '**$1**')
      .replace(/<b>(.*?)<\/b>/g, '**$1**')
      // Em tags to markdown italic
      .replace(/<em>(.*?)<\/em>/g, '*$1*')
      .replace(/<i>(.*?)<\/i>/g, '*$1*')
      // List items back to bullet points (simplified)
      .replace(/<li>(.*?)<\/li>/g, '• $1')
      // Line breaks back to newlines
      .replace(/<br\s*\/?>/g, '\n')
      // Remove any remaining HTML tags
      .replace(/<[^>]*>/g, '')
      // Clean up excessive newlines while preserving intentional spacing
      .replace(/\n{4,}/g, '\n\n\n')
      // Remove leading newline if it exists
      .replace(/^\n+/, '')
      // Remove trailing newlines
      .replace(/\n+$/, '');
  };

  // Add content to history (for undo/redo)
  const addToHistory = useCallback((newContent: string) => {
    if (isUndoRedoRef.current) return; // Don't add to history during undo/redo operations
    
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(newContent);
      // Limit history to 50 entries to prevent memory issues
      if (newHistory.length > 50) {
        newHistory.shift();
        setHistoryIndex(Math.max(0, historyIndex));
        return newHistory;
      }
      setHistoryIndex(newHistory.length - 1);
      return newHistory;
    });
  }, [historyIndex]);

  // Undo function
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      isUndoRedoRef.current = true;
      const newIndex = historyIndex - 1;
      const previousContent = history[newIndex];
      setContent(previousContent);
      
      // Update editor content
      if (textareaRef.current) {
        textareaRef.current.innerHTML = markdownToHtml(previousContent);
      }
      
      setHistoryIndex(newIndex);
      
      // Reset the flag after a short delay
      setTimeout(() => {
        isUndoRedoRef.current = false;
      }, 10);
    }
  }, [history, historyIndex]);

  // Redo function
  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      isUndoRedoRef.current = true;
      const newIndex = historyIndex + 1;
      const nextContent = history[newIndex];
      setContent(nextContent);
      
      // Update editor content
      if (textareaRef.current) {
        textareaRef.current.innerHTML = markdownToHtml(nextContent);
      }
      
      setHistoryIndex(newIndex);
      
      // Reset the flag after a short delay
      setTimeout(() => {
        isUndoRedoRef.current = false;
      }, 10);
    }
  }, [history, historyIndex]);

  // Handle content changes
  const handleContentChange = () => {
    if (textareaRef.current) {
      const htmlContent = textareaRef.current.innerHTML;
      
      // Instead of converting to markdown immediately, let's preserve the HTML structure
      // and only convert when we actually need to save to storage
      const markdownContent = htmlToMarkdown(htmlContent);
      
      // Only update if the content actually changed to avoid unnecessary re-renders
      if (markdownContent !== content) {
        setContent(markdownContent);
        
        // Set status to idle when content changes
        if (saveStatus === 'saved') {
          setSaveStatus('idle');
        }
        
        // Clear previous timeout to avoid multiple entries for rapid typing
        if (historyTimeoutRef.current) {
          clearTimeout(historyTimeoutRef.current);
        }
        
        // Add to history with a small delay to avoid too many history entries during typing
        historyTimeoutRef.current = setTimeout(() => {
          addToHistory(markdownContent);
        }, 500);
      }
    }
  };

  // Handle paste events to strip formatting
  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    
    // Get plain text from clipboard
    const plainText = e.clipboardData.getData('text/plain');
    
    if (plainText) {
      // Insert plain text at cursor position
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        
        // Split text by lines and insert with proper line breaks
        const lines = plainText.split('\n');
        const fragment = document.createDocumentFragment();
        
        lines.forEach((line, index) => {
          if (index > 0) {
            fragment.appendChild(document.createElement('br'));
          }
          if (line.trim()) {
            fragment.appendChild(document.createTextNode(line));
          }
        });
        
        range.insertNode(fragment);
        
        // Move cursor to end of inserted content
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
        
        // Trigger content change to update state
        handleContentChange();
      }
    }
  };

  // Handle key events
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Handle Ctrl+Z (Undo) and Ctrl+Y (Redo)
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      undo();
      return;
    }
    
    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
      e.preventDefault();
      redo();
      return;
    }
    
    // Handle Ctrl+S (Save)
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      handleManualSave();
      return;
    }
    
    // Handle Ctrl+B (Bold) and Ctrl+I (Italic) - Native contentEditable commands
    if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
      e.preventDefault();
      document.execCommand('bold', false);
      handleContentChange(); // Update content after formatting
      return;
    }
    
    if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
      e.preventDefault();
      document.execCommand('italic', false);
      handleContentChange(); // Update content after formatting
      return;
    }
  };

  // Use useCallback to memoize the autoSave function to prevent stale closures
  const autoSave = useCallback(() => {
    const updatedNote = {
      ...note,
      title: title.trim() || "Untitled Note",
      content,
    };
    
    // Only save if content has actually changed (normalize whitespace for comparison)
    if (hasUnsavedChanges()) {
      setSaveStatus('saving');
      onSave(updatedNote);
      lastSavedRef.current = { title, content };
      
      // Keep status as "saved" after successful save
      setTimeout(() => {
        setSaveStatus('saved');
      }, 100);
    }
  }, [note, title, content, onSave, hasUnsavedChanges]);

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
    if (hasUnsavedChanges()) {
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
      if (historyTimeoutRef.current) {
        clearTimeout(historyTimeoutRef.current);
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

  // Close help popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (helpRef.current && !helpRef.current.contains(event.target as Node)) {
        setShowHelp(false);
      }
    };

    if (showHelp) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showHelp]);

  // Update save status when title changes
  useEffect(() => {
    if (!isInitialMountRef.current && title !== lastSavedRef.current.title) {
      if (saveStatus === 'saved') {
        setSaveStatus('idle');
      }
    }
  }, [title, saveStatus]);

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
              }
            }
            // Handle Ctrl+S (Save)
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
              e.preventDefault();
              handleManualSave();
              return;
            }
          }}
          onPaste={(e) => {
            e.preventDefault();
            const plainText = e.clipboardData.getData('text/plain');
            if (plainText) {
              // Replace any line breaks with spaces for title
              const cleanText = plainText.replace(/\n/g, ' ').trim();
              const target = e.target as HTMLTextAreaElement;
              const start = target.selectionStart;
              const end = target.selectionEnd;
              const newValue = title.substring(0, start) + cleanText + title.substring(end);
              setTitle(newValue);
              
              // Set cursor position after pasted text
              setTimeout(() => {
                target.setSelectionRange(start + cleanText.length, start + cleanText.length);
              }, 0);
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
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 flex overflow-hidden">
          {/* WYSIWYG Editor */}
          <div className="flex flex-col flex-1 overflow-hidden">
            <div
              ref={textareaRef}
              contentEditable
              onInput={handleContentChange}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              className="flex-1 resize-none border-none focus:ring-0 focus:outline-none p-0 bg-transparent text-base leading-relaxed shadow-none rounded-none outline-none min-h-0 break-words whitespace-pre-wrap w-full overflow-y-auto"
              style={{
                fontFamily: 'inherit',
                fontSize: '16px',
                lineHeight: '1.5em'
              }}
              suppressContentEditableWarning={true}
              data-placeholder="Write your note here..."
            />
          </div>
        </div>
      </div>
      
      {/* Help Float Button */}
      <div className="fixed bottom-6 right-6 z-50" ref={helpRef}>
        <Button
          onClick={() => setShowHelp(!showHelp)}
          size="sm"
          variant="outline"
          className="rounded-full w-10 h-10 p-0 shadow-lg hover:shadow-xl transition-shadow"
        >
          <HelpCircle className="h-4 w-4" />
        </Button>
        
        {/* Help Popup */}
        {showHelp && (
          <div className="absolute bottom-12 right-0 w-80 bg-background border border-border rounded-lg shadow-xl p-4 z-50">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm">Keyboard Shortcuts</h3>
              <Button
                onClick={() => setShowHelp(false)}
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span>Bold text</span>
                <kbd className="px-2 py-1 text-xs bg-muted rounded">{cmdKey}+B</kbd>
              </div>
              <div className="flex justify-between items-center">
                <span>Italic text</span>
                <kbd className="px-2 py-1 text-xs bg-muted rounded">{cmdKey}+I</kbd>
              </div>
              <div className="flex justify-between items-center">
                <span>Undo</span>
                <kbd className="px-2 py-1 text-xs bg-muted rounded">{cmdKey}+Z</kbd>
              </div>
              <div className="flex justify-between items-center">
                <span>Redo</span>
                <kbd className="px-2 py-1 text-xs bg-muted rounded">{cmdKey}+Y</kbd>
              </div>
              <div className="flex justify-between items-center">
                <span>Save note</span>
                <kbd className="px-2 py-1 text-xs bg-muted rounded">{cmdKey}+S</kbd>
              </div>
              <div className="flex justify-between items-center">
                <span>Copy text</span>
                <kbd className="px-2 py-1 text-xs bg-muted rounded">{cmdKey}+C</kbd>
              </div>
              <div className="flex justify-between items-center">
                <span>Paste text (plain)</span>
                <kbd className="px-2 py-1 text-xs bg-muted rounded">{cmdKey}+V</kbd>
              </div>
              <div className="flex justify-between items-center">
                <span>Cut text</span>
                <kbd className="px-2 py-1 text-xs bg-muted rounded">{cmdKey}+X</kbd>
              </div>
              <div className="flex justify-between items-center">
                <span>Select all</span>
                <kbd className="px-2 py-1 text-xs bg-muted rounded">{cmdKey}+A</kbd>
              </div>
              <div className="border-t border-border pt-2 mt-3">
                <div className="text-xs text-muted-foreground">
                  <p className="mb-1">• Use <strong>• text</strong> for bullet points</p>
                  <p className="mb-1">• Use <strong>1. text</strong> for numbered lists</p>
                  <p>• Pasted content is automatically converted to plain text</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Footer Section */}
      <div className="flex justify-between items-center pt-6 mt-8 border-t border-border/30">
        <div className="text-sm text-muted-foreground font-medium">
          {saveStatus === 'idle' && hasUnsavedChanges() && "Unsaved changes • Autosave in 2 seconds"}
          {saveStatus === 'saving' && (
            <span className="flex items-center">
              <div className="animate-spin h-3 w-3 border-2 border-current border-t-transparent rounded-full mr-2" />
              Saving...
            </span>
          )}
          {saveStatus === 'saved' && "✓ All changes saved"}
        </div>
        <div className="flex space-x-2">
          {(hasUnsavedChanges() || saveStatus === 'saving') && (
            <Button 
              onClick={handleManualSave}
              disabled={saveStatus === 'saving'}
              size="sm"
              className="font-medium"
            >
              {getSaveButtonContent()}
            </Button>
          )}
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
        
        /* ContentEditable placeholder styling */
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: hsl(var(--muted-foreground) / 0.4);
          pointer-events: none;
        }
        
        /* WYSIWYG editor styling */
        [contenteditable] {
          font-family: inherit;
          position: relative;
        }
        
        [contenteditable] strong {
          font-weight: bold;
        }
        
        [contenteditable] em {
          font-style: italic;
        }
        
        [contenteditable] li {
          margin-left: 1.5em;
          list-style-type: disc;
        }
        
        [contenteditable]:focus {
          outline: none;
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
