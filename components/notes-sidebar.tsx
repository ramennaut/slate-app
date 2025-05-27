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
  const getPreviewText = (content: string) => {
    // Remove bullet points and numbered lists for cleaner preview
    const cleanContent = content
      .replace(/^(\s*)•\s+/gm, '')
      .replace(/^(\s*)\d+\.\s+/gm, '')
      .replace(/\n+/g, ' ')
      .trim();
    return cleanContent;
  };

  const activeNote = notes.find(note => note.id === activeNoteId);

  return (
    <div className="flex flex-col h-full bg-sidebar/50 backdrop-blur-sm border-r border-sidebar-border/60 overflow-hidden">
      {/* Sidebar Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-sidebar-border/30 bg-sidebar/30 flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
          <h2 className="text-sm font-semibold text-sidebar-foreground/80 truncate">Notes</h2>
          <span className="text-xs text-sidebar-foreground/50 bg-sidebar-accent px-2 py-0.5 rounded-full font-medium flex-shrink-0">
            {notes.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/80 rounded-md transition-all duration-200 flex-shrink-0"
            onClick={createNewNote}
          >
            <Plus className="h-4 w-4" />
          </Button>
          {activeNote && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-sidebar-foreground/70 hover:text-destructive hover:bg-destructive/10 rounded-md transition-all duration-200 flex-shrink-0"
              onClick={() => onDeleteNote(activeNote.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Sidebar Content */}
      <div className="flex-1 overflow-hidden min-h-0">
        {notes.length === 0 ? (
          <div className="p-4 h-full overflow-auto">
            <EmptyState
              message="Nothing to see here... 👀"
              buttonText="Add an idea"
              description="Create your first note to get started organizing your thoughts."
              icon={FileText}
              onButtonClick={createNewNote}
            />
          </div>
        ) : (
          <ScrollArea className="h-full">
            <div className="p-3 space-y-2">
              {notes.map((note) => {
                const isActive = activeNoteId === note.id;
                const previewText = getPreviewText(note.content);
                
                return (
                  <div
                    key={note.id}
                    onClick={() => onSelectNote(note)}
                    className={`group relative block p-3 mx-1 rounded-lg cursor-pointer transition-all duration-200 ${
                      isActive 
                        ? "bg-sidebar-primary/8 border border-sidebar-primary/15 shadow-sm" 
                        : "hover:bg-sidebar-accent/50 border border-transparent hover:border-sidebar-border/20"
                    }`}
                  >
                    {/* Active Indicator - moved to inside the card */}
                    {isActive && (
                      <div className="absolute left-0 top-3 bottom-3 w-1 bg-sidebar-primary rounded-r-sm" />
                    )}
                    
                    <div className={`${isActive ? 'pl-3' : ''}`}>
                      <div className="w-full">
                        {/* Title */}
                        <h3 className={`text-sm font-medium mb-1.5 leading-tight truncate ${
                          isActive 
                            ? "text-sidebar-primary font-semibold" 
                            : "text-sidebar-foreground group-hover:text-sidebar-foreground"
                        }`}>
                          {note.title || "Untitled Note"}
                        </h3>
                        
                        {/* Content Preview */}
                        {previewText && (
                          <p className="text-xs text-sidebar-foreground/60 leading-relaxed line-clamp-2 mb-2">
                            {previewText.substring(0, 65)}
                            {previewText.length > 65 ? "..." : ""}
                          </p>
                        )}
                        
                        {/* Date */}
                        <p className="text-xs text-sidebar-foreground/40 font-medium">
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
