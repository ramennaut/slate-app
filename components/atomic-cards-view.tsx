"use client";

import { Note } from "@/lib/types";
import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "./ui/button";
import { ArrowLeft, X, Plus, Trash2, Layers, BookOpen } from "lucide-react";
import { ScrollArea } from "./ui/scroll-area";
import { generateTermDefinition } from "@/lib/openai";

interface AtomicCardsViewProps {
  notes: Note[];
  allNotes: Note[];
  onSave: (note: Note) => void;
  onSelectNote: (note: Note) => void;
  onCloseCard: (noteId: string) => void;
  onCreateTopic?: (selectedAtomicNotes: Note[]) => Promise<void>;
  onCreateStructuredNote?: (selectedAtomicNotes: Note[]) => void;
  onDeleteNote?: (noteId: string) => void;
  onCreateAtomicNotes?: (atomicNotes: Array<{ title: string; content: string }>) => void;
}

interface CardState {
  [noteId: string]: {
    content: string;
    hasUnsavedChanges: boolean;
  };
}

export default function AtomicCardsView({
  notes,
  allNotes,
  onSave,
  onSelectNote,
  onCloseCard,
  onCreateTopic,
  onCreateStructuredNote,
  onDeleteNote,
  onCreateAtomicNotes,
}: AtomicCardsViewProps) {
  const [cardStates, setCardStates] = useState<CardState>({});
  const [isCreatingTopic, setIsCreatingTopic] = useState(false);
  const [isCreatingStructured, setIsCreatingStructured] = useState(false);
  
  // Text selection and context menu state
  const [selectedText, setSelectedText] = useState("");
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [isDefiningTerm, setIsDefiningTerm] = useState(false);
  const [activeTextareaId, setActiveTextareaId] = useState<string | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const textareaRefs = useRef<{[key: string]: HTMLTextAreaElement | null}>({});

  const handleCreateTopic = async () => {
    if (!onCreateTopic || notes.length < 1) return;
    
    setIsCreatingTopic(true);
    
    try {
      await onCreateTopic(notes); // Use all notes in the flash card view
    } catch (error) {
      console.error('Failed to create topic:', error);
    } finally {
      setIsCreatingTopic(false);
    }
  };

  const handleCreateStructuredNote = () => {
    if (!onCreateStructuredNote || notes.length === 0) return;
    
    setIsCreatingStructured(true);
    
    try {
      onCreateStructuredNote(notes); // Use all notes in the flash card view
    } catch (error) {
      console.error('Failed to create structured note:', error);
    } finally {
      setIsCreatingStructured(false);
    }
  };

  const getCardContent = (note: Note) => {
    return cardStates[note.id]?.content ?? note.content;
  };

  const hasUnsavedChanges = (note: Note) => {
    return cardStates[note.id]?.hasUnsavedChanges ?? false;
  };

  const updateCardContent = (noteId: string, content: string) => {
    setCardStates(prev => ({
      ...prev,
      [noteId]: {
        content,
        hasUnsavedChanges: true
      }
    }));
  };

  const saveCard = (note: Note) => {
    const currentContent = getCardContent(note);
    const updatedNote = { ...note, content: currentContent };
    onSave(updatedNote);
    
    // Clear the local state after saving
    setCardStates(prev => {
      const newState = { ...prev };
      delete newState[note.id];
      return newState;
    });
  };

  // Handle text selection for context menu
  const handleTextSelection = useCallback((noteId: string) => {
    const textarea = textareaRefs.current[noteId];
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    
    if (start !== end) {
      const selected = textarea.value.substring(start, end).trim();
      if (selected.length > 0) {
        setSelectedText(selected);
        setActiveTextareaId(noteId);
      } else {
        setSelectedText("");
        setShowContextMenu(false);
        setActiveTextareaId(null);
      }
    } else {
      setSelectedText("");
      setShowContextMenu(false);
      setActiveTextareaId(null);
    }
  }, []);

  // Handle right-click context menu
  const handleContextMenu = useCallback((event: React.MouseEvent, noteId: string) => {
    // Always prevent default context menu initially
    event.preventDefault();
    
    // Check for selected text at the time of right-click
    const textarea = textareaRefs.current[noteId];
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    
    if (start !== end) {
      const currentSelectedText = textarea.value.substring(start, end).trim();
      
      // Only show our custom context menu if there's selected text
      if (currentSelectedText.length > 0) {
        setSelectedText(currentSelectedText);
        setActiveTextareaId(noteId);
        setContextMenuPosition({ x: event.clientX, y: event.clientY });
        setShowContextMenu(true);
      }
    }
  }, []);

  // Handle defining a term
  const handleDefineTerm = async () => {
    if (!selectedText || isDefiningTerm || !activeTextareaId) return;

    console.log("Starting term definition in flash cards for:", selectedText);

    // Set loading state immediately for instant feedback
    // DON'T hide context menu yet - keep it visible to show loading state
    setIsDefiningTerm(true);

    try {
      // Get context from the active textarea
      const textarea = textareaRefs.current[activeTextareaId];
      const textContent = textarea?.value || "";
      
      let context = "";
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
        console.log("Creating atomic note with definition in flash cards");
        // Create an atomic note with the definition
        onCreateAtomicNotes([{
          title: definition.title,
          content: definition.content
        }]);
        console.log("Called onCreateAtomicNotes successfully in flash cards");
      } else {
        console.log("Failed to create atomic note in flash cards:", {
          hasDefinition: !!definition,
          hasCallback: !!onCreateAtomicNotes
        });
      }
    } catch (error) {
      console.error("Error defining term in flash cards:", error);
    } finally {
      // Hide context menu and reset state after operation completes
      setShowContextMenu(false);
      setIsDefiningTerm(false);
      setSelectedText("");
      setActiveTextareaId(null);
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

  const renderCard = (note: Note) => {
    const content = getCardContent(note);
    const unsaved = hasUnsavedChanges(note);

    return (
      <div
        key={note.id}
        className={`bg-card border rounded-2xl p-0 shadow-md hover:shadow-lg transition-all duration-300 w-full max-w-md group hover:scale-[1.02] ${
          'border-border'
        }`}
      >
        {/* Card Header */}
        <div className="px-5 pt-4 pb-3 border-b border-border/30 flex items-center justify-between">
          {/* Back link to source */}
          {note.sourceNoteId && (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground/70 hover:text-foreground hover:bg-accent/50 p-2 h-auto -ml-2 rounded-lg transition-colors min-w-0 max-w-[180px]"
              onClick={() => {
                const sourceNote = allNotes.find(n => n.id === note.sourceNoteId);
                if (sourceNote) {
                  onSelectNote(sourceNote);
                }
              }}
            >
              <ArrowLeft className="h-3 w-3 mr-2 flex-shrink-0" />
              <span className="text-xs font-medium truncate">
                {(() => {
                  const sourceNote = allNotes.find(n => n.id === note.sourceNoteId);
                  if (!sourceNote) return "Source Note";
                  
                  // If source is an atomic note, show its reference number
                  if (sourceNote.isAtomic && sourceNote.globalNumber) {
                    return `AN-${sourceNote.globalNumber}`;
                  }
                  
                  // Otherwise show the title for regular notes
                  return sourceNote.title || "Source Note";
                })()}
              </span>
            </Button>
          )}
          
          {/* Spacer to push close button to the right */}
          <div className="flex-1"></div>
          
          {/* Close button */}
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 p-1.5 h-auto rounded-lg transition-colors flex-shrink-0"
            onClick={() => onCloseCard(note.id)}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Card Content */}
        <div className="p-5">
          <textarea
            ref={(el) => {
              textareaRefs.current[note.id] = el;
            }}
            value={content}
            onChange={(e) => updateCardContent(note.id, e.target.value)}
            onSelect={() => handleTextSelection(note.id)}
            onContextMenu={(e) => handleContextMenu(e, note.id)}
            placeholder="Write your atomic note here..."
            className="w-full h-48 resize-none border-none focus:ring-0 focus:outline-none p-0 bg-transparent text-sm leading-relaxed shadow-none rounded-none outline-none overflow-y-auto placeholder:text-muted-foreground/40 selection:bg-primary/20 break-words overflow-wrap-anywhere"
            style={{
              fontFamily: "inherit",
              fontSize: "14px",
              lineHeight: "1.6em",
              wordWrap: "break-word",
              overflowWrap: "anywhere",
            }}
          />
        </div>

        {/* Card Footer */}
        <div className="px-5 pb-4 pt-3 border-t border-border/30 bg-muted/20 rounded-b-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground/80 font-medium">
                {new Date(note.createdAt).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric'
                })}
              </span>
              {/* Atomic note reference number */}
              {note.isAtomic && note.globalNumber && (
                <>
                  <span className="text-xs text-muted-foreground/60">•</span>
                  <span className="text-xs font-semibold text-muted-foreground/80">
                    #AN-{note.globalNumber}
                  </span>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unsaved && (
                <Button
                  size="sm"
                  onClick={() => saveCard(note)}
                  className="h-7 px-3 text-xs font-medium bg-primary/90 hover:bg-primary shadow-sm"
                >
                  Save
                </Button>
              )}
              {!unsaved && (
                <div className="flex items-center gap-1 text-muted-foreground/60">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                  <span className="text-xs">Saved</span>
                </div>
              )}
              
              {/* Delete button in lower right */}
              {onDeleteNote && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 p-1.5 h-7 w-7 rounded-lg transition-colors"
                  onClick={() => onDeleteNote(note.id)}
                  title="Delete this atomic note"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (notes.length === 0) {
    return null;
  }

  return (
    <div className="h-full p-4 sm:p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <Layers className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold text-foreground">
              Flash Card View
            </h2>
            <span className="px-2.5 py-1 bg-primary/10 text-primary text-xs font-semibold rounded-full">
              {notes.length}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              notes.forEach(note => onCloseCard(note.id));
            }}
            className="text-xs font-medium"
          >
            <X className="h-3 w-3 mr-1" />
            Clear All
          </Button>
        </div>
        <p className="text-sm text-muted-foreground/80 ml-6">
          {(onCreateTopic || onCreateStructuredNote) ? "Create hub notes or structure notes from all notes in this view" : "Click and edit multiple notes simultaneously"}
        </p>
      </div>
      
      <ScrollArea className="h-[calc(100%-100px)]">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-6">
          {notes.map(note => renderCard(note))}
        </div>
      </ScrollArea>

      {/* Floating Create Buttons */}
      {(onCreateTopic || onCreateStructuredNote) && (
        <div className="fixed bottom-6 right-6 z-50 flex gap-3">
          {onCreateTopic && (
            <Button
              onClick={handleCreateTopic}
              size="sm"
              className="font-medium shadow-lg hover:shadow-xl transition-shadow"
              disabled={notes.length < 1 || isCreatingTopic || isCreatingStructured}
              title={notes.length < 1 ? "Need at least 1 note to create a topic" : "Create a hub note from all notes in this view"}
            >
              {isCreatingTopic ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create a Hub ({notes.length})
                </>
              )}
            </Button>
          )}
          
          {onCreateStructuredNote && (
            <Button
              onClick={handleCreateStructuredNote}
              size="sm"
              variant="default"
              className="font-medium shadow-lg hover:shadow-xl transition-shadow"
              disabled={notes.length === 0 || isCreatingTopic || isCreatingStructured}
              title="Create a structure note from all notes in this view"
            >
              {isCreatingStructured ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Expand this Topic ({notes.length})
                </>
              )}
            </Button>
          )}
        </div>
      )}

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