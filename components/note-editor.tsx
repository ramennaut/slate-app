"use client";

import { Note } from "@/lib/types";
import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "./ui/button";
import { Save, Check, HelpCircle, X, Zap, ArrowLeft, BookOpen } from "lucide-react";
import { generateAtomicNotes, generateTermDefinition } from "@/lib/openai";
import HubNoteManager from "./hub-note-manager";
import StructureNoteManager from "./structure-note-manager";
import MarkdownEditor from "./markdown-editor";

interface NoteEditorProps {
  note: Note;
  onSave: (note: Note) => void;
  onCreateAtomicNotes?: (atomicNotes: Array<{ title: string; content: string }>) => void;
  onSelectNote?: (note: Note) => void;
  notes?: Note[];
  isMobile?: boolean;
}

export default function NoteEditor({ note, onSave, onCreateAtomicNotes, onSelectNote, notes, isMobile }: NoteEditorProps) {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">(
    "saved"
  );
  const [showHelp, setShowHelp] = useState(false);
  const [isGeneratingAtomicNotes, setIsGeneratingAtomicNotes] = useState(false);
  
  // Text selection and context menu state
  const [selectedText, setSelectedText] = useState("");
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [isDefiningTerm, setIsDefiningTerm] = useState(false);
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef({ title: note.title, content: note.content });
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const helpRef = useRef<HTMLDivElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  // Undo/Redo functionality
  const [history, setHistory] = useState<string[]>([note.content]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const isUndoRedoRef = useRef(false);
  const historyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Helper function to check if there are unsaved changes (including title)
  const hasUnsavedChanges = useCallback(() => {
    return (
      lastSavedRef.current.title !== title ||
      lastSavedRef.current.content !== content
    );
  }, [title, content]);

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
  }, [note.id, note.content, note.title]);

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
      setHistoryIndex(newIndex);

      // Reset the flag after a short delay
      setTimeout(() => {
        isUndoRedoRef.current = false;
      }, 10);
    }
  }, [history, historyIndex]);

  // Handle content changes
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);

        // Set status to idle when content changes
        if (saveStatus === "saved") {
          setSaveStatus("idle");
        }

        // Clear previous timeout to avoid multiple entries for rapid typing
        if (historyTimeoutRef.current) {
          clearTimeout(historyTimeoutRef.current);
        }

    // Add to history with a delay to avoid too many entries
        historyTimeoutRef.current = setTimeout(() => {
      if (!isUndoRedoRef.current) {
        addToHistory(newContent);
      }
    }, 500);
  };

  // Handle key events
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
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

    // Handle Enter key for list continuation
    if (e.key === "Enter") {
      e.preventDefault();
      handleListContinuation();
      return;
    }

    // Handle Tab for list indentation
    if (e.key === "Tab") {
      e.preventDefault();
      if (e.shiftKey) {
        handleListUnindent();
      } else {
        handleListIndent();
      }
      return;
    }

    // Handle smart backspace for indentation
    if (e.key === "Backspace") {
      const shouldHandleSmartBackspace = handleSmartBackspace();
      if (shouldHandleSmartBackspace) {
        e.preventDefault();
        return;
      }
    }
  };

  // Function to detect if current line is a list item
  const getListInfo = (text: string, cursorPos: number) => {
    const lines = text.substring(0, cursorPos).split('\n');
    const currentLine = lines[lines.length - 1];
    
    // Check for unordered list patterns (-, *, •)
    const unorderedMatch = currentLine.match(/^(\s*)([-*•])\s+(.*)$/);
    if (unorderedMatch) {
      return {
        type: 'unordered',
        indent: unorderedMatch[1],
        marker: unorderedMatch[2],
        content: unorderedMatch[3],
        fullMatch: unorderedMatch[0]
      };
    }
    
    // Check for ordered list patterns (1., 2., etc.)
    const orderedMatch = currentLine.match(/^(\s*)(\d+)\.\s+(.*)$/);
    if (orderedMatch) {
      return {
        type: 'ordered',
        indent: orderedMatch[1],
        number: parseInt(orderedMatch[2]),
        content: orderedMatch[3],
        fullMatch: orderedMatch[0]
      };
    }
    
    return null;
  };

  // Function to handle Enter key in lists
  const handleListContinuation = () => {
    if (!textareaRef.current) return;
    
    const textarea = textareaRef.current;
    const cursorPos = textarea.selectionStart;
    const text = textarea.value;
    
    const listInfo = getListInfo(text, cursorPos);
    
    if (listInfo) {
      // If the current list item is empty, end the list
      if (listInfo.content.trim() === '') {
        // Remove the empty list item and add a normal line break
        const lines = text.split('\n');
        const currentLineIndex = text.substring(0, cursorPos).split('\n').length - 1;
        lines[currentLineIndex] = listInfo.indent; // Keep just the indentation
        
        const newText = lines.join('\n');
        const newCursorPos = cursorPos - listInfo.fullMatch.length + listInfo.indent.length;
        
        setContent(newText);
        setTimeout(() => {
          textarea.setSelectionRange(newCursorPos, newCursorPos);
        }, 0);
        return;
      }
      
      // Continue the list with the next item
      let newListItem = '';
      if (listInfo.type === 'unordered') {
        newListItem = `\n${listInfo.indent}${listInfo.marker} `;
      } else if (listInfo.type === 'ordered' && typeof listInfo.number === 'number') {
        // For normal list continuation, just increment the current number
        const nextNumber = listInfo.number + 1;
        newListItem = `\n${listInfo.indent}${nextNumber}. `;
      }
      
      const newText = text.substring(0, cursorPos) + newListItem + text.substring(cursorPos);
      const newCursorPos = cursorPos + newListItem.length;
      
      setContent(newText);
      setTimeout(() => {
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
    } else {
      // Normal Enter behavior
      const newText = text.substring(0, cursorPos) + '\n' + text.substring(cursorPos);
      const newCursorPos = cursorPos + 1;
      
      setContent(newText);
      setTimeout(() => {
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
    }
  };

  // Function to handle Tab indentation
  const handleListIndent = () => {
    if (!textareaRef.current) return;
    
    const textarea = textareaRef.current;
    const cursorPos = textarea.selectionStart;
    const text = textarea.value;
    
    const listInfo = getListInfo(text, cursorPos);
    
    if (listInfo) {
      // Add indentation to the current list item
      const lines = text.split('\n');
      const currentLineIndex = text.substring(0, cursorPos).split('\n').length - 1;
      const currentLine = lines[currentLineIndex];
      
      // Add four spaces for indentation
      let newLine = '    ' + currentLine;
      
      // If this is an ordered list, reset numbering to 1 when indenting
      if (listInfo.type === 'ordered') {
        const indentedOrderedMatch = newLine.match(/^(\s*)\d+\.\s+(.*)$/);
        if (indentedOrderedMatch) {
          newLine = `${indentedOrderedMatch[1]}1. ${indentedOrderedMatch[2]}`;
        }
        
        // Renumber subsequent items at the original level to fill the gap
        const originalIndent = listInfo.indent;
        const originalNumber = listInfo.number;
        
        if (typeof originalNumber === 'number') {
          for (let i = currentLineIndex + 1; i < lines.length; i++) {
            const subsequentLine = lines[i];
            const subsequentMatch = subsequentLine.match(/^(\s*)(\d+)\.\s+(.*)$/);
            
            if (subsequentMatch) {
              const subsequentIndent = subsequentMatch[1];
              const subsequentNumber = parseInt(subsequentMatch[2]);
              const subsequentContent = subsequentMatch[3];
              
              if (subsequentIndent === originalIndent && subsequentNumber > originalNumber) {
                // This is at the same original level and after the indented item, shift it down
                lines[i] = `${subsequentIndent}${subsequentNumber - 1}. ${subsequentContent}`;
              } else if (subsequentIndent.length < originalIndent.length) {
                // We've hit a parent level, stop renumbering
                break;
              }
              // Continue for child levels (more indented)
            } else if (subsequentLine.trim() === '') {
              // Empty line, continue
              continue;
            } else if (!subsequentLine.match(/^\s*[-*•]\s/)) {
              // Non-list line, stop renumbering
              break;
            }
          }
        }
      }
      
      lines[currentLineIndex] = newLine;
      
      const newText = lines.join('\n');
      const newCursorPos = cursorPos + 4;
      
      setContent(newText);
      setTimeout(() => {
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
    } else {
      // Regular tab behavior - add four spaces
      const newText = text.substring(0, cursorPos) + '    ' + text.substring(cursorPos);
      const newCursorPos = cursorPos + 4;
      
      setContent(newText);
      setTimeout(() => {
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
    }
  };

  // Function to handle Shift+Tab unindentation
  const handleListUnindent = () => {
    if (!textareaRef.current) return;
    
    const textarea = textareaRef.current;
    const cursorPos = textarea.selectionStart;
    const text = textarea.value;
    
    const lines = text.split('\n');
    const currentLineIndex = text.substring(0, cursorPos).split('\n').length - 1;
    const currentLine = lines[currentLineIndex];
    
    // Check if this is an ordered list before unindenting
    const orderedMatch = currentLine.match(/^(\s*)(\d+)\.\s+(.*)$/);
    
    // Remove up to 4 spaces from the beginning of the line
    let newLine = currentLine;
    let removedSpaces = 0;
    
    if (currentLine.startsWith('    ')) {
      newLine = currentLine.substring(4);
      removedSpaces = 4;
    } else if (currentLine.startsWith('   ')) {
      newLine = currentLine.substring(3);
      removedSpaces = 3;
    } else if (currentLine.startsWith('  ')) {
      newLine = currentLine.substring(2);
      removedSpaces = 2;
    } else if (currentLine.startsWith(' ')) {
      newLine = currentLine.substring(1);
      removedSpaces = 1;
    }
    
    // If this was an ordered list item, renumber it for the new indentation level
    if (removedSpaces > 0 && orderedMatch) {
      const newIndentLevel = orderedMatch[1].substring(removedSpaces);
      const content = orderedMatch[3];
      
      // Find the correct number for this new indentation level
      const newNumber = getNextOrderedNumber(text, cursorPos, newIndentLevel);
      newLine = `${newIndentLevel}${newNumber}. ${content}`;
      
      // Renumber subsequent items at the target level to make room for this item
      for (let i = currentLineIndex + 1; i < lines.length; i++) {
        const subsequentLine = lines[i];
        const subsequentMatch = subsequentLine.match(/^(\s*)(\d+)\.\s+(.*)$/);
        
        if (subsequentMatch) {
          const subsequentIndent = subsequentMatch[1];
          const subsequentNumber = parseInt(subsequentMatch[2]);
          const subsequentContent = subsequentMatch[3];
          
          if (subsequentIndent === newIndentLevel && subsequentNumber >= newNumber) {
            // This is at the same target level and at/after our new number, shift it up
            lines[i] = `${subsequentIndent}${subsequentNumber + 1}. ${subsequentContent}`;
          } else if (subsequentIndent.length < newIndentLevel.length) {
            // We've hit a parent level, stop renumbering
            break;
          }
          // Continue for child levels (more indented)
        } else if (subsequentLine.trim() === '') {
          // Empty line, continue
          continue;
        } else if (!subsequentLine.match(/^\s*[-*•]\s/)) {
          // Non-list line, stop renumbering
          break;
        }
      }
    }
    
    if (removedSpaces > 0) {
      lines[currentLineIndex] = newLine;
      const newText = lines.join('\n');
      const newCursorPos = cursorPos - removedSpaces;
      
      setContent(newText);
      setTimeout(() => {
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
    }
  };

  // Helper function to get the next number for an ordered list at a specific indentation level
  // Used only for unindenting items to find their correct number in the target level
  const getNextOrderedNumber = (text: string, cursorPos: number, indentLevel: string) => {
    const allLines = text.split('\n');
    const currentLineIndex = text.substring(0, cursorPos).split('\n').length - 1;
    
    let highestNumber = 0;
    
    // Look through ALL lines up to the current position to find the highest number at this exact indentation level
    for (let i = 0; i < currentLineIndex; i++) {
      const line = allLines[i];
      const orderedMatch = line.match(/^(\s*)(\d+)\.\s+(.*)$/);
      
      if (orderedMatch) {
        const lineIndent = orderedMatch[1];
        const number = parseInt(orderedMatch[2]);
        
        if (lineIndent === indentLevel) {
          // Found a line at our exact indentation level - track the highest number
          highestNumber = Math.max(highestNumber, number);
        }
      }
    }
    
    return highestNumber + 1;
  };

  // Function to handle smart backspace for indentation
  const handleSmartBackspace = () => {
    if (!textareaRef.current) return false;
    
    const textarea = textareaRef.current;
    const cursorPos = textarea.selectionStart;
    const text = textarea.value;
    
    // Only handle smart backspace if cursor is at the start or in the indentation area
    const lines = text.split('\n');
    const currentLineIndex = text.substring(0, cursorPos).split('\n').length - 1;
    const currentLine = lines[currentLineIndex];
    const lineStartPos = cursorPos - (text.substring(0, cursorPos).split('\n')[currentLineIndex]?.length || 0);
    const positionInLine = cursorPos - lineStartPos;
    
    // Check if we're in the indentation area (only spaces before cursor in current line)
    const beforeCursor = currentLine.substring(0, positionInLine);
    const isInIndentation = /^\s*$/.test(beforeCursor) && beforeCursor.length > 0;
    
    if (isInIndentation) {
      // Calculate how many spaces to remove (up to 4, or to the previous indent level)
      let spacesToRemove = 0;
      
      if (beforeCursor.length >= 4 && beforeCursor.endsWith('    ')) {
        spacesToRemove = 4;
      } else if (beforeCursor.length >= 3 && beforeCursor.endsWith('   ')) {
        spacesToRemove = 3;
      } else if (beforeCursor.length >= 2 && beforeCursor.endsWith('  ')) {
        spacesToRemove = 2;
      } else if (beforeCursor.length >= 1 && beforeCursor.endsWith(' ')) {
        spacesToRemove = 1;
      }
      
      if (spacesToRemove > 0) {
        const newText = text.substring(0, cursorPos - spacesToRemove) + text.substring(cursorPos);
        const newCursorPos = cursorPos - spacesToRemove;
        
        setContent(newText);
        setTimeout(() => {
          textarea.setSelectionRange(newCursorPos, newCursorPos);
        }, 0);
        
        return true; // Indicate that we handled the backspace
      }
    }
    
    return false; // Let normal backspace behavior handle it
  };

  // Autosave effect
  useEffect(() => {
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Check if there are unsaved changes
    const hasChanges = lastSavedRef.current.title !== title || lastSavedRef.current.content !== content;

    // Only set timeout if there are actual changes to save
    if (hasChanges) {
      // Set new timeout for autosave
      timeoutRef.current = setTimeout(() => {
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
      }, 2000); // 2 seconds delay
    }

    // Cleanup function
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [note, title, content, onSave]);

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
    if (title !== lastSavedRef.current.title) {
      if (saveStatus === "saved") {
        setSaveStatus("idle");
      }
    }
  }, [title, saveStatus]);

  const handleCreateAtomicNotes = async () => {
    if (isGeneratingAtomicNotes) return;

    console.log("Create Atomic Notes button clicked");
    console.log("Content length:", content.length);
    console.log("Content preview:", content.substring(0, 100) + "...");

    setIsGeneratingAtomicNotes(true);

    try {
      const atomicNotes = await generateAtomicNotes(content);
      console.log("Generated atomic notes:", atomicNotes);
      
      if (onCreateAtomicNotes && atomicNotes.length > 0) {
        console.log("Calling onCreateAtomicNotes with", atomicNotes.length, "notes");
        onCreateAtomicNotes(atomicNotes);
      } else {
        console.log("No atomic notes generated or no callback function");
      }
    } catch (error) {
      console.error("Error in handleCreateAtomicNotes:", error);
    }

    setIsGeneratingAtomicNotes(false);
  };

  // Handle text selection for context menu
  const handleTextSelection = useCallback(() => {
    const selection = window.getSelection();
    const selectedText = selection?.toString().trim() || "";
    
    // For textarea elements (regular notes, atomic notes, structure notes)
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      
      if (start !== end) {
        const textareaSelected = textarea.value.substring(start, end).trim();
        if (textareaSelected.length > 0) {
          setSelectedText(textareaSelected);
          return;
        }
      }
    }
    
    // For div elements (hub notes) - use window selection
    if (selectedText.length > 0) {
      setSelectedText(selectedText);
    } else {
      setSelectedText("");
      setShowContextMenu(false);
    }
  }, []);

  // Handle right-click context menu
  const handleContextMenu = useCallback((event: React.MouseEvent) => {
    // Always prevent default context menu initially
    event.preventDefault();
    
    // Check for selected text at the time of right-click
    let currentSelectedText = "";
    
    // For textarea elements
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      
      if (start !== end) {
        currentSelectedText = textarea.value.substring(start, end).trim();
      }
    } else {
      // For div elements (hub notes) - use window selection
      const selection = window.getSelection();
      currentSelectedText = selection?.toString().trim() || "";
    }
    
    // Only show our custom context menu if there's selected text
    if (currentSelectedText.length > 0) {
      setSelectedText(currentSelectedText);
      setContextMenuPosition({ x: event.clientX, y: event.clientY });
      setShowContextMenu(true);
    }
  }, []);

  // Handle defining a term
  const handleDefineTerm = async () => {
    if (!selectedText || isDefiningTerm) return;

    console.log("Starting term definition for:", selectedText);

    // Set loading state immediately for instant feedback
    // DON'T hide context menu yet - keep it visible to show loading state
    setIsDefiningTerm(true);

    try {
      // Get some context around the selected term
      let textContent = "";
      let context = "";
      
      // For textarea elements (regular notes, atomic notes, structure notes)
      if (textareaRef.current) {
        textContent = textareaRef.current.value;
      } else {
        // For hub notes and other div-based content
        textContent = content;
      }
      
      const termIndex = textContent.indexOf(selectedText);
      if (termIndex !== -1) {
        const contextStart = Math.max(0, termIndex - 100);
        const contextEnd = Math.min(textContent.length, termIndex + selectedText.length + 100);
        context = textContent.substring(contextStart, contextEnd);
      }

      console.log("About to call generateTermDefinition with context:", context.substring(0, 50) + "...");

      const definition = await generateTermDefinition(selectedText, context);
      
      console.log("Received definition:", definition);
      
      if (definition && onCreateAtomicNotes) {
        console.log("Creating atomic note with definition");
        // Create an atomic note with the definition
        onCreateAtomicNotes([{
          title: definition.title,
          content: definition.content
        }]);
        console.log("Called onCreateAtomicNotes successfully");
      } else {
        console.log("Failed to create atomic note:", {
          hasDefinition: !!definition,
          hasCallback: !!onCreateAtomicNotes
        });
      }
    } catch (error) {
      console.error("Error defining term:", error);
    } finally {
      // Hide context menu and reset state after operation completes
      setShowContextMenu(false);
      setIsDefiningTerm(false);
      setSelectedText("");
    }
  };

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contextMenuRef.current && 
          !contextMenuRef.current.contains(event.target as Node)) {
        setShowContextMenu(false);
      }
    };

    if (showContextMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showContextMenu]);

  return (
    <div className="h-full flex flex-col max-w-4xl mx-auto">
      {/* Title Section - Only show for regular notes */}
      {!note.isAtomic && (
        <div className="pt-6 pb-3 mb-4">
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
            placeholder="Note title"
            className="text-3xl font-bold border-none px-0 py-0 focus-visible:ring-0 focus:ring-0 focus:outline-none bg-transparent shadow-none rounded-none outline-none h-auto w-full placeholder:text-muted-foreground/40 break-words overflow-wrap-anywhere resize-none overflow-hidden"
            rows={1}
            style={{
              minHeight: "auto",
              height: "auto",
              wordWrap: "break-word",
              overflowWrap: "anywhere",
            }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = "auto";
              target.style.height = target.scrollHeight + "px";
            }}
            readOnly={note.isSummary}
            disabled={note.isSummary}
          />
          
          {/* Hub Note status indicator - right below title */}
          {note.isSummary && (
            <div className="mt-3 pt-3 border-t border-border/30">
              <span className="flex items-center text-sm text-muted-foreground font-medium">
                <div className="w-2 h-2 rounded-full bg-blue-500 mr-2"></div>
                Hub Note • Read-only • Manage linked notes below
              </span>
            </div>
          )}
          
          {/* Remove atomic note links for summary notes - they'll be managed below */}
        </div>
      )}

      {/* Content Section */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 flex overflow-hidden">
          {/* Simple Textarea Editor */}
          <div className="flex flex-col flex-1 overflow-hidden">
            {note.isAtomic ? (
              /* Card-style container for atomic notes */
              <div className="bg-card border border-border rounded-xl p-0 shadow-lg hover:shadow-xl transition-shadow duration-200 max-w-4xl mx-auto w-full">
                {/* Card Header with back link */}
                {note.sourceNoteId && notes && onSelectNote && (
                  <div className="px-8 pt-6 pb-3 border-b border-border/50">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-foreground p-1 h-auto -ml-1 max-w-full min-w-0"
                      onClick={() => {
                        const sourceNote = notes.find(n => n.id === note.sourceNoteId);
                        if (sourceNote) {
                          onSelectNote(sourceNote);
                        }
                      }}
                    >
                      <ArrowLeft className="h-3 w-3 mr-1 flex-shrink-0" />
                      <span className="text-xs truncate text-left">
                        {notes.find(n => n.id === note.sourceNoteId)?.title || "Source Note"}
                      </span>
                    </Button>
                  </div>
                )}
                
                {/* Card Content */}
                <div className="p-8">
                  <textarea
                    ref={textareaRef}
                    value={content}
                    onChange={handleContentChange}
                    onKeyDown={handleKeyDown}
                    onSelect={handleTextSelection}
                    onContextMenu={handleContextMenu}
                    placeholder="Write your atomic note here..."
                    className="w-full resize-none border-none focus:ring-0 focus:outline-none p-0 bg-transparent text-base leading-relaxed shadow-none rounded-none outline-none min-h-[400px] overflow-y-auto placeholder:text-muted-foreground/50 break-words overflow-wrap-anywhere"
                    style={{
                      fontFamily: "inherit",
                      fontSize: "16px",
                      lineHeight: "1.6em",
                      wordWrap: "break-word",
                      overflowWrap: "anywhere",
                    }}
                  />
                </div>
                
                {/* Card Footer with metadata */}
                <div className="px-8 pb-6 pt-3 border-t border-border/50">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Atomic Note</span>
                    <span>{new Date(note.createdAt).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}</span>
                  </div>
                </div>
              </div>
            ) : note.isSummary ? (
              /* Hub Note - Show only description, no content editing */
              <div className="max-w-4xl mx-auto w-full">
                <div className="p-6 bg-muted/20 rounded-lg border border-border/30">
                  <div 
                    className="text-base text-muted-foreground leading-relaxed break-words overflow-wrap-anywhere cursor-text select-text"
                    onMouseUp={handleTextSelection}
                    onContextMenu={handleContextMenu}
                    style={{ userSelect: 'text' }}
                  >
                    {content}
                  </div>
                </div>
                
                {/* Hub Note Manager - Right after description */}
                {notes && onSelectNote && (
                  <div className="mt-6">
                    <HubNoteManager
                      hubNote={note}
                      allAtomicNotes={notes.filter(n => n.isAtomic)}
                      onUpdateHubNote={onSave}
                      onSelectNote={onSelectNote}
                    />
                  </div>
                )}
              </div>
            ) : note.noteType === 'structured' ? (
              /* Structure Note - Two-column layout with sources sidebar */
              <div className="flex h-full gap-6">
                {/* Main Content Area */}
                <div className="flex-1 flex flex-col">
                  <MarkdownEditor
                    value={content}
                    onChange={(value) => {
                      setContent(value);
                      // Set status to idle when content changes
                      if (saveStatus === "saved") {
                        setSaveStatus("idle");
                      }
                      // Add to history with a delay to avoid too many entries
                      if (historyTimeoutRef.current) {
                        clearTimeout(historyTimeoutRef.current);
                      }
                      historyTimeoutRef.current = setTimeout(() => {
                        if (!isUndoRedoRef.current) {
                          addToHistory(value);
                        }
                      }, 500);
                    }}
                    onSelect={handleTextSelection}
                    onContextMenu={handleContextMenu}
                    textareaRef={textareaRef}
                    placeholder="Write your structure note in markdown..."
                  />
                </div>
                
                {/* Sources Sidebar */}
                <div className="w-80 flex-shrink-0 border-l border-border/30 pl-6">
                  {notes && onSelectNote && (
                    <StructureNoteManager
                      structureNote={note}
                      allAtomicNotes={notes.filter(n => n.isAtomic)}
                      onUpdateStructureNote={onSave}
                      onSelectNote={onSelectNote}
                    />
                  )}
                </div>
              </div>
            ) : (
              /* Regular textarea for source notes */
              <textarea
                ref={textareaRef}
                value={content}
                onChange={handleContentChange}
                onKeyDown={handleKeyDown}
                onSelect={handleTextSelection}
                onContextMenu={handleContextMenu}
                placeholder="Write your note here..."
                className="flex-1 resize-none border-none focus:ring-0 focus:outline-none p-0 bg-transparent text-base leading-relaxed shadow-none rounded-none outline-none min-h-0 w-full overflow-y-auto break-words overflow-wrap-anywhere"
                style={{
                  fontFamily: "inherit",
                  fontSize: "16px",
                  lineHeight: "1.5em",
                  wordWrap: "break-word",
                  overflowWrap: "anywhere",
                }}
              />
            )}
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
                      <span>Save</span>
                      <kbd className="px-2 py-1 text-xs bg-muted rounded">
                        {cmdKey}+S
                      </kbd>
                    </div>
                </div>
                <div className="border-t border-border pt-2 mt-2">
                  <div className="text-xs font-medium text-muted-foreground mb-2">Lists</div>
                  <div className="space-y-1 text-xs">
                    <div>&bull; Start with &quot;1. &quot; for numbered lists</div>
                    <div>&bull; Start with &quot;- &quot;, &quot;* &quot;, or &quot;&bull; &quot; for bullet lists</div>
                    <div>• Press Enter to continue list</div>
                    <div>• Press Tab to indent (4 spaces), Shift+Tab to unindent</div>
                    <div>• Press Backspace to remove entire indent levels</div>
                    <div>• Press Enter on empty item to end list</div>
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
          {!note.isSummary && (hasUnsavedChanges() || saveStatus === "saving") && (
            <Button
              onClick={handleManualSave}
              disabled={saveStatus === "saving"}
              size="sm"
              className="font-medium"
            >
              {getSaveButtonContent()}
            </Button>
          )}
          {/* Only show Create Atomic Notes button for regular notes */}
          {!note.isAtomic && !note.isSummary && note.noteType !== 'structured' && (
            <Button
              onClick={handleCreateAtomicNotes}
              size="sm"
              className="font-medium"
              disabled={!content.trim() || content.trim().length < 100 || isGeneratingAtomicNotes}
              title={content.trim().length < 100 ? "Note needs more content to split into atomic notes" : "Split this note into smaller, focused notes"}
            >
              {isGeneratingAtomicNotes ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2" />
                  Generating...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Create Atomic Notes
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Context Menu for defining terms */}
      {showContextMenu && selectedText && (
        <div
          ref={contextMenuRef}
          className="fixed z-50 bg-background border border-border rounded-lg shadow-xl py-1 min-w-48"
          style={{
            left: contextMenuPosition.x,
            top: contextMenuPosition.y,
          }}
        >
          <Button
            variant="ghost"
            size="sm"
            className={`w-full justify-start px-3 py-2 h-auto text-sm font-normal hover:bg-accent transition-all duration-200 ${
              isDefiningTerm ? 'bg-accent/50 cursor-not-allowed' : ''
            }`}
            onClick={handleDefineTerm}
            disabled={isDefiningTerm}
          >
            {isDefiningTerm ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full mr-2 flex-shrink-0" />
                <span className="text-primary font-medium">Defining...</span>
              </>
            ) : (
              <>
                <BookOpen className="h-4 w-4 mr-2 flex-shrink-0" />
                <span>Define &quot;{selectedText.length > 20 ? selectedText.substring(0, 20) + "..." : selectedText}&quot;</span>
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

