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
      <div className="flex items-center justify-between px-6 py-5 border-b border-sidebar-border">
        <h2 className="text-xs font-bold uppercase tracking-wider text-sidebar-foreground/60">NOTES</h2>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-sidebar-foreground hover:bg-sidebar-accent rounded-lg"
          onClick={createNewNote}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Sidebar Content */}
      <div className="flex-1 overflow-hidden">
        {notes.length === 0 ? (
          <div className="p-6">
            <EmptyState
              message="Nothing to see here... 👀"
              buttonText="Add an idea"
              onButtonClick={createNewNote}
            />
          </div>
        ) : (
          <ScrollArea className="h-full">
            <div className="p-3">
              {notes.map((note) => (
                <div
                  key={note.id}
                  onClick={() => onSelectNote(note)}
                  className={`group relative block p-4 rounded-lg cursor-pointer hover:bg-sidebar-accent transition-all duration-200 mb-2 ${
                    activeNoteId === note.id 
                      ? "bg-sidebar-accent border-l-4 border-sidebar-primary shadow-sm" 
                      : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0 mr-3">
                      <h3 className="text-base font-semibold text-sidebar-foreground mb-2 leading-tight">
                        {note.title.substring(0, 30)}
                        {note.title.length > 30 ? "..." : ""}
                      </h3>
                      <p className="text-sm text-sidebar-foreground/70 mb-3 leading-relaxed">
                        {note.content.substring(0, 40)}
                        {note.content.length > 40 ? "..." : ""}
                      </p>
                      <p className="text-xs text-sidebar-foreground/50 font-medium">
                        {formatDate(note.createdAt)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 text-sidebar-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-200 flex-shrink-0 rounded-lg"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteNote(note.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
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
