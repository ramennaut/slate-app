"use client";

import EmptyState from "@/components/empty-state";
import Header from "@/components/header";
import NotesSidebar from "@/components/notes-sidebar";
import NoteEditor from "@/components/note-editor";
import { loadNotes, saveNotes } from "@/lib/storage";
import { Note } from "@/lib/types";
import { useEffect, useState, useCallback, useRef } from "react";
import { Sparkles } from "lucide-react";

const getRandomDefaultTitle = (): string => {
  const defaultTitles = [
    "Unfinished Thought",
    "New Idea", 
    "Something Brewing",
    "Hmm...",
    "Rough Draft"
  ];
  const randomIndex = Math.floor(Math.random() * defaultTitles.length);
  return defaultTitles[randomIndex];
};

export default function Home() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNote, setActiveNote] = useState<Note | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const checkDevice = useCallback(() => {
    const mobile = window.innerWidth < 768; // md breakpoint
    setIsMobile(mobile);
    if (isInitialMountRef.current) { // Only set initial collapse state on mount
        setIsSidebarCollapsed(mobile);
    }
  }, []);

  const isInitialMountRef = useRef(true); // Ref to track initial mount

  useEffect(() => {
    checkDevice();
    window.addEventListener('resize', checkDevice);
    // Set initial mount to false after the first run
    const timer = setTimeout(() => { // Use a timer to ensure it runs after initial hydration if needed
        isInitialMountRef.current = false;
    }, 0);
    return () => {
        window.removeEventListener('resize', checkDevice);
        clearTimeout(timer);
    };
  }, [checkDevice]);

  useEffect(() => {
    setNotes(loadNotes());
  }, []);

  useEffect(() => {
    saveNotes(notes);
  }, [notes]);

  const handleToggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  const createNewNote = () => {
    const newNote: Note = {
      id: Date.now().toString(),
      title: getRandomDefaultTitle(),
      content: "",
      createdAt: Date.now(),
    };
    setNotes([newNote, ...notes]);
    setActiveNote(newNote);
    if (isMobile && !isSidebarCollapsed) { // If on mobile and sidebar is expanded, collapse it to show editor
        // This behavior can be debated: do we collapse or keep it open?
        // For now, let's assume we want to see the new note immediately.
        // setIsSidebarCollapsed(true); 
    } else if (isMobile && isSidebarCollapsed) {
        // If mobile and sidebar is collapsed, new note created, we might want to open it.
        // Or rely on user to open it. For now, let's keep it collapsed.
    }
  };

  const selectNote = (note: Note) => {
    setActiveNote(note);
    if (isMobile) { // On mobile, collapse sidebar when a note is selected to show the editor
      setIsSidebarCollapsed(true);
    }
  };

  const saveNote = (updatedNote: Note) => {
    setNotes(
      notes.map((note) => (note.id === updatedNote.id ? updatedNote : note))
    );
    setActiveNote(updatedNote);
  };

  const deleteNote = (id: string) => {
    const noteIndex = notes.findIndex(note => note.id === id);
    const updatedNotes = notes.filter((note) => note.id !== id);
    setNotes(updatedNotes);
    
    if (activeNote && activeNote.id === id) {
      // Auto-select the next note for continuous deletion
      if (updatedNotes.length > 0) {
        // Try to select the note at the same index, or the previous one if we deleted the last note
        const nextIndex = noteIndex < updatedNotes.length ? noteIndex : updatedNotes.length - 1;
        setActiveNote(updatedNotes[nextIndex]);
      } else {
        setActiveNote(null);
      }
    }
  };

  const renderNoteContent = () => {
    if (!activeNote && notes.length === 0) {
      return (
        <EmptyState
          message="No thoughts, head empty? 🌀"
          buttonText="New Thought"
          description="Start capturing your thoughts and ideas in beautifully organized notes."
          icon={Sparkles}
          onButtonClick={createNewNote}
        />
      );
    }

    if (activeNote) {
      return (
        <NoteEditor 
          note={activeNote} 
          onSave={saveNote} 
        />
      );
    }
    
    return null;
  };

  // Determine sidebar width class based on state
  const sidebarWidthClass = isSidebarCollapsed ? "w-16" : (isMobile ? "w-full" : "w-80");
  // Determine main content visibility
  const mainContentVisible = !isMobile || (isMobile && isSidebarCollapsed);

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      <Header createNewNote={createNewNote} toggleSidebar={handleToggleSidebar} isMobile={isMobile} isSidebarCollapsed={isSidebarCollapsed} />
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Container */}
        {/* Show sidebar always on md+, or on mobile if not collapsed (takes full width) or if collapsed (icon width) */}
        {(!isMobile || !isSidebarCollapsed) && (
             <div className={`transition-all duration-300 ease-in-out flex-shrink-0 h-full ${sidebarWidthClass}`}>
                <NotesSidebar
                    notes={notes}
                    onSelectNote={selectNote}
                    createNewNote={createNewNote}
                    onDeleteNote={deleteNote}
                    activeNoteId={activeNote?.id}
                    isCollapsed={isSidebarCollapsed} // Pass down the state
                    toggleSidebar={handleToggleSidebar} // Pass down the toggle function
                />
            </div>
        )}
         {/* On mobile, if sidebar is collapsed, we still need to render it (as w-16) but hide it visually if it's not meant to be shown for the logic below */}
         {/* This placeholder ensures the toggle button in the header can always control a sidebar */}
         {isMobile && isSidebarCollapsed && (
            <div className={`w-16 flex-shrink-0 h-full transition-all duration-300 ease-in-out`}>
                 <NotesSidebar
                    notes={notes}
                    onSelectNote={selectNote}
                    createNewNote={createNewNote}
                    onDeleteNote={deleteNote}
                    activeNoteId={activeNote?.id}
                    isCollapsed={true} 
                    toggleSidebar={handleToggleSidebar} 
                />
            </div>
         )}


        {/* Main Content Area */}
        {/* Show main content on md+, or on mobile only if sidebar is collapsed */}
        <div className={`flex-1 overflow-y-auto transition-all duration-300 ease-in-out ${mainContentVisible ? 'block' : 'hidden'} md:block`}>
          <div className="h-full p-4 sm:p-6">
            {renderNoteContent()}
          </div>
        </div>
      </div>
    </div>
  );
}
