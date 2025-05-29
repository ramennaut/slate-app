"use client";

import { Note } from "@/lib/types";
import { useState, useRef, useEffect } from "react";
import { Button } from "./ui/button";
import { Plus, Link, Unlink, Search, BookOpen } from "lucide-react";
import { ScrollArea } from "./ui/scroll-area";
import { generateHubNoteContent } from "@/lib/openai";

interface HubNoteManagerProps {
  hubNote: Note;
  allAtomicNotes: Note[];
  onUpdateHubNote: (updatedNote: Note) => void;
  onSelectNote: (note: Note) => void;
  onAddTrainOfThoughtToStructuredNote?: (hubNote: Note, selectedStructuredNote?: Note) => Promise<void>;
  allStructuredNotes?: Note[];
}

export default function HubNoteManager({
  hubNote,
  allAtomicNotes,
  onUpdateHubNote,
  onSelectNote,
  onAddTrainOfThoughtToStructuredNote,
  allStructuredNotes
}: HubNoteManagerProps) {
  const [showAddNotes, setShowAddNotes] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isUpdatingHub, setIsUpdatingHub] = useState(false);
  const [showStructureNotes, setShowStructureNotes] = useState(false);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const structureButtonRef = useRef<HTMLButtonElement>(null);
  const structurePopoverRef = useRef<HTMLDivElement>(null);
  
  const linkedAtomicNoteIds = hubNote.linkedAtomicNoteIds || [];
  const linkedNotes = allAtomicNotes.filter(note => 
    linkedAtomicNoteIds.includes(note.id)
  );
  const availableNotes = allAtomicNotes.filter(note => 
    !linkedAtomicNoteIds.includes(note.id)
  );

  // Enhanced search with better matching and ranking
  const getSearchResults = () => {
    const query = searchQuery.toLowerCase().trim();
    
    // If no query, show all available notes
    if (!query) {
      return availableNotes.sort((a, b) => {
        // Sort by global number if available, otherwise by creation date (newest first)
        if (a.globalNumber && b.globalNumber) {
          return b.globalNumber - a.globalNumber;
        }
        return b.createdAt - a.createdAt;
      });
    }
    
    // Search and rank results
    const results = availableNotes.map(note => {
      let score = 0;
      const content = note.content.toLowerCase();
      const globalNumber = note.globalNumber;
      
      // Reference number matching (highest priority)
      if (globalNumber) {
        const numberStr = globalNumber.toString();
        const anFormat = `an-${numberStr}`;
        
        if (query === numberStr || query === anFormat) {
          score += 100; // Exact match
        } else if (numberStr.startsWith(query) || anFormat.startsWith(query)) {
          score += 80; // Starts with
        } else if (numberStr.includes(query) || anFormat.includes(query)) {
          score += 60; // Contains
        }
      }
      
      // Content matching
      const words = query.split(/\s+/).filter(word => word.length > 0);
      
      for (const word of words) {
        if (content.includes(word)) {
          // Bonus for word boundary matches
          const wordBoundaryRegex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i');
          if (wordBoundaryRegex.test(note.content)) {
            score += 20;
          } else {
            score += 10;
          }
          
          // Extra bonus if word appears early in content
          const position = content.indexOf(word);
          if (position < 50) {
            score += 5;
          }
        }
      }
      
      return { note, score };
    })
    .filter(result => result.score > 0)
    .sort((a, b) => {
      // Sort by score first, then by global number (descending), then by date
      if (a.score !== b.score) {
        return b.score - a.score;
      }
      if (a.note.globalNumber && b.note.globalNumber) {
        return b.note.globalNumber - a.note.globalNumber;
      }
      return b.note.createdAt - a.note.createdAt;
    })
    .map(result => result.note);
    
    return results;
  };

  const searchResults = getSearchResults();

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
      
      if (
        structurePopoverRef.current && 
        !structurePopoverRef.current.contains(event.target as Node) &&
        structureButtonRef.current &&
        !structureButtonRef.current.contains(event.target as Node)
      ) {
        setShowStructureNotes(false);
      }
    };

    if (showAddNotes || showStructureNotes) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showAddNotes, showStructureNotes]);

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

  const handleAddToStructureNote = async (selectedStructuredNote?: Note) => {
    if (!onAddTrainOfThoughtToStructuredNote) return;
    
    try {
      await onAddTrainOfThoughtToStructuredNote(hubNote, selectedStructuredNote);
      setShowStructureNotes(false);
    } catch (error) {
      console.error("Error adding train of thought to structure note:", error);
    }
  };

  return (
    <div>
      <div className="border-t border-border/30 pt-4 mt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Link className="h-4 w-4" />
            Linked Atomic Notes ({linkedNotes.length})
            {isUpdatingHub && (
              <div className="animate-spin h-3 w-3 border-2 border-primary border-t-transparent rounded-full ml-2" />
            )}
          </h3>
          <div className="flex gap-2">
            {/* Add to Structure Note Button */}
            {onAddTrainOfThoughtToStructuredNote && (
              <div className="relative">
                <Button
                  onClick={() => setShowStructureNotes(!showStructureNotes)}
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-xs"
                  ref={structureButtonRef}
                  disabled={isUpdatingHub}
                  title="Add this hub note's insights to a structure note"
                >
                  <BookOpen className="h-3 w-3 mr-1" />
                  Add to Structure Note
                </Button>
                
                {/* Structure Notes Popover */}
                {showStructureNotes && (
                  <div 
                    ref={structurePopoverRef}
                    className="absolute top-full right-0 mt-2 w-[400px] border border-border rounded-lg p-4 bg-background shadow-xl z-50"
                  >
                    <h4 className="text-sm font-medium text-foreground mb-3">
                      Add Train of Thought to Structure Note
                    </h4>
                    
                    <div className="space-y-2">
                      {/* Create New Structure Note Option */}
                      <button
                        onClick={() => handleAddToStructureNote()}
                        className="w-full text-left p-3 text-sm text-foreground bg-background hover:bg-accent rounded-md transition-colors border border-border/30 hover:border-border"
                      >
                        <div className="font-medium mb-1">Create New Structure Note</div>
                        <div className="text-xs text-muted-foreground">
                          Start a new structure note with this train of thought
                        </div>
                      </button>
                      
                      {/* Existing Structure Notes */}
                      {allStructuredNotes && allStructuredNotes.length > 0 && (
                        <>
                          <div className="text-xs font-medium text-muted-foreground mt-3 mb-2">
                            Add to Existing Structure Note
                          </div>
                          <ScrollArea className="max-h-40">
                            <div className="space-y-1">
                              {allStructuredNotes.map(structuredNote => (
                                <button
                                  key={structuredNote.id}
                                  onClick={() => handleAddToStructureNote(structuredNote)}
                                  className="w-full text-left p-2 text-sm text-foreground hover:bg-accent rounded-md transition-colors break-words overflow-wrap-anywhere"
                                >
                                  <div className="font-medium text-xs mb-1">{structuredNote.title}</div>
                                  <div className="text-xs text-muted-foreground line-clamp-2">
                                    {getPreviewText(structuredNote.content)}
                                  </div>
                                </button>
                              ))}
                            </div>
                          </ScrollArea>
                        </>
                      )}
                      
                      {(!allStructuredNotes || allStructuredNotes.length === 0) && (
                        <div className="text-xs text-muted-foreground text-center py-2">
                          No structure notes yet. Create your first one above.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Add Atomic Note Button */}
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
                      placeholder="Search by content or reference number (e.g. AN-1)..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                      autoFocus
                    />
                  </div>
                  
                  {/* Search Results */}
                  <ScrollArea className="h-60">
                    <div className="space-y-2">
                      {searchResults.length > 0 ? (
                        <>
                          {searchQuery.trim() && (
                            <div className="text-xs text-muted-foreground mb-2 px-1">
                              {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} found
                            </div>
                          )}
                          {searchResults.map(note => (
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
                          ))}
                        </>
                      ) : (
                        <div className="text-sm text-muted-foreground text-center py-8">
                          {searchQuery.trim() ? (
                            <>
                              <div className="mb-2">No notes found matching &quot;{searchQuery}&quot;</div>
                              <div className="text-xs">Try searching by content or reference number (e.g. AN-1)</div>
                            </>
                          ) : (
                            <>
                              <div className="mb-2">No atomic notes available</div>
                              <div className="text-xs">Create some atomic notes first to link them to this hub note</div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
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
    </div>
  );
} 