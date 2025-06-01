import EmptyState from "./empty-state";
import { Note } from "@/lib/types";
import { Button } from "./ui/button";
import { formatDate } from "@/lib/storage";
import {
  Trash2,
  Plus,
  FileText,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { ScrollArea } from "./ui/scroll-area";
import { useState, useEffect, useCallback, useRef } from "react";

interface NotesSidebarProps {
  notes: Note[];
  onSelectNote: (note: Note) => void;
  createNewNote: () => void;
  onDeleteNote: (id: string) => void;
  onDeleteMultipleNotes?: (ids: string[]) => void;
  activeNoteId?: string;
  isCollapsed: boolean;
  toggleSidebar: () => void;
  isMobile: boolean;
  activeTab?: 'notes' | 'hub';
  onTabChange?: (tab: 'notes' | 'hub') => void;
}

export default function NotesSidebar({
  notes,
  onSelectNote,
  createNewNote,
  onDeleteNote,
  onDeleteMultipleNotes,
  activeNoteId,
  isCollapsed,
  toggleSidebar,
  isMobile,
  activeTab,
  onTabChange,
}: NotesSidebarProps) {
  // State for active tab
  const [activeTabState, setActiveTabState] = useState<'notes' | 'hub'>('notes');
  
  // Use external activeTab if provided, otherwise use internal state
  const currentActiveTab = activeTab ?? activeTabState;
  
  // Helper function to handle tab changes
  const handleTabChange = (tab: 'notes' | 'hub') => {
    if (activeTab === undefined) {
      // If no external control, update internal state
      setActiveTabState(tab);
    }
    // Call the callback if provided
    onTabChange?.(tab);
  };
  
  // State for collapsed sections within tabs
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  
  // State for multi-selection
  const [selectedNoteIds, setSelectedNoteIds] = useState<Set<string>>(new Set());
  const [lastClickedId, setLastClickedId] = useState<string | null>(null);
  
  // Ref for sidebar container to detect outside clicks
  const sidebarRef = useRef<HTMLDivElement>(null);
  
  // Separate notes into categories
  const sourceNotes = notes.filter(note => !note.isAtomic && !note.isSummary && note.noteType !== 'structured');
  const atomicNotes = notes.filter(note => note.isAtomic);
  const hubNotes = notes.filter(note => note.isSummary && (note.noteType === 'hub' || !note.noteType)); // Default to hub if no type specified
  const structuredNotes = notes.filter(note => note.noteType === 'structured');

  // Find the currently selected note (could be source, atomic, or hub)
  const selectedNote = notes.find(note => note.id === activeNoteId);

  // Handle clicking in empty areas to clear selection
  const handleSidebarClick = useCallback((event: React.MouseEvent) => {
    // Only clear selection if clicking without modifier keys
    if (!event.metaKey && !event.ctrlKey && !event.shiftKey) {
      // Check if we're clicking in an empty area (not on a note)
      const target = event.target as HTMLElement;
      const isNoteClick = target.closest('[data-note-item="true"]');
      
      if (!isNoteClick && selectedNoteIds.size > 0) {
        setSelectedNoteIds(new Set());
        setLastClickedId(null);
      }
    }
  }, [selectedNoteIds]);

  // Handle multi-selection click
  const handleNoteClick = useCallback((note: Note, event: React.MouseEvent) => {
    // Always stop propagation to prevent sidebar click handler
    event.stopPropagation();
    
    if (event.metaKey || event.ctrlKey || event.shiftKey) {
      // Prevent text selection during multi-select operations
      event.preventDefault();
    }
    
    if (event.metaKey || event.ctrlKey) {
      // Cmd/Ctrl + click: toggle selection
      const newSelected = new Set(selectedNoteIds);
      if (newSelected.has(note.id)) {
        newSelected.delete(note.id);
      } else {
        newSelected.add(note.id);
      }
      setSelectedNoteIds(newSelected);
      setLastClickedId(note.id);
      // Don't call onSelectNote for multi-select operations
    } else if (event.shiftKey && lastClickedId) {
      // Shift + click: select range
      const allNoteIds = notes.map(n => n.id);
      const lastIndex = allNoteIds.indexOf(lastClickedId);
      const currentIndex = allNoteIds.indexOf(note.id);
      
      if (lastIndex !== -1 && currentIndex !== -1) {
        const start = Math.min(lastIndex, currentIndex);
        const end = Math.max(lastIndex, currentIndex);
        const rangeIds = allNoteIds.slice(start, end + 1);
        
        const newSelected = new Set(selectedNoteIds);
        rangeIds.forEach(id => newSelected.add(id));
        setSelectedNoteIds(newSelected);
      }
      // Don't call onSelectNote for multi-select operations
    } else {
      // Regular click: ALWAYS clear selection and select note
      setSelectedNoteIds(new Set());
      setLastClickedId(note.id);
      onSelectNote(note);
    }
  }, [selectedNoteIds, lastClickedId, notes, onSelectNote]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Delete/Backspace with Cmd/Ctrl or Shift for batch delete
      if ((event.key === 'Delete' || event.key === 'Backspace') && 
          (event.metaKey || event.ctrlKey || event.shiftKey) && 
          selectedNoteIds.size > 0) {
        event.preventDefault();
        
        if (onDeleteMultipleNotes) {
          onDeleteMultipleNotes(Array.from(selectedNoteIds));
        } else {
          // Fallback: delete one by one
          selectedNoteIds.forEach(id => onDeleteNote(id));
        }
        setSelectedNoteIds(new Set());
        setLastClickedId(null);
      }
      
      // Escape to clear selection
      if (event.key === 'Escape') {
        setSelectedNoteIds(new Set());
        setLastClickedId(null);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedNoteIds, onDeleteNote, onDeleteMultipleNotes]);

  // Handle clicks outside sidebar to clear selection
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Only clear selection if we have selected notes and the click is outside the sidebar
      if (selectedNoteIds.size > 0 && 
          sidebarRef.current && 
          !sidebarRef.current.contains(event.target as Node)) {
        setSelectedNoteIds(new Set());
        setLastClickedId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedNoteIds]);

  // Clear selection when active note changes (but not when selection size changes)
  useEffect(() => {
    if (activeNoteId && selectedNoteIds.size > 0) {
      setSelectedNoteIds(new Set());
      setLastClickedId(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeNoteId]); // Only fire when activeNoteId changes, not when selection size changes

  const toggleSection = (sectionName: string) => {
    const newCollapsed = new Set(collapsedSections);
    if (newCollapsed.has(sectionName)) {
      newCollapsed.delete(sectionName);
    } else {
      newCollapsed.add(sectionName);
    }
    setCollapsedSections(newCollapsed);
  };

  const renderNoteItem = (note: Note, isSubNote = false) => {
    const isActive = activeNoteId === note.id;
    const isSelected = selectedNoteIds.has(note.id);
    const isAtomic = note.isAtomic;
    const isHubNote = note.isSummary;

    return (
      <div
        key={note.id}
        data-note-item="true"
        onClick={(event) => handleNoteClick(note, event)}
        onMouseDown={(event) => {
          // Prevent text selection during multi-select operations
          if (event.metaKey || event.ctrlKey || event.shiftKey) {
            event.preventDefault();
          }
        }}
        className={`group relative block rounded-lg cursor-pointer transition-all duration-200 overflow-hidden border select-none ${
          isSelected
            ? "bg-blue-500/5 border-blue-500/20 ring-1 ring-blue-500/10"
            : isActive
            ? "bg-gradient-to-br from-sidebar-primary/10 to-sidebar-primary/5 border-sidebar-primary/20 shadow-sm ring-1 ring-sidebar-primary/10"
            : "bg-white/20 dark:bg-white/3 border-sidebar-border/20 hover:border-sidebar-primary/15 hover:bg-sidebar-accent/40"
        } ${
          isCollapsed ? "flex justify-center items-center h-12" : ""
        } ${
          isSubNote ? "ml-3 border-l-2 border-sidebar-primary/20" : ""
        } ${
          (isAtomic || isHubNote) ? "p-1.5" : "p-2"
        }`}
      >
        {(isActive || isSelected) && !isCollapsed && (
          <div className={`absolute left-0 top-0 bottom-0 w-0.5 ${
            isSelected ? "bg-blue-500" : "bg-sidebar-primary"
          }`} />
        )}

        <div
          className={`min-w-0 ${
            isActive && !isCollapsed ? "pl-2" : ""
          } ${isCollapsed ? "hidden" : ""}`}
        >
          <div className="w-full min-w-0">
            {(isAtomic || isHubNote) ? (
              // Atomic note and Hub note: compact one-line preview like VS Code/Obsidian
              <div className="flex items-center justify-between gap-2">
                <p className={`text-xs line-clamp-1 flex-1 ${
                  isActive
                    ? "text-sidebar-primary/90"
                    : "text-sidebar-foreground/75 group-hover:text-sidebar-foreground"
                }`}>
                  {isHubNote ? note.title : note.content}
                </p>
                <span className="text-xs text-sidebar-foreground/30 font-mono flex-shrink-0">
                  {new Date(note.createdAt).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </span>
              </div>
            ) : (
              // Regular note: title and date
              <>
                <h3
                  className={`text-xs font-medium mb-1 leading-tight line-clamp-1 ${
                    isActive
                      ? "text-sidebar-primary"
                      : "text-sidebar-foreground group-hover:text-sidebar-foreground"
                  }`}
                >
                  {note.title || "Untitled"}
                </h3>
                <p className="text-xs text-sidebar-foreground/35 font-normal">
                  {formatDate(note.createdAt)}
                </p>
              </>
            )}
          </div>
        </div>
        {isCollapsed && (
          <FileText className="h-5 w-5 text-sidebar-foreground/70" />
        )}
      </div>
    );
  };

  return (
    <div
      ref={sidebarRef}
      className={`flex flex-col h-full bg-sidebar border-r border-sidebar-border overflow-hidden w-full`}
      onClick={handleSidebarClick}
    >
      <div className="flex items-center justify-between px-3 py-3 border-b border-sidebar-border/30 bg-sidebar flex-shrink-0 min-h-0">
        <div
          className={`flex items-center gap-2 min-w-0 flex-1 ${
            isCollapsed ? "hidden" : ""
          }`}
        >
          <h2 className="text-sm font-semibold text-sidebar-foreground/80 truncate">
            {selectedNoteIds.size > 0 ? `${selectedNoteIds.size} Selected` : "All Notes"}
          </h2>
          <span className="text-xs text-sidebar-foreground/50 bg-sidebar-accent px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 min-w-0">
            {notes.length}
          </span>
        </div>
        <div
          className={`flex items-center gap-0.5 flex-shrink-0 ${
            isCollapsed ? "w-full justify-center" : "ml-2"
          }`}
        >
          {!isMobile && (
            <Button
              variant="ghost"
              size="icon"
              className={`h-7 w-7 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/80 rounded-md transition-all duration-200 flex-shrink-0 ${
                isCollapsed ? "hidden" : ""
              }`}
              onClick={createNewNote}
              title="Create new note"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          )}
          {selectedNoteIds.size > 0 ? (
            <Button
              variant="ghost"
              size="icon"
              className={`h-7 w-7 rounded-md transition-all duration-200 flex-shrink-0 text-destructive hover:bg-destructive/10 ${
                isCollapsed ? "hidden" : ""
              }`}
              onClick={() => {
                if (onDeleteMultipleNotes) {
                  onDeleteMultipleNotes(Array.from(selectedNoteIds));
                } else {
                  selectedNoteIds.forEach(id => onDeleteNote(id));
                }
                setSelectedNoteIds(new Set());
                setLastClickedId(null);
              }}
              title={`Delete ${selectedNoteIds.size} selected notes`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className={`h-7 w-7 rounded-md transition-all duration-200 flex-shrink-0 ${
                isCollapsed ? "hidden" : ""
              } ${
                selectedNote
                  ? "text-sidebar-foreground/70 hover:text-destructive hover:bg-destructive/10"
                  : "text-sidebar-foreground/40 cursor-not-allowed"
              }`}
              onClick={(event) => {
                event.preventDefault();
                if (selectedNote) {
                  onDeleteNote(selectedNote.id);
                }
              }}
              disabled={!selectedNote}
              title={
                selectedNote
                  ? selectedNote.isAtomic 
                    ? `Delete atomic note: "${selectedNote.content.slice(0, 30)}${selectedNote.content.length > 30 ? '...' : ''}"`
                    : selectedNote.isSummary
                      ? `Delete hub note: "${selectedNote.title}"`
                      : selectedNote.noteType === 'structured'
                        ? `Delete structure note: "${selectedNote.title}"`
                        : `Delete "${selectedNote.title || "Untitled Note"}"`
                  : "No note selected"
              }
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
          {!isMobile && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/80 rounded-md transition-all duration-200 flex-shrink-0"
              onClick={toggleSidebar}
              title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isCollapsed ? (
                <PanelLeftOpen className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      {!isCollapsed && (
        <div className="flex border-b border-sidebar-border/30 bg-sidebar">
          <button
            onClick={() => handleTabChange('notes')}
            className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
              currentActiveTab === 'notes'
                ? 'text-sidebar-primary border-b-2 border-sidebar-primary bg-sidebar-accent/30'
                : 'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/20'
            }`}
          >
            Notes
            <span className="ml-1.5 text-xs bg-sidebar-accent/60 px-1.5 py-0.5 rounded-full">
              {sourceNotes.length + atomicNotes.length}
            </span>
          </button>
          <button
            onClick={() => handleTabChange('hub')}
            className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
              currentActiveTab === 'hub'
                ? 'text-sidebar-primary border-b-2 border-sidebar-primary bg-sidebar-accent/30'
                : 'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/20'
            }`}
          >
            Topics
            <span className="ml-1.5 text-xs bg-sidebar-accent/60 px-1.5 py-0.5 rounded-full">
              {hubNotes.length + structuredNotes.length}
            </span>
          </button>
        </div>
      )}

      <div
        className={`flex-1 overflow-hidden min-h-0 ${
          isCollapsed ? "hidden" : ""
        }`}
      >
        {notes.length === 0 ? (
          <div className="p-3 h-full overflow-auto">
            <EmptyState
              message="Nothing to see here... 👀"
              description="Create your first note to get started organizing your thoughts."
              icon={FileText}
            />
          </div>
        ) :
          <ScrollArea className="h-full w-full">
            <div className="p-2 space-y-4">
              {currentActiveTab === 'notes' ? (
                <>
                  {/* Source Notes Section */}
                  {sourceNotes.length > 0 && (
                    <div>
                      <div 
                        className="flex items-center gap-2 px-1 mb-2 cursor-pointer hover:bg-sidebar-accent/30 rounded py-1 transition-colors"
                        onClick={() => toggleSection('source')}
                      >
                        {collapsedSections.has('source') ? (
                          <ChevronRight className="h-3 w-3 text-sidebar-foreground/50" />
                        ) : (
                          <ChevronDown className="h-3 w-3 text-sidebar-foreground/50" />
                        )}
                        <h3 className="text-xs font-semibold text-sidebar-foreground/60 uppercase tracking-wider">
                          Source Notes
                        </h3>
                        <span className="text-xs text-sidebar-foreground/40 bg-sidebar-accent/60 px-1.5 py-0.5 rounded-full font-medium">
                          {sourceNotes.length}
                        </span>
                      </div>
                      {!collapsedSections.has('source') && (
                        <div className="space-y-1">
                          {sourceNotes.map(note => renderNoteItem(note))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Atomic Notes Section */}
                  {atomicNotes.length > 0 && (
                    <div>
                      <div 
                        className="flex items-center gap-2 px-1 mb-2 cursor-pointer hover:bg-sidebar-accent/30 rounded py-1 transition-colors"
                        onClick={() => toggleSection('atomic')}
                      >
                        {collapsedSections.has('atomic') ? (
                          <ChevronRight className="h-3 w-3 text-sidebar-foreground/50" />
                        ) : (
                          <ChevronDown className="h-3 w-3 text-sidebar-foreground/50" />
                        )}
                        <h3 className="text-xs font-semibold text-sidebar-foreground/60 uppercase tracking-wider">
                          Atomic Notes
                        </h3>
                        <span className="text-xs text-sidebar-foreground/40 bg-sidebar-accent/60 px-1.5 py-0.5 rounded-full font-medium">
                          {atomicNotes.length}
                        </span>
                      </div>
                      {!collapsedSections.has('atomic') && (
                        <div className="space-y-0">
                          {atomicNotes.map(note => {
                            const isActive = activeNoteId === note.id;
                            const isSelected = selectedNoteIds.has(note.id);
                            
                            return (
                              <div
                                key={note.id}
                                data-note-item="true"
                                onClick={(event) => handleNoteClick(note, event)}
                                onMouseDown={(event) => {
                                  // Prevent text selection during multi-select operations
                                  if (event.metaKey || event.ctrlKey || event.shiftKey) {
                                    event.preventDefault();
                                  }
                                }}
                                className={`group relative flex items-center gap-2 rounded cursor-pointer transition-all duration-200 overflow-hidden border px-1 py-1 select-none ${
                                  isSelected
                                    ? "bg-blue-500/5 border-blue-500/20 ring-1 ring-blue-500/10"
                                    : isActive
                                    ? "bg-gradient-to-br from-sidebar-primary/10 to-sidebar-primary/5 border-sidebar-primary/20 shadow-sm ring-1 ring-sidebar-primary/10"
                                    : "bg-transparent border-transparent hover:border-sidebar-primary/15 hover:bg-sidebar-accent/40"
                                }`}
                              >
                                {/* Selection indicator */}
                                {(isActive || isSelected) && (
                                  <div className={`absolute left-0 top-0 bottom-0 w-0.5 ${
                                    isSelected ? "bg-blue-500" : "bg-sidebar-primary"
                                  }`} />
                                )}

                                <div className="flex items-center justify-between gap-2 min-w-0 flex-1">
                                  <p className={`text-xs line-clamp-1 flex-1 ${
                                    isSelected
                                      ? "text-blue-600/80 dark:text-blue-400/80"
                                      : isActive
                                      ? "text-sidebar-primary/90"
                                      : "text-sidebar-foreground/75 group-hover:text-sidebar-foreground"
                                  }`}>
                                    {note.content}
                                  </p>
                                  <span className="text-xs text-sidebar-foreground/30 font-mono flex-shrink-0">
                                    {new Date(note.createdAt).toLocaleDateString('en-US', { 
                                      month: 'short', 
                                      day: 'numeric' 
                                    })}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Empty state for Notes tab */}
                  {sourceNotes.length === 0 && atomicNotes.length === 0 && (
                    <div className="p-3 text-center">
                      <EmptyState
                        message="No notes yet... 📝"
                        description="Create your first note to get started."
                        icon={FileText}
                      />
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* Topics Tab Content */}
                  
                  {/* Hub Notes Section */}
                  {hubNotes.length > 0 && (
                    <div>
                      <div 
                        className="flex items-center gap-2 px-1 mb-2 cursor-pointer hover:bg-sidebar-accent/30 rounded py-1 transition-colors"
                        onClick={() => toggleSection('hub')}
                      >
                        {collapsedSections.has('hub') ? (
                          <ChevronRight className="h-3 w-3 text-sidebar-foreground/50" />
                        ) : (
                          <ChevronDown className="h-3 w-3 text-sidebar-foreground/50" />
                        )}
                        <h3 className="text-xs font-semibold text-sidebar-foreground/60 uppercase tracking-wider">
                          Hub Notes
                        </h3>
                        <span className="text-xs text-sidebar-foreground/40 bg-sidebar-accent/60 px-1.5 py-0.5 rounded-full font-medium">
                          {hubNotes.length}
                        </span>
                      </div>
                      {!collapsedSections.has('hub') && (
                        <div className="space-y-1">
                          {hubNotes.map(note => renderNoteItem(note))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Structured Notes Section */}
                  {structuredNotes.length > 0 && (
                    <div>
                      <div 
                        className="flex items-center gap-2 px-1 mb-2 cursor-pointer hover:bg-sidebar-accent/30 rounded py-1 transition-colors"
                        onClick={() => toggleSection('structured')}
                      >
                        {collapsedSections.has('structured') ? (
                          <ChevronRight className="h-3 w-3 text-sidebar-foreground/50" />
                        ) : (
                          <ChevronDown className="h-3 w-3 text-sidebar-foreground/50" />
                        )}
                        <h3 className="text-xs font-semibold text-sidebar-foreground/60 uppercase tracking-wider">
                          Structure Notes
                        </h3>
                        <span className="text-xs text-sidebar-foreground/40 bg-sidebar-accent/60 px-1.5 py-0.5 rounded-full font-medium">
                          {structuredNotes.length}
                        </span>
                      </div>
                      {!collapsedSections.has('structured') && (
                        <div className="space-y-1">
                          {structuredNotes.map(note => renderNoteItem(note))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Empty state for Topics tab */}
                  {hubNotes.length === 0 && structuredNotes.length === 0 && (
                    <div className="p-3 text-center">
                      <EmptyState
                        message="No topics yet... 🌐"
                        description="Create atomic notes to automatically generate topic connections, or create structure notes for organized content."
                        icon={FileText}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          </ScrollArea>
        }
      </div>
    </div>
  );
}
