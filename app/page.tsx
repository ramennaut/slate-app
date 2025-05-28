"use client";

import EmptyState from "@/components/empty-state";
import Header from "@/components/header";
import NotesSidebar from "@/components/notes-sidebar";
import NoteEditor from "@/components/note-editor";
import AtomicCardsView from "@/components/atomic-cards-view";
import AtomicNotesPreview from "@/components/atomic-notes-preview";
import { loadNotes, saveNotes } from "@/lib/storage";
import { Note } from "@/lib/types";
import { useEffect, useState, useCallback, useRef } from "react";
import { Sparkles } from "lucide-react";
import { analyzeAtomicNotesForHubNotes, generateHubNoteContent } from "@/lib/openai";

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
  const [openAtomicNotes, setOpenAtomicNotes] = useState<Note[]>([]);
  const [atomicNotesPreview, setAtomicNotesPreview] = useState<{
    potentialNotes: Array<{ title: string; content: string }>;
    sourceNote: Note;
  } | null>(null);
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
    if (note.isAtomic) {
      // For atomic notes, add to the multi-card view if not already open
      setOpenAtomicNotes(prev => {
        const isAlreadyOpen = prev.some(openNote => openNote.id === note.id);
        if (isAlreadyOpen) {
          return prev; // Don't add duplicates
        }
        return [...prev, note];
      });
      // Set this atomic note as "active" for sidebar selection/delete purposes
      setActiveNote(note);
    } else {
      // For regular notes, set as active and clear atomic cards
      setActiveNote(note);
      setOpenAtomicNotes([]);
    }
    
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
    const noteToDelete = notes.find(note => note.id === id);
    const noteIndex = notes.findIndex(note => note.id === id);
    const updatedNotes = notes.filter((note) => note.id !== id);
    setNotes(updatedNotes);
    
    // If deleting an atomic note, also remove it from the open cards
    if (noteToDelete?.isAtomic) {
      setOpenAtomicNotes(prev => prev.filter(note => note.id !== id));
    }
    
    // Handle active note logic
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

  const createAtomicNotes = (atomicNotes: Array<{ title: string; content: string }>) => {
    if (atomicNotes.length === 0 || !activeNote) {
      return;
    }
    
    // Show preview modal instead of creating notes immediately
    setAtomicNotesPreview({
      potentialNotes: atomicNotes,
      sourceNote: activeNote
    });
  };

  const handleAtomicNotesApproval = async (approvedNotes: Array<{ title: string; content: string }>) => {
    if (!atomicNotesPreview || approvedNotes.length === 0) {
      setAtomicNotesPreview(null);
      return;
    }

    // Create new note objects from approved atomic notes
    const newNotes: Note[] = approvedNotes.map((atomicNote, index) => ({
      id: `${Date.now()}-${index}`,
      title: atomicNote.title,
      content: atomicNote.content,
      createdAt: Date.now() + index, // Slight offset to maintain order
      isAtomic: true, // Mark as atomic note
      sourceNoteId: atomicNotesPreview.sourceNote.id, // Link to the source note
    }));

    // Add the new atomic notes to the beginning of the notes list
    const updatedNotes = [...newNotes, ...notes];
    setNotes(updatedNotes);
    
    // Add all new atomic notes to the multi-card view
    setOpenAtomicNotes([...newNotes]);
    setActiveNote(null); // Clear regular note when showing atomic cards

    // Close mobile sidebar if open
    if (isMobile) {
      setIsMobileSidebarOpen(false);
    }

    // Close the preview modal
    setAtomicNotesPreview(null);

    // Remove automatic hub note generation - users will create topics manually
  };

  const handleAtomicNotesCancel = () => {
    setAtomicNotesPreview(null);
  };

  const closeAtomicCard = (noteId: string) => {
    setOpenAtomicNotes(prev => prev.filter(note => note.id !== noteId));
  };

  const createTopicFromAtomicNotes = async (selectedAtomicNotes: Note[]) => {
    if (selectedAtomicNotes.length < 2) {
      console.warn('Need at least 2 atomic notes to create a topic');
      return;
    }

    try {
      // Use the existing analysis function to generate a topic for the selected notes
      const analysis = await analyzeAtomicNotesForHubNotes(
        selectedAtomicNotes.map(note => ({ id: note.id, content: note.content })),
        [] // No existing hub notes to consider for this manual creation
      );

      if (analysis.newThemes.length > 0) {
        const theme = analysis.newThemes[0]; // Take the first (and likely only) theme
        
        const hubNote: Note = {
          id: `hub-${Date.now()}`,
          title: theme.theme,
          content: theme.description,
          createdAt: Date.now(),
          isSummary: true,
          linkedAtomicNoteIds: selectedAtomicNotes.map(note => note.id),
          hubTheme: theme.theme,
        };

        // Add the new hub note
        setNotes([hubNote, ...notes]);
        
        // Switch to the new hub note
        setActiveNote(hubNote);
        setOpenAtomicNotes([]); // Close flash card view
        
        // Close mobile sidebar if open
        if (isMobile) {
          setIsMobileSidebarOpen(false);
        }

        console.log(`Created topic: ${theme.theme}`);
      } else {
        console.warn('Could not generate a topic from the selected atomic notes');
      }
    } catch (error) {
      console.error('Error creating topic:', error);
    }
  };

  const createSummaryNote = (summaryContent: string) => {
    const summaryNote: Note = {
      id: Date.now().toString(),
      title: `Summary - ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
      content: summaryContent,
      createdAt: Date.now(),
      isSummary: true,
    };
    
    // Add the summary note to the beginning of the notes list
    setNotes([summaryNote, ...notes]);
    
    // Switch to the summary note in the editor
    setActiveNote(summaryNote);
    setOpenAtomicNotes([]); // Close flash card view
    
    // Close mobile sidebar if open
    if (isMobile) {
      setIsMobileSidebarOpen(false);
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

    // Show multi-card view if atomic notes are open
    if (openAtomicNotes.length > 0) {
      return (
        <AtomicCardsView
          notes={openAtomicNotes}
          allNotes={notes}
          onSave={saveNote}
          onSelectNote={selectNote}
          onCloseCard={closeAtomicCard}
          onCreateTopic={createTopicFromAtomicNotes}
          onDeleteNote={deleteNote}
          isMobile={isMobile}
        />
      );
    }

    if (activeNote && !activeNote.isAtomic) {
      return (
        <div className="h-full p-4 sm:p-6">
          <NoteEditor 
            note={activeNote} 
            onSave={saveNote}
            onCreateAtomicNotes={createAtomicNotes}
            onSelectNote={selectNote}
            notes={notes}
            isMobile={isMobile}
          />
        </div>
      );
    }
    
    // When notes exist but no note is selected
    if (!activeNote && notes.length > 0) {
      return (
        <EmptyState
          message="Select a note to start editing"
          description="Choose a note from the sidebar to view and edit its content."
          icon={Sparkles}
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
          className={`transition-all duration-300 ease-in-out overflow-hidden ${ 
            isMobile 
              ? 'fixed left-0 z-50' + (isMobileSidebarOpen ? ' w-80' : ' w-0')
              : 'flex-shrink-0 h-full' + (isSidebarCollapsed ? ' w-16' : ' w-80')
          }`}
          style={isMobile ? {
            top: 'calc(2rem + 24px + 1px)', // h-8 (32px) + py-3 (24px) + border (1px) = 57px
            height: 'calc(100vh - 2rem - 24px - 1px)'
          } : undefined}
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
          className={`flex-1 h-full overflow-y-auto transition-all duration-300 ease-in-out ${ 
            isMobile && isMobileSidebarOpen ? 'opacity-50' : ''
          }`}
          onClick={handleContentAreaClick}
        >
          {renderNoteContent()}
        </div>
      </div>

      {/* Atomic Notes Preview Modal */}
      {atomicNotesPreview && (
        <AtomicNotesPreview
          potentialNotes={atomicNotesPreview.potentialNotes}
          sourceNoteTitle={atomicNotesPreview.sourceNote.title || "Untitled Note"}
          onApprove={handleAtomicNotesApproval}
          onCancel={handleAtomicNotesCancel}
        />
      )}
    </div>
  );
}
