"use client";

import { Note } from "@/lib/types";
import { useState } from "react";
import { Button } from "./ui/button";
import { ArrowLeft, X, Plus, Trash2, Layers } from "lucide-react";
import { ScrollArea } from "./ui/scroll-area";

interface AtomicCardsViewProps {
  notes: Note[];
  allNotes: Note[];
  onSave: (note: Note) => void;
  onSelectNote: (note: Note) => void;
  onCloseCard: (noteId: string) => void;
  onCreateTopic?: (selectedAtomicNotes: Note[]) => Promise<void>;
  onCreateStructuredNote?: (selectedAtomicNotes: Note[]) => void;
  onDeleteNote?: (noteId: string) => void;
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
}: AtomicCardsViewProps) {
  const [cardStates, setCardStates] = useState<CardState>({});
  const [isCreatingTopic, setIsCreatingTopic] = useState(false);
  const [isCreatingStructured, setIsCreatingStructured] = useState(false);

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
              className="text-muted-foreground/70 hover:text-foreground hover:bg-accent/50 p-2 h-auto -ml-2 rounded-lg transition-colors flex-1 min-w-0 mr-2"
              onClick={() => {
                const sourceNote = allNotes.find(n => n.id === note.sourceNoteId);
                if (sourceNote) {
                  onSelectNote(sourceNote);
                }
              }}
            >
              <ArrowLeft className="h-3 w-3 mr-2 flex-shrink-0" />
              <span className="text-xs font-medium truncate text-left">
                {allNotes.find(n => n.id === note.sourceNoteId)?.title || "Source Note"}
              </span>
            </Button>
          )}
          
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
            value={content}
            onChange={(e) => updateCardContent(note.id, e.target.value)}
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
    </div>
  );
} 