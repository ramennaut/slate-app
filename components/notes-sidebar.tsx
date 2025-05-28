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
  File,
} from "lucide-react";
import { ScrollArea } from "./ui/scroll-area";

interface NotesSidebarProps {
  notes: Note[];
  onSelectNote: (note: Note) => void;
  createNewNote: () => void;
  onDeleteNote: (id: string) => void;
  activeNoteId?: string;
  isCollapsed: boolean;
  toggleSidebar: () => void;
  isMobile: boolean;
}

export default function NotesSidebar({
  notes,
  onSelectNote,
  createNewNote,
  onDeleteNote,
  activeNoteId,
  isCollapsed,
  toggleSidebar,
  isMobile,
}: NotesSidebarProps) {
  const activeNote = notes.find((note) => note.id === activeNoteId);
  
  // Separate regular notes from atomic notes
  const regularNotes = notes.filter(note => !note.isAtomic);
  const atomicNotes = notes.filter(note => note.isAtomic);

  const renderNoteItem = (note: Note, isSubNote = false) => {
    const isActive = activeNoteId === note.id;
    const isAtomic = note.isAtomic;

    return (
      <div
        key={note.id}
        onClick={() => onSelectNote(note)}
        className={`group relative block rounded-lg cursor-pointer transition-all duration-200 overflow-hidden border ${
          isActive
            ? "bg-gradient-to-br from-sidebar-primary/10 to-sidebar-primary/5 border-sidebar-primary/20 shadow-sm ring-1 ring-sidebar-primary/10"
            : "bg-white/20 dark:bg-white/3 border-sidebar-border/20 hover:border-sidebar-primary/15 hover:bg-sidebar-accent/40"
        } ${
          isCollapsed ? "flex justify-center items-center h-12" : ""
        } ${
          isSubNote ? "ml-3 border-l-2 border-sidebar-primary/20" : ""
        } ${
          isAtomic ? "p-1.5" : "p-2"
        }`}
      >
        {isActive && !isCollapsed && (
          <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-sidebar-primary" />
        )}

        <div
          className={`min-w-0 ${
            isActive && !isCollapsed ? "pl-2" : ""
          } ${isCollapsed ? "hidden" : ""}`}
        >
          <div className="w-full min-w-0">
            {isAtomic ? (
              // Atomic note: compact one-line preview like VS Code/Obsidian
              <div className="flex items-center justify-between gap-2">
                <p className={`text-xs line-clamp-1 flex-1 ${
                  isActive
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
      className={`flex flex-col h-full bg-sidebar border-r border-sidebar-border overflow-hidden w-full`}
    >
      <div className="flex items-center justify-between px-3 py-3 border-b border-sidebar-border/30 bg-sidebar flex-shrink-0 min-h-0">
        <div
          className={`flex items-center gap-2 min-w-0 flex-1 ${
            isCollapsed ? "hidden" : ""
          }`}
        >
          <h2 className="text-sm font-semibold text-sidebar-foreground/80 truncate">
            All Notes
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
          <Button
            variant="ghost"
            size="icon"
            className={`h-7 w-7 rounded-md transition-all duration-200 flex-shrink-0 ${
              isCollapsed ? "hidden" : ""
            } ${
              activeNote
                ? "text-sidebar-foreground/70 hover:text-destructive hover:bg-destructive/10"
                : "text-sidebar-foreground/40 cursor-not-allowed"
            }`}
            onClick={() => activeNote && onDeleteNote(activeNote.id)}
            disabled={!activeNote}
            title={
              activeNote
                ? `Delete "${activeNote.title || "Untitled Note"}"`
                : "No note selected"
            }
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
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
              {/* Regular Notes Section */}
              {regularNotes.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 px-1 mb-2">
                    <h3 className="text-xs font-semibold text-sidebar-foreground/60 uppercase tracking-wider">
                      Notes
                    </h3>
                    <span className="text-xs text-sidebar-foreground/40 bg-sidebar-accent/60 px-1.5 py-0.5 rounded-full font-medium">
                      {regularNotes.length}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {regularNotes.map(note => renderNoteItem(note))}
                  </div>
                </div>
              )}

              {/* Atomic Notes Section */}
              {atomicNotes.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 px-1 mb-2">
                    <h3 className="text-xs font-semibold text-sidebar-foreground/60 uppercase tracking-wider">
                      Atomic Notes
                    </h3>
                    <span className="text-xs text-sidebar-foreground/40 bg-sidebar-accent/60 px-1.5 py-0.5 rounded-full font-medium">
                      {atomicNotes.length}
                    </span>
                  </div>
                  <div className="space-y-0">
                    {atomicNotes.map(note => (
                      <div
                        key={note.id}
                        onClick={() => onSelectNote(note)}
                        className={`group relative flex items-center gap-1 rounded cursor-pointer transition-all duration-200 overflow-hidden border px-1 py-1 ${
                          activeNoteId === note.id
                            ? "bg-gradient-to-br from-sidebar-primary/10 to-sidebar-primary/5 border-sidebar-primary/20 shadow-sm ring-1 ring-sidebar-primary/10"
                            : "bg-transparent border-transparent hover:border-sidebar-primary/15 hover:bg-sidebar-accent/40"
                        }`}
                      >
                        <File className="h-3 w-3 text-sidebar-foreground/50 flex-shrink-0" />
                        <div className="flex items-center justify-between gap-2 min-w-0 flex-1">
                          <p className={`text-xs line-clamp-1 flex-1 ${
                            activeNoteId === note.id
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
                    ))}
                  </div>
                </div>
              )}

              {/* Empty state when only one type exists */}
              {regularNotes.length === 0 && atomicNotes.length === 0 && (
                <div className="space-y-1">
                  {notes.map(note => renderNoteItem(note))}
                </div>
              )}
            </div>
          </ScrollArea>
        }
      </div>
    </div>
  );
}
