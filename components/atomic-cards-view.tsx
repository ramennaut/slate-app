"use client";

import { Note } from "@/lib/types";
import { useState } from "react";
import { Button } from "./ui/button";
import { ArrowLeft, X } from "lucide-react";
import { ScrollArea } from "./ui/scroll-area";

interface AtomicCardsViewProps {
  notes: Note[];
  allNotes: Note[];
  onSave: (note: Note) => void;
  onSelectNote: (note: Note) => void;
  onCloseCard: (noteId: string) => void;
  isMobile?: boolean;
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
  isMobile
}: AtomicCardsViewProps) {
  const [cardStates, setCardStates] = useState<CardState>({});

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
        className="bg-card border border-border rounded-2xl p-0 shadow-md hover:shadow-lg transition-all duration-300 w-full max-w-md group hover:scale-[1.02]"
      >
        {/* Card Header */}
        <div className="px-5 pt-4 pb-3 border-b border-border/30 flex items-center justify-between">
          {/* Back link to source */}
          {note.sourceNoteId && (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground/70 hover:text-foreground hover:bg-accent/50 p-2 h-auto -ml-2 rounded-lg transition-colors"
              onClick={() => {
                const sourceNote = allNotes.find(n => n.id === note.sourceNoteId);
                if (sourceNote) {
                  onSelectNote(sourceNote);
                }
              }}
            >
              <ArrowLeft className="h-3 w-3 mr-2" />
              <span className="text-xs font-medium truncate">
                {allNotes.find(n => n.id === note.sourceNoteId)?.title || "Source Note"}
              </span>
            </Button>
          )}
          
          {/* Close button */}
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 p-1.5 h-auto ml-2 rounded-lg transition-colors"
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
            className="w-full h-48 resize-none border-none focus:ring-0 focus:outline-none p-0 bg-transparent text-sm leading-relaxed shadow-none rounded-none outline-none overflow-y-auto placeholder:text-muted-foreground/40 selection:bg-primary/20"
            style={{
              fontFamily: "inherit",
              fontSize: "14px",
              lineHeight: "1.6em",
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
        <div className="flex items-center gap-3 mb-2">
          <div className="w-3 h-3 rounded-full bg-gradient-to-r from-primary to-primary/60"></div>
          <h2 className="text-xl font-bold text-foreground">
            Flash Card View
          </h2>
          <span className="px-2.5 py-1 bg-primary/10 text-primary text-xs font-semibold rounded-full">
            {notes.length}
          </span>
        </div>
        <p className="text-sm text-muted-foreground/80 ml-6">
          Click and edit multiple notes simultaneously
        </p>
      </div>
      
      <ScrollArea className="h-[calc(100%-100px)]">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-6">
          {notes.map(note => renderCard(note))}
        </div>
      </ScrollArea>
    </div>
  );
} 