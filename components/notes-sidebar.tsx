import EmptyState from "./empty-state";
import { Note } from "@/lib/types";
import { Button } from "./ui/button";
import { formatDate } from "@/lib/storage";
import { Trash2, Plus, FileText } from "lucide-react";
import { ScrollArea } from "./ui/scroll-area";

interface NotesSidebarProps {
  notes: Note[];
  onSelectNote: (note: Note) => void;
  createNewNote: () => void;
  onDeleteNote: (id: string) => void;
  activeNoteId?: string;
}

export default function NotesSidebar({
  notes,
  onSelectNote,
  createNewNote,
  onDeleteNote,
  activeNoteId,
}: NotesSidebarProps) {
  const activeNote = notes.find(note => note.id === activeNoteId);

  return (
    <div className="flex flex-col h-full bg-sidebar/50 backdrop-blur-sm border-r border-sidebar-border/60 overflow-hidden w-full">
      {/* Sidebar Header */}
      <div className="flex items-center justify-between px-3 py-3 border-b border-sidebar-border/30 bg-sidebar/30 flex-shrink-0 min-h-0">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-sidebar-foreground/80 truncate">Notes</h2>
          <span className="text-xs text-sidebar-foreground/50 bg-sidebar-accent px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 min-w-0">
            {notes.length}
          </span>
        </div>
        <div className="flex items-center gap-0.5 flex-shrink-0 ml-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/80 rounded-md transition-all duration-200 flex-shrink-0"
            onClick={createNewNote}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={`h-7 w-7 rounded-md transition-all duration-200 flex-shrink-0 ${
              activeNote 
                ? "text-sidebar-foreground/70 hover:text-destructive hover:bg-destructive/10" 
                : "text-sidebar-foreground/40 cursor-not-allowed"
            }`}
            onClick={() => activeNote && onDeleteNote(activeNote.id)}
            disabled={!activeNote}
            title={activeNote ? `Delete "${activeNote.title || 'Untitled Note'}"` : "No note selected"}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Sidebar Content */}
      <div className="flex-1 overflow-hidden min-h-0">
        {notes.length === 0 ? (
          <div className="p-3 h-full overflow-auto">
            <EmptyState
              message="Nothing to see here... 👀"
              description="Create your first note to get started organizing your thoughts."
              icon={FileText}
            />
          </div>
        ) : (
          <ScrollArea className="h-full w-full">
            <div className="p-2 space-y-1">
              {notes.map((note) => {
                const isActive = activeNoteId === note.id;
                
                return (
                  <div
                    key={note.id}
                    onClick={() => onSelectNote(note)}
                    className={`group relative block p-2 rounded-lg cursor-pointer transition-all duration-200 overflow-hidden border ${
                      isActive 
                        ? "bg-gradient-to-br from-sidebar-primary/10 to-sidebar-primary/5 border-sidebar-primary/20 shadow-sm ring-1 ring-sidebar-primary/10" 
                        : "bg-white/20 dark:bg-white/3 border-sidebar-border/20 hover:border-sidebar-primary/15 hover:bg-sidebar-accent/40"
                    }`}
                  >
                    {/* Active Indicator */}
                    {isActive && (
                      <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-sidebar-primary" />
                    )}
                    
                    <div className={`min-w-0 ${isActive ? 'pl-2' : ''}`}>
                      <div className="w-full min-w-0">
                        {/* Title */}
                        <h3 className={`text-xs font-medium mb-1 leading-tight line-clamp-1 ${
                          isActive 
                            ? "text-sidebar-primary" 
                            : "text-sidebar-foreground group-hover:text-sidebar-foreground"
                        }`}>
                          {note.title || "Untitled"}
                        </h3>
                        
                        {/* Date */}
                        <p className="text-xs text-sidebar-foreground/35 font-normal">
                          {formatDate(note.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}
