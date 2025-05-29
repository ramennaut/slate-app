"use client";

import { Note } from "@/lib/types";
import { useState, useRef, useEffect } from "react";
import { Button } from "./ui/button";
import { Plus, Unlink, Search, Hash } from "lucide-react";
import { ScrollArea } from "./ui/scroll-area";

interface StructureNoteManagerProps {
  structureNote: Note;
  allAtomicNotes: Note[];
  onUpdateStructureNote: (updatedNote: Note) => void;
  onSelectNote: (note: Note) => void;
}

export default function StructureNoteManager({
  structureNote,
  allAtomicNotes,
  onUpdateStructureNote,
  onSelectNote
}: StructureNoteManagerProps) {
  const [showAddNotes, setShowAddNotes] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  
  const linkedAtomicNoteIds = structureNote.linkedAtomicNoteIds || [];
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
    
    // Use the atomic note's global number as reference
    const refId = atomicNote.globalNumber || '?';
    
    // Add a placeholder reference in the content
    const updatedContent = structureNote.content + `\n\n${refId} ${atomicNote.content}\n\n*** Integrate this new idea into the structure above ***`;

    const updatedStructureNote: Note = {
      ...structureNote,
      content: updatedContent,
      linkedAtomicNoteIds: newLinkedIds,
    };

    onUpdateStructureNote(updatedStructureNote);
    setShowAddNotes(false);
    setSearchQuery("");
  };

  const removeAtomicNote = (atomicNoteId: string) => {
    const newLinkedIds = linkedAtomicNoteIds.filter(id => id !== atomicNoteId);
    
    const updatedStructureNote: Note = {
      ...structureNote,
      linkedAtomicNoteIds: newLinkedIds,
    };

    onUpdateStructureNote(updatedStructureNote);
  };

  const getPreviewText = (content: string) => {
    // Split into lines and take only first 3 lines
    const lines = content.trim().split('\n').slice(0, 3);
    const truncatedContent = lines.join('\n');
    
    // If we truncated lines or the content is too long, add ellipsis
    const originalLines = content.trim().split('\n');
    const needsEllipsis = originalLines.length > 3 || truncatedContent.length > 200;
    
    return truncatedContent + (needsEllipsis ? '...' : '');
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Hash className="h-4 w-4" />
          Sources ({linkedNotes.length})
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
            Add
          </Button>
          
          {/* Search Popover */}
          {showAddNotes && (
            <div 
              ref={popoverRef}
              className="absolute top-full right-0 mt-2 w-72 border border-border/30 rounded-lg p-3 bg-background shadow-lg z-50"
            >
              <h4 className="text-xs font-medium text-muted-foreground mb-3">
                Add Source Note
              </h4>
              
              {/* Search Bar */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                <input
                  type="text"
                  placeholder="Search notes..."
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
                        No notes found
                      </div>
                    )}
                  </div>
                </ScrollArea>
              )}
              
              {!searchQuery.trim() && (
                <div className="text-xs text-muted-foreground/60 text-center py-2">
                  Start typing to search...
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Linked Notes List */}
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-2">
          {linkedNotes.map((note) => (
            <div
              key={note.id}
              className="flex items-start gap-2 p-3 bg-muted/30 rounded-lg border border-border/20"
            >
              <div className="flex-shrink-0 mt-0.5">
                <span className="inline-flex items-center px-2 py-1 text-xs bg-primary/10 text-primary rounded-md font-mono">
                  {note.globalNumber || '?'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <button
                  onClick={() => onSelectNote(note)}
                  className="w-full text-left text-xs text-muted-foreground hover:text-foreground transition-colors whitespace-pre-wrap line-clamp-3"
                >
                  {getPreviewText(note.content)}
                </button>
              </div>
              <Button
                onClick={() => removeAtomicNote(note.id)}
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive flex-shrink-0"
                title="Remove source"
              >
                <Unlink className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>

        {linkedNotes.length === 0 && (
          <div className="text-center py-8 text-muted-foreground/60">
            <Hash className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-xs">No sources yet</p>
            <p className="text-xs">Add atomic notes to reference</p>
          </div>
        )}
      </div>
    </div>
  );
} 