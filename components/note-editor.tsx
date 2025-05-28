"use client";

import { Note } from "@/lib/types";
import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "./ui/button";
import { Save, Check, HelpCircle, X } from "lucide-react";

interface NoteEditorProps {
  note: Note;
  onSave: (note: Note) => void;
  isMobile?: boolean;
}

export default function NoteEditor({ note, onSave, isMobile }: NoteEditorProps) {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">(
    "saved"
  );
  const [showHelp, setShowHelp] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef({ title: note.title, content: note.content });
  const textareaRef = useRef<HTMLDivElement>(null);
  const isInitialMountRef = useRef(true);
  const isAutoConvertingRef = useRef(false);
  const isFormattingRef = useRef(false);

  // Undo/Redo functionality
  const [history, setHistory] = useState<string[]>([note.content]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const isUndoRedoRef = useRef(false);
  const historyTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const helpRef = useRef<HTMLDivElement>(null);

  // Helper function to compare content for meaningful changes
  const hasContentChanged = useCallback((newContent: string, oldContent: string) => {
    // Normalize both contents for comparison
    const normalize = (content: string) => {
      return content
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
    };
    
    return normalize(newContent) !== normalize(oldContent);
  }, []);

  // Helper function to check if there are unsaved changes (including title)
  const hasUnsavedChanges = useCallback(() => {
    return (
      lastSavedRef.current.title !== title ||
      hasContentChanged(content, lastSavedRef.current.content)
    );
  }, [title, content, hasContentChanged]);

  // Helper function to detect platform for keyboard shortcuts
  const isMac =
    typeof navigator !== "undefined" &&
    navigator.platform.toUpperCase().indexOf("MAC") >= 0;
  const cmdKey = isMac ? "⌘" : "Ctrl";

  // Initialize content when note changes
  useEffect(() => {
    setTitle(note.title);
    setContent(note.content);
    lastSavedRef.current = { title: note.title, content: note.content };

    // Reset history when note changes
    setHistory([note.content]);
    setHistoryIndex(0);

    // Update editor content immediately on mount and note change
    if (textareaRef.current) {
      textareaRef.current.innerHTML = markdownToHtml(note.content);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note.id]); // Only reset when note ID changes, not content

  // Helper function to save cursor position
  const saveCursorPosition = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || !textareaRef.current) return null;

    const range = selection.getRangeAt(0);
    
    // Only save if the selection is within our contentEditable element
    if (!textareaRef.current.contains(range.commonAncestorContainer)) return null;

    try {
      // Get the start offset relative to the contentEditable element
      const preSelectionRange = document.createRange();
      preSelectionRange.setStart(textareaRef.current, 0);
      preSelectionRange.setEnd(range.startContainer, range.startOffset);
      
      const start = preSelectionRange.toString().length;
      const end = start + range.toString().length;
      
      return { start, end };
    } catch (e) {
      console.warn("Could not save cursor position:", e);
      return null;
    }
  }, []);

  // Helper function to restore cursor position
  const restoreCursorPosition = useCallback((position: { start: number; end: number } | null) => {
    if (!position || !textareaRef.current) return;

    try {
      const selection = window.getSelection();
      if (!selection) return;

      // Create a walker to traverse text nodes
      const walker = document.createTreeWalker(
        textareaRef.current,
        NodeFilter.SHOW_TEXT,
        null
      );

      let currentOffset = 0;
      let startNode = null;
      let endNode = null;
      let startOffset = 0;
      let endOffset = 0;

      // Find the start position
      while (walker.nextNode()) {
        const node = walker.currentNode;
        const nodeLength = node.textContent?.length || 0;
        
        if (currentOffset + nodeLength >= position.start && !startNode) {
          startNode = node;
          startOffset = position.start - currentOffset;
        }
        
        if (currentOffset + nodeLength >= position.end) {
          endNode = node;
          endOffset = position.end - currentOffset;
          break;
        }
        
        currentOffset += nodeLength;
      }

      if (startNode) {
        const range = document.createRange();
        range.setStart(startNode, Math.min(startOffset, startNode.textContent?.length || 0));
        
        if (endNode) {
          range.setEnd(endNode, Math.min(endOffset, endNode.textContent?.length || 0));
        } else {
          range.collapse(true);
        }

        selection.removeAllRanges();
        selection.addRange(range);
      }
    } catch (e) {
      console.warn("Could not restore cursor position:", e);
    }
  }, []);

  // Separate effect to handle content updates from parent without resetting history
  useEffect(() => {
    // Only update if we're not in the middle of editing, formatting, or undo/redo operations
    if (saveStatus === "saved" && !isInitialMountRef.current && !isFormattingRef.current && !isUndoRedoRef.current) {
      // Check if the content has actually changed meaningfully
      const currentDisplayContent = textareaRef.current?.innerHTML || '';
      const newDisplayContent = markdownToHtml(note.content);
      
      // Only update the DOM if there's a meaningful difference
      if (hasContentChanged(newDisplayContent, currentDisplayContent)) {
        // Save cursor position before updating content
        const cursorMarker = saveCursorPosition();
        
        setTitle(note.title);
        setContent(note.content);
        lastSavedRef.current = { title: note.title, content: note.content };

        // Update editor content without resetting history
        if (textareaRef.current) {
          textareaRef.current.innerHTML = newDisplayContent;
          
          // Restore cursor position after a brief delay to allow DOM to update
          setTimeout(() => {
            restoreCursorPosition(cursorMarker);
          }, 0);
        }
      } else {
        // Content hasn't changed visually, just update the state without touching DOM
        setTitle(note.title);
        setContent(note.content);
        lastSavedRef.current = { title: note.title, content: note.content };
      }
    }
  }, [note.title, note.content, saveStatus, saveCursorPosition, restoreCursorPosition, hasContentChanged]);

  // Initialize content on first mount
  useEffect(() => {
    if (isInitialMountRef.current && textareaRef.current) {
      textareaRef.current.innerHTML = markdownToHtml(note.content);
      isInitialMountRef.current = false;
    }
  }, [note.content]);

  // Function to convert markdown to HTML for display
  const markdownToHtml = (text: string) => {
    return (
      text
        // Bold: **text** -> <strong>text</strong>
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        // Italic: *text* -> <em>text</em> (simple and reliable pattern)
        .replace(/(?:^|[^*])\*([^*\n]+?)\*(?![*])/g, (match, content) => {
          // Check if this is not part of a bold (**text**)
          if (match.includes('**')) return match;
          const firstChar = match[0];
          if (firstChar === '*') {
            return `<em>${content}</em>`;
          } else {
            return firstChar + `<em>${content}</em>`;
          }
        })
        // Bullet points: • text -> <li>text</li>
        .replace(/^(\s*)• (.+)$/gm, "$1<li>$2</li>")
        // Numbered lists: 1. text -> <li>text</li>
        .replace(/^(\s*)(\d+)\. (.+)$/gm, "$1<li>$3</li>")
        // Handle multiple consecutive newlines (preserve paragraph spacing)
        .replace(/\n\n\n/g, "<br><br><br>")
        .replace(/\n\n/g, "<br><br>")
        // Convert remaining single newlines to line breaks
        .replace(/\n/g, "<br>")
    );
  };

  // Function to convert HTML back to markdown for storage
  const htmlToMarkdown = (html: string) => {
    // First, normalize the HTML by handling browser-specific formatting
    const normalized = html
      // Handle empty divs that browsers create for empty lines
      .replace(/<div><br\s*\/?><\/div>/g, "\n")
      .replace(/<div><\/div>/g, "\n")
      // Handle divs with content (browsers often wrap lines in divs)
      .replace(/<div>(.*?)<\/div>/g, (match, content) => {
        // If the content is just whitespace or empty, treat as line break
        if (!content.trim()) return "\n";
        return "\n" + content;
      })
      // Handle paragraph elements
      .replace(/<p><br\s*\/?><\/p>/g, "\n")
      .replace(/<p><\/p>/g, "\n")
      .replace(/<p>(.*?)<\/p>/g, (match, content) => {
        if (!content.trim()) return "\n";
        return "\n" + content;
      });

    return (
      normalized
        // Strong tags to markdown bold
        .replace(/<strong>(.*?)<\/strong>/g, "**$1**")
        .replace(/<b>(.*?)<\/b>/g, "**$1**")
        // Em tags to markdown italic
        .replace(/<em>(.*?)<\/em>/g, "*$1*")
        .replace(/<i>(.*?)<\/i>/g, "*$1*")
        // List items back to bullet points (simplified)
        .replace(/<li>(.*?)<\/li>/g, "• $1")
        // Line breaks back to newlines
        .replace(/<br\s*\/?>/g, "\n")
        // Remove any remaining HTML tags
        .replace(/<[^>]*>/g, "")
        // Clean up excessive newlines while preserving intentional spacing
        .replace(/\n{4,}/g, "\n\n\n")
        // Remove leading newline if it exists
        .replace(/^\n+/, "")
        // Remove trailing newlines
        .replace(/\n+$/, "")
    );
  };

  // Add content to history (for undo/redo)
  const addToHistory = useCallback(
    (newContent: string) => {
      if (isUndoRedoRef.current) return; // Don't add to history during undo/redo operations

      setHistory((prev) => {
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
    },
    [historyIndex]
  );

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
        if (saveStatus === "saved") {
          setSaveStatus("idle");
        }

        // Clear previous timeout to avoid multiple entries for rapid typing
        if (historyTimeoutRef.current) {
          clearTimeout(historyTimeoutRef.current);
        }

        // Add to history with a longer delay during formatting to avoid too many entries
        const historyDelay = isFormattingRef.current ? 1000 : 500;
        historyTimeoutRef.current = setTimeout(() => {
          // Only add to history if we're not in the middle of formatting
          if (!isFormattingRef.current) {
            addToHistory(markdownContent);
          }
        }, historyDelay);
      }
    }
  };

  // Handle paste events to preserve formatting but normalize font styles
  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();

    // Get both HTML and plain text from clipboard
    const htmlContent = e.clipboardData.getData("text/html");
    const plainText = e.clipboardData.getData("text/plain");

    if (htmlContent) {
      // Clean and normalize the HTML content
      const cleanHTML = (html: string) => {
        // Create a temporary div to parse the HTML
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = html;

        // Simple cleaning function that preserves structure
        const processElement = (element: Element): DocumentFragment => {
          const fragment = document.createDocumentFragment();

          for (const node of Array.from(element.childNodes)) {
            if (node.nodeType === Node.TEXT_NODE) {
              // Preserve text nodes
              fragment.appendChild(
                document.createTextNode(node.textContent || "")
              );
            } else if (node.nodeType === Node.ELEMENT_NODE) {
              const el = node as Element;
              const tagName = el.tagName.toLowerCase();

              switch (tagName) {
                case "br":
                  fragment.appendChild(document.createElement("br"));
                  break;

                case "p":
                case "div":
                  // Convert paragraphs and divs to content with line breaks
                  if (el.textContent?.trim()) {
                    // Add line break if this isn't the first element
                    if (fragment.childNodes.length > 0) {
                      fragment.appendChild(document.createElement("br"));
                    }
                    fragment.appendChild(processElement(el));
                  }
                  break;

                case "strong":
                case "b":
                  // Preserve bold formatting
                  const strongEl = document.createElement("strong");
                  strongEl.appendChild(processElement(el));
                  fragment.appendChild(strongEl);
                  break;

                case "em":
                case "i":
                  // Preserve italic formatting
                  const emEl = document.createElement("em");
                  emEl.appendChild(processElement(el));
                  fragment.appendChild(emEl);
                  break;

                case "li":
                  // Convert list items to bullet points
                  fragment.appendChild(document.createTextNode("• "));
                  fragment.appendChild(processElement(el));
                  fragment.appendChild(document.createElement("br"));
                  break;

                case "ul":
                case "ol":
                  // Process list contents
                  fragment.appendChild(processElement(el));
                  break;

                default:
                  // For other elements, just extract the content
                  fragment.appendChild(processElement(el));
                  break;
              }
            }
          }

          return fragment;
        };

        return processElement(tempDiv);
      };

      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();

        // Clean and insert the HTML content
        const cleanedFragment = cleanHTML(htmlContent);
        range.insertNode(cleanedFragment);

        // Move cursor to end of inserted content
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);

        // Trigger content change to update state
        handleContentChange();
        return;
      }
    }

    // Fallback to plain text with preserved line breaks
    if (plainText) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();

        // Split text by lines and insert with proper line breaks
        const lines = plainText.split(/\r?\n/);
        const fragment = document.createDocumentFragment();

        lines.forEach((line, index) => {
          if (index > 0) {
            fragment.appendChild(document.createElement("br"));
          }
          if (line.length > 0) {
            // Include empty lines as breaks
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

  // Modern bold/italic formatting functions
  const applyFormat = (tagName: string) => {
    isFormattingRef.current = true; // Set formatting flag
    
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      isFormattingRef.current = false;
      return;
    }

    const range = selection.getRangeAt(0);
    
    // Check if we're in the contentEditable element
    if (!textareaRef.current?.contains(range.commonAncestorContainer)) {
      isFormattingRef.current = false;
      return;
    }

    if (range.collapsed) {
      // No selection - insert formatting tags for future typing
      const formatElement = document.createElement(tagName);
      formatElement.textContent = "\u200B"; // Zero-width space to hold cursor
      
      try {
        range.insertNode(formatElement);
        
        // Position cursor inside the format element
        const newRange = document.createRange();
        newRange.setStart(formatElement, 0);
        newRange.setEnd(formatElement, 1);
        
        selection.removeAllRanges();
        selection.addRange(newRange);
      } catch (e) {
        console.warn("Could not apply formatting:", e);
      }
    } else {
      // Has selection - wrap selected text
      try {
        const selectedContent = range.extractContents();
        const formatElement = document.createElement(tagName);
        formatElement.appendChild(selectedContent);
        range.insertNode(formatElement);
        
        // Select the formatted content
        const newRange = document.createRange();
        newRange.selectNodeContents(formatElement);
        selection.removeAllRanges();
        selection.addRange(newRange);
      } catch (e) {
        console.warn("Could not apply formatting:", e);
      }
    }
    
    // Trigger content change to update state
    handleContentChange();
    
    // Reset formatting flag after a short delay
    setTimeout(() => {
      isFormattingRef.current = false;
    }, 100);
  };

  // Toggle formatting if already applied
  const toggleFormat = (tagName: string) => {
    isFormattingRef.current = true; // Set formatting flag
    
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      isFormattingRef.current = false;
      return;
    }

    const range = selection.getRangeAt(0);
    let currentElement: Node | null = range.commonAncestorContainer;
    
    // If text node, get parent element
    if (currentElement.nodeType === Node.TEXT_NODE) {
      currentElement = currentElement.parentNode;
    }
    
    // Check if currentElement is valid and is an Element
    if (!currentElement || currentElement.nodeType !== Node.ELEMENT_NODE) {
      isFormattingRef.current = false;
      return;
    }
    
    // Check if we're already inside the target format
    let formatElement = null;
    let element = currentElement as Element;
    
    while (element && element !== textareaRef.current) {
      if (element.tagName?.toLowerCase() === tagName.toLowerCase()) {
        formatElement = element;
        break;
      }
      const parentEl = element.parentElement;
      if (!parentEl) break;
      element = parentEl;
    }
    
    if (formatElement) {
      // Remove formatting
      try {
        const parent = formatElement.parentNode;
        while (formatElement.firstChild) {
          parent?.insertBefore(formatElement.firstChild, formatElement);
        }
        parent?.removeChild(formatElement);
        
        // Trigger content change
        handleContentChange();
      } catch (e) {
        console.warn("Could not remove formatting:", e);
      }
    } else {
      // Apply formatting
      applyFormat(tagName);
    }
    
    // Reset formatting flag after a short delay
    setTimeout(() => {
      isFormattingRef.current = false;
    }, 100);
  };

  // Handle key events
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Handle Ctrl+Z (Undo) and Ctrl+Y (Redo)
    if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
      e.preventDefault();
      undo();
      return;
    }

    if (
      (e.ctrlKey || e.metaKey) &&
      (e.key === "y" || (e.key === "z" && e.shiftKey))
    ) {
      e.preventDefault();
      redo();
      return;
    }

    // Handle Ctrl+S (Save)
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      handleManualSave();
      return;
    }

    // Handle Ctrl+B (Bold) and Ctrl+I (Italic) - Modern implementation
    if ((e.ctrlKey || e.metaKey) && e.key === "b") {
      e.preventDefault();
      toggleFormat("strong");
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.key === "i") {
      e.preventDefault();
      toggleFormat("em");
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
      setSaveStatus("saving");
      onSave(updatedNote);
      lastSavedRef.current = { title, content };

      // Keep status as "saved" after successful save
      setTimeout(() => {
        setSaveStatus("saved");
      }, 100);
    }
  }, [note, title, content, onSave, hasUnsavedChanges]);

  // Autosave effect
  useEffect(() => {
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Skip autosave on initial mount, if no changes, during auto-conversion, or while formatting
    if (isInitialMountRef.current || isAutoConvertingRef.current || isFormattingRef.current) {
      if (isInitialMountRef.current) {
        isInitialMountRef.current = false;
      }
      return;
    }

    // Only set timeout if there are actual changes to save
    if (hasUnsavedChanges()) {
      // Set new timeout for autosave
      timeoutRef.current = setTimeout(() => {
        // Double-check that we're not formatting before saving
        if (!isFormattingRef.current) {
          autoSave();
        }
      }, 2000); // 2 seconds delay
    }

    // Cleanup function
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [autoSave, title, content, hasUnsavedChanges]);

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

    setSaveStatus("saving");
    onSave(updatedNote);
    lastSavedRef.current = { title, content };

    setTimeout(() => {
      setSaveStatus("saved");
    }, 100);
  }, [note, title, content, onSave]);

  const getSaveButtonContent = () => {
    switch (saveStatus) {
      case "saving":
        return (
          <>
            <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2" />
            Saving...
          </>
        );
      case "saved":
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
      if (helpRef.current && event.target && !helpRef.current.contains(event.target as Node)) {
        setShowHelp(false);
      }
    };

    if (showHelp) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showHelp]);

  // Update save status when title changes
  useEffect(() => {
    if (!isInitialMountRef.current && title !== lastSavedRef.current.title) {
      if (saveStatus === "saved") {
        setSaveStatus("idle");
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
            if (e.key === "Enter") {
              e.preventDefault();
              if (textareaRef.current) {
                textareaRef.current.focus();
              }
            }
            // Handle Ctrl+S (Save)
            if ((e.ctrlKey || e.metaKey) && e.key === "s") {
              e.preventDefault();
              handleManualSave();
              return;
            }
          }}
          onPaste={(e) => {
            e.preventDefault();
            const plainText = e.clipboardData.getData("text/plain");
            if (plainText) {
              // Replace any line breaks with spaces for title
              const cleanText = plainText.replace(/\n/g, " ").trim();
              const target = e.target as HTMLTextAreaElement;
              const start = target.selectionStart;
              const end = target.selectionEnd;
              const newValue =
                title.substring(0, start) + cleanText + title.substring(end);
              setTitle(newValue);

              // Set cursor position after pasted text
              setTimeout(() => {
                target.setSelectionRange(
                  start + cleanText.length,
                  start + cleanText.length
                );
              }, 0);
            }
          }}
          placeholder="Note title"
          className="text-3xl font-bold border-none px-0 py-0 focus-visible:ring-0 focus:ring-0 focus:outline-none bg-transparent shadow-none rounded-none outline-none h-auto w-full placeholder:text-muted-foreground/40 break-words resize-none overflow-hidden"
          rows={1}
          style={{
            minHeight: "auto",
            height: "auto",
          }}
          onInput={(e) => {
            const target = e.target as HTMLTextAreaElement;
            target.style.height = "auto";
            target.style.height = target.scrollHeight + "px";
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
                fontFamily: "inherit",
                fontSize: "16px",
                lineHeight: "1.5em",
              }}
              suppressContentEditableWarning={true}
              data-placeholder="Write your note here..."
            />
          </div>
        </div>
      </div>

      {/* Help Float Button */}
      {!isMobile && (
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
                  <span>Bold</span>
                  <kbd className="px-2 py-1 text-xs bg-muted rounded">
                    {cmdKey}+B
                  </kbd>
                </div>
                <div className="flex justify-between items-center">
                  <span>Italic</span>
                  <kbd className="px-2 py-1 text-xs bg-muted rounded">
                    {cmdKey}+I
                  </kbd>
                </div>
                <div className="border-t border-border pt-2 mt-2">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span>Undo</span>
                      <kbd className="px-2 py-1 text-xs bg-muted rounded">
                        {cmdKey}+Z
                      </kbd>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Redo</span>
                      <kbd className="px-2 py-1 text-xs bg-muted rounded">
                        {cmdKey}+Y
                      </kbd>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Copy</span>
                      <kbd className="px-2 py-1 text-xs bg-muted rounded">
                        {cmdKey}+C
                      </kbd>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Cut</span>
                      <kbd className="px-2 py-1 text-xs bg-muted rounded">
                        {cmdKey}+X
                      </kbd>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Paste</span>
                      <kbd className="px-2 py-1 text-xs bg-muted rounded">
                        {cmdKey}+V
                      </kbd>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Select all</span>
                      <kbd className="px-2 py-1 text-xs bg-muted rounded">
                        {cmdKey}+A
                      </kbd>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Save</span>
                      <kbd className="px-2 py-1 text-xs bg-muted rounded">
                        {cmdKey}+S
                      </kbd>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Footer Section */}
      <div className="flex justify-between items-center pt-6 mt-8 border-t border-border/30">
        <div className="text-sm text-muted-foreground font-medium">
          {saveStatus === "idle" &&
            hasUnsavedChanges() &&
            "Unsaved changes • Autosave in 2 seconds"}
          {saveStatus === "saving" && (
            <span className="flex items-center">
              <div className="animate-spin h-3 w-3 border-2 border-current border-t-transparent rounded-full mr-2" />
              Saving...
            </span>
          )}
          {saveStatus === "saved" && "✓ All changes saved"}
        </div>
        <div className="flex space-x-2">
          {(hasUnsavedChanges() || saveStatus === "saving") && (
            <Button
              onClick={handleManualSave}
              disabled={saveStatus === "saving"}
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
          background: linear-gradient(transparent, transparent),
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

