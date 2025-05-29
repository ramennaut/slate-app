"use client";

import { Note } from "@/lib/types";
import { useState, useRef, useEffect } from "react";
import { Button } from "./ui/button";
import { Plus, Link, Unlink, Search } from "lucide-react";
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
  const [isUpdatingHub, setIsUpdatingHub] = useState(false);
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

  const addAtomicNote = async (atomicNote: Note) => {
    const newLinkedIds = [...linkedAtomicNoteIds, atomicNote.id];
    const newLinkedNotes = allAtomicNotes.filter(note => 
      newLinkedIds.includes(note.id)
    );

    setIsUpdatingHub(true);

    try {
      // Generate new hub content based on the updated list of atomic notes
      const hubContent = await generateHubNoteContent(
        newLinkedNotes.map(note => ({ content: note.content }))
      );

      const updatedHubNote: Note = {
        ...hubNote,
        title: hubContent.title,
        content: hubContent.description,
        linkedAtomicNoteIds: newLinkedIds,
        hubTheme: hubContent.title,
      };

      onUpdateHubNote(updatedHubNote);
    } catch (error) {
      console.error("Error regenerating hub note content:", error);
      
      // Fallback: just add the note without regenerating content
      const updatedHubNote: Note = {
        ...hubNote,
        linkedAtomicNoteIds: newLinkedIds,
      };
      onUpdateHubNote(updatedHubNote);
    } finally {
      setIsUpdatingHub(false);
      setShowAddNotes(false);
      setSearchQuery("");
    }
  };

  const removeAtomicNote = async (atomicNoteId: string) => {
    const newLinkedIds = linkedAtomicNoteIds.filter(id => id !== atomicNoteId);
    
    if (newLinkedIds.length < 2) {
      // Don't allow removing if it would leave less than 2 linked notes
      return;
    }

    const newLinkedNotes = allAtomicNotes.filter(note => 
      newLinkedIds.includes(note.id)
    );

    setIsUpdatingHub(true);

    try {
      // Generate new hub content based on the updated list of atomic notes
      const hubContent = await generateHubNoteContent(
        newLinkedNotes.map(note => ({ content: note.content }))
      );

      const updatedHubNote: Note = {
        ...hubNote,
        title: hubContent.title,
        content: hubContent.description,
        linkedAtomicNoteIds: newLinkedIds,
        hubTheme: hubContent.title,
      };

      onUpdateHubNote(updatedHubNote);
    } catch (error) {
      console.error("Error regenerating hub note content:", error);
      
      // Fallback: just remove the note without regenerating content
      const updatedHubNote: Note = {
        ...hubNote,
        linkedAtomicNoteIds: newLinkedIds,
      };
      onUpdateHubNote(updatedHubNote);
    } finally {
      setIsUpdatingHub(false);
    }
  };

  const getPreviewText = (content: string) => {
    // Use much longer length for the wide search interface
    const maxLength = 180;
    return content.trim().substring(0, maxLength).replace(/\n/g, ' ') + (content.length > maxLength ? '...' : '');
  };

  return (
    <div className="border-t border-border/30 pt-4 mt-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Link className="h-4 w-4" />
          Linked Atomic Notes ({linkedNotes.length})
          {isUpdatingHub && (
            <div className="animate-spin h-3 w-3 border-2 border-primary border-t-transparent rounded-full ml-2" />
          )}
        </h3>
        <div className="relative">
          <Button
            onClick={() => setShowAddNotes(!showAddNotes)}
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs"
            ref={addButtonRef}
            disabled={isUpdatingHub}
          >
            <Plus className="h-3 w-3 mr-1" />
            Add Note
          </Button>
          
          {/* Search Popover */}
          {showAddNotes && (
            <div 
              ref={popoverRef}
              className="absolute top-full right-0 mt-2 w-[500px] border border-border rounded-lg p-4 bg-background shadow-xl z-50"
              style={{
                maxHeight: 'calc(100vh - 150px)',
              }}
            >
              <h4 className="text-sm font-medium text-foreground mb-3">
                Add Atomic Note
              </h4>
              
              {/* Search Bar */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search notes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                  autoFocus
                />
              </div>
              
              {/* Search Results */}
              {searchQuery.trim() ? (
                <ScrollArea className="h-60">
                  <div className="space-y-2">
                    {filteredAvailableNotes.length > 0 ? (
                      filteredAvailableNotes.map(note => (
                        <button
                          key={note.id}
                          onClick={() => addAtomicNote(note)}
                          className="w-full text-left p-3 text-sm text-foreground bg-background hover:bg-accent rounded-md transition-colors border border-transparent hover:border-border"
                        >
                          <div className="line-clamp-2 break-words leading-relaxed">
                            {getPreviewText(note.content)}
                          </div>
                          {note.globalNumber && (
                            <div className="text-xs text-muted-foreground mt-2 font-medium">
                              AN-{note.globalNumber}
                            </div>
                          )}
                        </button>
                      ))
                    ) : (
                      <div className="text-sm text-muted-foreground text-center py-4">
                        No notes found matching &quot;{searchQuery}&quot;
                      </div>
                    )}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-sm text-muted-foreground text-center py-4">
                  Start typing to search for atomic notes
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
            className="flex items-start justify-between p-3 bg-muted/30 rounded-lg border border-border/20"
          >
            <button
              onClick={() => onSelectNote(note)}
              className="flex-1 text-left text-sm text-muted-foreground hover:text-foreground transition-colors break-words overflow-wrap-anywhere leading-relaxed"
            >
              {note.content}
              {note.globalNumber && (
                <div className="text-xs text-muted-foreground mt-2 font-medium">
                  AN-{note.globalNumber}
                </div>
              )}
            </button>
            <Button
              onClick={() => removeAtomicNote(note.id)}
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive ml-3 mt-1 flex-shrink-0"
              disabled={linkedNotes.length <= 2 || isUpdatingHub}
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