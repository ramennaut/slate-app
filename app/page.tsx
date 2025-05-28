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
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const handleContentAreaClick = () => {
    if (isMobile && isMobileSidebarOpen) {
      setIsMobileSidebarOpen(false);
    }
  };

  const checkDevice = useCallback(() => {
    const mobile = window.innerWidth < 768; // md breakpoint
    setIsMobile(mobile);
    if (isInitialMountRef.current) { // Only set initial collapse state on mount
      // setIsSidebarCollapsed(mobile); // Don't auto-collapse on mobile initially
      if (!mobile) { // Collapse sidebar by default on desktop if that's desired
        setIsSidebarCollapsed(true);
      }
      setIsMobileSidebarOpen(false); // Ensure mobile sidebar is closed initially
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
    if (isMobile) {
      setIsMobileSidebarOpen(!isMobileSidebarOpen);
    } else {
      setIsSidebarCollapsed(!isSidebarCollapsed);
    }
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
    if (isMobile) {
      setIsMobileSidebarOpen(false); // Close mobile sidebar to show editor
    }
    // On desktop, if sidebar is collapsed, and we create a new note, we might want to ensure it's visible
    // or handle as per existing logic (currently does nothing specific for desktop in this case)
  };

  const selectNote = (note: Note) => {
    setActiveNote(note);
    if (isMobile) { // On mobile, close sidebar when a note is selected to show the editor
      setIsMobileSidebarOpen(false);
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
          onButtonClick={() => {
            createNewNote();
            // If on mobile, ensure sidebar is closed after creating note from empty state
            if (isMobile) setIsMobileSidebarOpen(false);
          }}
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
  // const sidebarWidthClass = isSidebarCollapsed ? "w-16" : (isMobile ? "w-full" : "w-80");
  // Determine main content visibility
  // const mainContentVisible = !isMobile || (isMobile && isSidebarCollapsed);

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      <Header 
        createNewNote={createNewNote} 
        toggleSidebar={handleToggleSidebar} 
        isMobile={isMobile} 
      />
      <div className="flex flex-1 overflow-hidden"> {/* Parent overflow-hidden is key for clipping */} 
        {/* Unified Sidebar Container */} 
        <div 
          className={`transition-all duration-300 ease-in-out flex-shrink-0 h-full overflow-hidden ${ 
            isMobile 
              ? (isMobileSidebarOpen ? 'w-80' : 'w-0') 
              : (isSidebarCollapsed ? 'w-16' : 'w-80') 
          }`}
        >
          {/* Render NotesSidebar only if it's supposed to be visible (width > 0), 
              or let NotesSidebar handle its internal empty state if container is w-0/w-16. 
              For simplicity and to ensure transitions, NotesSidebar is always rendered here, 
              and its internal state is managed by isCollapsed. 
          */}
          <NotesSidebar
            notes={notes}
            onSelectNote={selectNote}
            createNewNote={createNewNote}
            onDeleteNote={deleteNote}
            activeNoteId={activeNote?.id}
            isCollapsed={isMobile ? !isMobileSidebarOpen : isSidebarCollapsed}
            toggleSidebar={handleToggleSidebar}
            isMobile={isMobile}
          />
        </div>

        {/* Main Content Area - Modified for push effect, dimming, and click-to-close */} 
        <div 
          className={`w-full flex-shrink-0 h-full overflow-y-auto transition-all duration-300 ease-in-out ${ 
            isMobile && isMobileSidebarOpen ? 'opacity-50' : ''
          }`}
          onClick={handleContentAreaClick}
        >
          <div className="h-full p-4 sm:p-6">
            {renderNoteContent()}
          </div>
        </div>
      </div>
    </div>
  );
}
