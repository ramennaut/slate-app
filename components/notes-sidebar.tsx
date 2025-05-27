import EmptyState from "./empty-state";
import { Note } from "@/lib/types";
import { Button } from "./ui/button";
import { formatDate } from "@/lib/storage";
import { Trash2, Plus } from "lucide-react";
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
  return (
    <div className="flex flex-col h-full bg-sidebar border-r border-sidebar-border">
      {/* Sidebar Header */}
      <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
        <h2 className="text-sm font-semibold text-sidebar-foreground">NOTES</h2>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-sidebar-foreground hover:bg-sidebar-accent"
          onClick={createNewNote}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Sidebar Content */}
      <div className="flex-1 overflow-hidden">
        {notes.length === 0 ? (
          <div className="p-4">
            <EmptyState
              message="Nothing to see here... 👀"
              buttonText="Add an idea"
              onButtonClick={createNewNote}
            />
          </div>
        ) : (
          <ScrollArea className="h-full">
            <div className="p-2">
              {notes.map((note) => (
                <div
                  key={note.id}
                  onClick={() => onSelectNote(note)}
                  className={`group relative block p-2 rounded-sm cursor-pointer hover:bg-sidebar-accent transition-colors ${
                    activeNoteId === note.id 
                      ? "bg-sidebar-accent border-l-2 border-sidebar-primary" 
                      : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0 mr-2">
                      <h3 className="text-sm font-medium text-sidebar-foreground">
                        {note.title.substring(0, 30)}
                        {note.title.length > 30 ? "..." : ""}
                      </h3>
                      <p className="text-xs text-sidebar-foreground/70 mt-1">
                        {note.content.substring(0, 40)}
                        {note.content.length > 40 ? "..." : ""}
                      </p>
                      <p className="text-xs text-sidebar-foreground/50 mt-1">
                        {formatDate(note.createdAt)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 text-sidebar-foreground hover:text-destructive hover:bg-sidebar-accent transition-all duration-200 flex-shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteNote(note.id);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}
