"use client";

import { Note } from "@/lib/types";
import { useState, useRef, useEffect } from "react";
import { Button } from "./ui/button";
import { Plus, X, Link, Unlink, Search } from "lucide-react";
import { ScrollArea } from "./ui/scroll-area";
import { generateHubNoteContent } from "@/lib/openai";

interface HubNoteManagerProps {
  hubNote: Note;
  allAtomicNotes: Note[];
  onUpdateHubNote: (updatedNote: Note) => void;
  onSelectNote: (note: Note) => void;
}

export default function HubNoteManager({
  hubNote,
  allAtomicNotes,
  onUpdateHubNote,
  onSelectNote
}: HubNoteManagerProps) {
  const [showAddNotes, setShowAddNotes] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  
  const linkedAtomicNoteIds = hubNote.linkedAtomicNoteIds || [];
  const linkedNotes = allAtomicNotes.filter(note => 
    linkedAtomicNoteIds.includes(note.id)
  );
  const availableNotes = allAtomicNotes.filter(note => 
    !linkedAtomicNoteIds.includes(note.id)
  );

  // Filter available notes based on search query
  const filteredAvailableNotes = availableNotes.filter(note =>
    note.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current && 
        !popoverRef.current.contains(event.target as Node) &&
        addButtonRef.current &&
        !addButtonRef.current.contains(event.target as Node)
      ) {
        setShowAddNotes(false);
        setSearchQuery("");
      }
    };

    if (showAddNotes) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showAddNotes]);

  const addAtomicNote = (atomicNote: Note) => {
    const newLinkedIds = [...linkedAtomicNoteIds, atomicNote.id];
    const allLinkedNotes = allAtomicNotes.filter(note => 
      newLinkedIds.includes(note.id)
    );

    // Keep the existing description since hub notes only have a 1-liner
    const updatedHubNote: Note = {
      ...hubNote,
      linkedAtomicNoteIds: newLinkedIds,
    };

    onUpdateHubNote(updatedHubNote);
    setShowAddNotes(false);
    setSearchQuery("");
  };

  const removeAtomicNote = (atomicNoteId: string) => {
    const newLinkedIds = linkedAtomicNoteIds.filter(id => id !== atomicNoteId);
    
    if (newLinkedIds.length < 2) {
      // Don't allow removing if it would leave less than 2 linked notes
      return;
    }

    // Keep the existing description since hub notes only have a 1-liner
    const updatedHubNote: Note = {
      ...hubNote,
      linkedAtomicNoteIds: newLinkedIds,
    };

    onUpdateHubNote(updatedHubNote);
  };

  const getPreviewText = (content: string) => {
    // Use a more generous length for previews, with minimum of 40 characters
    const maxLength = Math.max(120, 40);
    return content.trim().substring(0, maxLength).replace(/\n/g, ' ') + (content.length > maxLength ? '...' : '');
  };

  return (
    <div className="border-t border-border/30 pt-4 mt-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Link className="h-4 w-4" />
          Linked Atomic Notes ({linkedNotes.length})
        </h3>
        <div className="relative">
          <Button
            onClick={() => setShowAddNotes(!showAddNotes)}
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs"
            ref={addButtonRef}
          >
            <Plus className="h-3 w-3 mr-1" />
            Add Note
          </Button>
          
          {/* Search Popover */}
          {showAddNotes && (
            <div 
              ref={popoverRef}
              className="absolute top-full right-0 mt-2 w-80 border border-border/30 rounded-lg p-3 bg-background shadow-lg z-50"
            >
              <h4 className="text-xs font-medium text-muted-foreground mb-3">
                Search Atomic Notes
              </h4>
              
              {/* Search Bar */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                <input
                  type="text"
                  placeholder="Search notes by content..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm border border-border/30 rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30"
                  autoFocus
                />
              </div>
              
              {/* Search Results */}
              {searchQuery.trim() && (
                <ScrollArea className="max-h-32">
                  <div className="space-y-1">
                    {filteredAvailableNotes.map(note => (
                      <button
                        key={note.id}
                        onClick={() => addAtomicNote(note)}
                        className="w-full text-left p-2 text-xs text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded transition-colors"
                      >
                        {getPreviewText(note.content)}
                      </button>
                    ))}
                    {filteredAvailableNotes.length === 0 && (
                      <div className="text-xs text-muted-foreground/60 text-center py-2">
                        No notes found matching "{searchQuery}"
                      </div>
                    )}
                  </div>
                </ScrollArea>
              )}
              
              {!searchQuery.trim() && (
                <div className="text-xs text-muted-foreground/60 text-center py-2">
                  Start typing to search for atomic notes...
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Linked Notes List */}
      <div className="space-y-2 mb-4">
        {linkedNotes.map(note => (
          <div
            key={note.id}
            className="flex items-center justify-between p-2 bg-muted/30 rounded-lg border border-border/20"
          >
            <button
              onClick={() => onSelectNote(note)}
              className="flex-1 text-left text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {getPreviewText(note.content)}
            </button>
            <Button
              onClick={() => removeAtomicNote(note.id)}
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive ml-2"
              disabled={linkedNotes.length <= 2}
              title={linkedNotes.length <= 2 ? "Hub notes must have at least 2 linked notes" : "Remove from hub note"}
            >
              <Unlink className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
} 