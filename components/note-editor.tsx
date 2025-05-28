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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const helpRef = useRef<HTMLDivElement>(null);

  // Undo/Redo functionality
  const [history, setHistory] = useState<string[]>([note.content]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const isUndoRedoRef = useRef(false);
  const historyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
  }, [note.id]); // Only reset when note ID changes, not content

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
  };

  // Use useCallback to memoize the autoSave function to prevent stale closures
  const autoSave = useCallback(() => {
    const updatedNote = {
      ...note,
      title: title.trim() || "Untitled Note",
      content,
    };

    // Only save if content has actually changed
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
    if (title !== lastSavedRef.current.title) {
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
          {/* Simple Textarea Editor */}
          <div className="flex flex-col flex-1 overflow-hidden">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={handleContentChange}
              onKeyDown={handleKeyDown}
              placeholder="Write your note here..."
              className="flex-1 resize-none border-none focus:ring-0 focus:outline-none p-0 bg-transparent text-base leading-relaxed shadow-none rounded-none outline-none min-h-0 w-full overflow-y-auto"
              style={{
                fontFamily: "inherit",
                fontSize: "16px",
                lineHeight: "1.5em",
              }}
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
    </div>
  );
}

