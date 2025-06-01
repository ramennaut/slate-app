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
import { generateHubNoteContent, generateStructureNoteTitle, answerQuestionWithAtomicNotes } from "@/lib/openai";

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
  const [sidebarActiveTab, setSidebarActiveTab] = useState<'notes' | 'hub'>('notes');
  const [searchAnswerData, setSearchAnswerData] = useState<{
    answer: string;
    question: string;
  } | null>(null);
  const [isRefreshingAnswer, setIsRefreshingAnswer] = useState(false);

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
    
    // Clear atomic cards and search data to ensure new note shows immediately
    setOpenAtomicNotes([]);
    setSearchAnswerData(null);
    
    // Switch to Notes tab since new regular notes appear there
    setSidebarActiveTab('notes');
    
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
      // Clear search results when navigating to a regular note
      setSearchAnswerData(null);
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
    // Find the note being deleted and its position
    const noteIndex = notes.findIndex(note => note.id === id);
    
    // Filter out the deleted note
    const updatedNotes = notes.filter(note => note.id !== id);
    setNotes(updatedNotes);
    
    // If this was the active note, select the next one intelligently
    if (activeNote && activeNote.id === id && updatedNotes.length > 0) {
      let nextNote: Note | null = null;
      
      // Try to select the next note in the same position, or the one before if we're at the end
      if (noteIndex < updatedNotes.length) {
        nextNote = updatedNotes[noteIndex];
      } else if (noteIndex > 0) {
        nextNote = updatedNotes[noteIndex - 1];
      } else {
        nextNote = updatedNotes[0];
      }
      
      // If we found a suitable next note, select it
      if (nextNote) {
        setActiveNote(nextNote);
        
        // If it's an atomic note, add it to flash card view
        if (nextNote.isAtomic) {
          setOpenAtomicNotes(prev => {
            const isAlreadyOpen = prev.some(openNote => openNote.id === nextNote!.id);
            if (isAlreadyOpen) {
              return prev;
            }
            return [...prev, nextNote!];
          });
        } else {
          // For regular notes, clear atomic cards
          setOpenAtomicNotes([]);
          setSearchAnswerData(null);
        }
        
        // If we're on mobile, keep the sidebar closed to show the editor
        if (isMobile) {
          setIsMobileSidebarOpen(false);
        }
      }
    } else if (activeNote && activeNote.id === id) {
      // No notes left or no suitable next note
      setActiveNote(null);
      setOpenAtomicNotes([]);
      setSearchAnswerData(null);
    }
    
    // Remove from open atomic cards if it's there
    setOpenAtomicNotes(prev => prev.filter(note => note.id !== id));
    
    console.log(`Note deleted: ${id}${updatedNotes.length > 0 ? ', selected next note' : ', no notes remaining'}`);
  };

  const deleteMultipleNotes = (ids: string[]) => {
    // Find the position of the first deleted note (for smart selection)
    const firstDeletedIndex = Math.min(...ids.map(id => notes.findIndex(note => note.id === id)));
    
    // Filter out deleted notes
    const updatedNotes = notes.filter(note => !ids.includes(note.id));
    setNotes(updatedNotes);
    
    // If the active note is being deleted, select the next one intelligently
    if (activeNote && ids.includes(activeNote.id) && updatedNotes.length > 0) {
      let nextNote: Note | null = null;
      
      // Try to select the next note in the same position as the first deleted note
      if (firstDeletedIndex < updatedNotes.length) {
        nextNote = updatedNotes[firstDeletedIndex];
      } else if (firstDeletedIndex > 0) {
        nextNote = updatedNotes[firstDeletedIndex - 1];
      } else {
        nextNote = updatedNotes[0];
      }
      
      // If we found a suitable next note, select it
      if (nextNote) {
        setActiveNote(nextNote);
        
        // If it's an atomic note, add it to flash card view
        if (nextNote.isAtomic) {
          setOpenAtomicNotes(prev => {
            const isAlreadyOpen = prev.some(openNote => openNote.id === nextNote!.id);
            if (isAlreadyOpen) {
              return prev;
            }
            return [...prev, nextNote!];
          });
        } else {
          // For regular notes, clear atomic cards
          setOpenAtomicNotes([]);
          setSearchAnswerData(null);
        }
        
        // If we're on mobile, keep the sidebar closed to show the editor
        if (isMobile) {
          setIsMobileSidebarOpen(false);
        }
      }
    } else if (activeNote && ids.includes(activeNote.id)) {
      // No notes left or no suitable next note
      setActiveNote(null);
      setOpenAtomicNotes([]);
      setSearchAnswerData(null);
    }
    
    // Remove any deleted notes from open atomic cards
    setOpenAtomicNotes(prev => prev.filter(note => !ids.includes(note.id)));
    
    console.log(`Deleted ${ids.length} notes${updatedNotes.length > 0 ? ', selected next note' : ', no notes remaining'}:`, ids);
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

    // Find the highest existing global number
    const existingAtomicNotes = notes.filter(note => note.isAtomic && note.globalNumber);
    const highestNumber = existingAtomicNotes.length > 0 
      ? Math.max(...existingAtomicNotes.map(note => note.globalNumber || 0))
      : 0;

    // Create new note objects from approved atomic notes with global numbers
    const newNotes: Note[] = approvedNotes.map((atomicNote, index) => ({
      id: `${Date.now()}-${index}`,
      title: atomicNote.title,
      content: atomicNote.content,
      createdAt: Date.now() + index, // Slight offset to maintain order
      isAtomic: true, // Mark as atomic note
      sourceNoteId: atomicNotesPreview.sourceNote.id, // Link to the source note
      globalNumber: highestNumber + index + 1, // Assign unique global number
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
    
    // If no more cards are open, clear search answer data
    if (openAtomicNotes.length <= 1) {
      setSearchAnswerData(null);
    }
  };

  const createTopicFromAtomicNotes = async (selectedAtomicNotes: Note[]) => {
    if (selectedAtomicNotes.length < 1) {
      console.warn('Need at least 1 atomic note to create a topic');
      return;
    }

    try {
      // Generate AI title and description based on atomic note content
      const hubContent = await generateHubNoteContent(
        selectedAtomicNotes.map(note => ({ content: note.content }))
      );

      const hubNote: Note = {
        id: `hub-${Date.now()}`,
        title: hubContent.title,
        content: hubContent.description,
        createdAt: Date.now(),
        isSummary: true,
        noteType: 'hub',
        linkedAtomicNoteIds: selectedAtomicNotes.map(note => note.id),
        hubTheme: hubContent.title,
      };

      // Add the new hub note
      setNotes([hubNote, ...notes]);
      
      // Switch to the Topics tab since hub notes appear there
      setSidebarActiveTab('hub');
      
      // Switch to the new hub note
      setActiveNote(hubNote);
      setOpenAtomicNotes([]); // Close flash card view
      
      // Close mobile sidebar if open
      if (isMobile) {
        setIsMobileSidebarOpen(false);
      }

    } catch (error) {
      console.error("Error creating topic from atomic notes:", error);
      // Handle error (e.g., show a notification to the user)
    }
  };

  const addToExistingHub = async (selectedAtomicNotes: Note[], existingHub: Note) => {
    if (selectedAtomicNotes.length < 1) {
      console.warn('Need at least 1 atomic note to add to hub');
      return;
    }

    try {
      // Get the current linked atomic notes
      const currentLinkedIds = existingHub.linkedAtomicNoteIds || [];
      const newAtomicNoteIds = selectedAtomicNotes.map(note => note.id);
      
      // Combine existing and new atomic note IDs (avoid duplicates)
      const combinedLinkedIds = [...new Set([...currentLinkedIds, ...newAtomicNoteIds])];
      
      // Get all atomic notes that will be linked
      const allLinkedNotes = notes.filter(note => 
        note.isAtomic && combinedLinkedIds.includes(note.id)
      );

      // Generate new hub content based on all linked atomic notes
      const hubContent = await generateHubNoteContent(
        allLinkedNotes.map(note => ({ content: note.content }))
      );

      const updatedHub: Note = {
        ...existingHub,
        title: hubContent.title,
        content: hubContent.description,
        linkedAtomicNoteIds: combinedLinkedIds,
        hubTheme: hubContent.title,
      };

      // Update the hub note in the notes array
      setNotes(prevNotes => 
        prevNotes.map(note => 
          note.id === existingHub.id ? updatedHub : note
        )
      );
      
      // Switch to the Topics tab since hub notes appear there
      setSidebarActiveTab('hub');
      
      // Switch to the updated hub note
      setActiveNote(updatedHub);
      setOpenAtomicNotes([]); // Close flash card view
      
      // Close mobile sidebar if open
      if (isMobile) {
        setIsMobileSidebarOpen(false);
      }

    } catch (error) {
      console.error("Error adding atomic notes to existing hub:", error);
      // Handle error (e.g., show a notification to the user)
    }
  };

  const addToExistingStructuredNote = async (selectedAtomicNotes: Note[], existingStructuredNote: Note) => {
    if (selectedAtomicNotes.length < 1) {
      console.warn('Need at least 1 atomic note to add to structure note');
      return;
    }

    try {
      // Get the current linked atomic notes
      const currentLinkedIds = existingStructuredNote.linkedAtomicNoteIds || [];
      const newAtomicNoteIds = selectedAtomicNotes.map(note => note.id);
      
      // Combine existing and new atomic note IDs (avoid duplicates)
      const combinedLinkedIds = [...new Set([...currentLinkedIds, ...newAtomicNoteIds])];

      // Create content sections for the new atomic notes
      const contentSections = selectedAtomicNotes.map((note) => {
        // Just use the atomic note content without citation numbers
        return note.content;
      });

      // Find a good place to insert the new content (before the Analysis section if it exists)
      let updatedContent = existingStructuredNote.content;
      const analysisSectionRegex = /## Analysis and Connections/i;
      
      if (analysisSectionRegex.test(updatedContent)) {
        // Insert before the Analysis section
        updatedContent = updatedContent.replace(
          analysisSectionRegex,
          `\n\n${contentSections.join('\n\n')}\n\n## Analysis and Connections`
        );
      } else {
        // Append to the end of the main content
        const endOfMainContent = updatedContent.indexOf('\n## ');
        if (endOfMainContent !== -1) {
          updatedContent = 
            updatedContent.slice(0, endOfMainContent) + 
            '\n\n' + contentSections.join('\n\n') + 
            updatedContent.slice(endOfMainContent);
        } else {
          updatedContent += '\n\n' + contentSections.join('\n\n');
        }
      }

      const updatedStructuredNote: Note = {
        ...existingStructuredNote,
        content: updatedContent,
        linkedAtomicNoteIds: combinedLinkedIds,
      };

      // Update the structure note in the notes array
      setNotes(prevNotes => 
        prevNotes.map(note => 
          note.id === existingStructuredNote.id ? updatedStructuredNote : note
        )
      );
      
      // Switch to the Topics tab since structure notes appear there
      setSidebarActiveTab('hub');
      
      // Switch to the updated structure note
      setActiveNote(updatedStructuredNote);
      setOpenAtomicNotes([]); // Close flash card view
      
      // Close mobile sidebar if open
      if (isMobile) {
        setIsMobileSidebarOpen(false);
      }

    } catch (error) {
      console.error("Error adding atomic notes to existing structure note:", error);
      // Handle error (e.g., show a notification to the user)
    }
  };

  const createStructuredNoteFromAtomicNotes = async (selectedAtomicNotes: Note[]) => {
    if (selectedAtomicNotes.length === 0) {
      console.warn('Need at least 1 atomic note to create a structure note');
      return;
    }

    try {
      // Generate AI title based on atomic note content
      const rawTitle = await generateStructureNoteTitle(
        selectedAtomicNotes.map(note => ({ content: note.content }))
      );
      
      // Clean the title by removing quotation marks
      const generatedTitle = rawTitle.replace(/^["']|["']$/g, '');

      // Create content with reference IDs and integrated prose
      const contentSections = selectedAtomicNotes.map((note) => {
        // Just use the atomic note content without citation numbers
        return note.content;
      });

      // Create a more sophisticated structure note with integrated content (no duplicate title)
      const finalContent = `${contentSections.join('\n\n')}

## Analysis and Connections

The ideas presented above reveal several key patterns and relationships. ${selectedAtomicNotes.length > 1 ? 'When considered together, these concepts suggest...' : 'This concept suggests...'}

> **Note:** Expand on the connections between these ideas

## Implications for Practice

These insights have practical implications for how we approach...

> **Note:** Define key terms and concepts here

## Further Development

The relationships between these ideas point toward several areas for further exploration:

> **Note:** What questions do these ideas raise?

---

*This structure note synthesizes ${selectedAtomicNotes.length} atomic note${selectedAtomicNotes.length > 1 ? 's' : ''} into coherent prose. Each referenced idea can be traced back to its source atomic note through the linked notes manager.*`;

      const structuredNote: Note = {
        id: `structured-${Date.now()}`,
        title: generatedTitle,
        content: finalContent,
        createdAt: Date.now(),
        noteType: 'structured',
        linkedAtomicNoteIds: selectedAtomicNotes.map(note => note.id), // Track source atomic notes
      };

      // Add the new structured note
      setNotes([structuredNote, ...notes]);
      
      // Switch to the Topics tab since structured notes appear there
      setSidebarActiveTab('hub');
      
      // Switch to the new structured note
      setActiveNote(structuredNote);
      setOpenAtomicNotes([]); // Close flash card view
      
      // Close mobile sidebar if open
      if (isMobile) {
        setIsMobileSidebarOpen(false);
      }

      console.log(`Created structure note "${generatedTitle}" from ${selectedAtomicNotes.length} atomic notes`);
    } catch (error) {
      console.error('Error creating structure note:', error);
      
      // Fallback to manual creation if AI fails
      const fallbackTitle = `Structure Note - ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
      
      const contentSections = selectedAtomicNotes.map((note) => {
        // Just use the atomic note content without citation numbers
        return note.content;
      });

      const finalContent = `${contentSections.join('\n\n')}

## Analysis and Connections

The ideas presented above reveal several key patterns and relationships.

> **Note:** Expand on the connections between these ideas

## Implications for Practice

These insights have practical implications for how we approach...

> **Note:** Define key terms and concepts here

---

*This structure note synthesizes ${selectedAtomicNotes.length} atomic note${selectedAtomicNotes.length > 1 ? 's' : ''} into coherent prose.*`;

      const structuredNote: Note = {
        id: `structured-${Date.now()}`,
        title: fallbackTitle,
        content: finalContent,
        createdAt: Date.now(),
        noteType: 'structured',
        linkedAtomicNoteIds: selectedAtomicNotes.map(note => note.id),
      };

      setNotes([structuredNote, ...notes]);
      setActiveNote(structuredNote);
      setOpenAtomicNotes([]);
      
      if (isMobile) {
        setIsMobileSidebarOpen(false);
      }

      console.log(`Created fallback structure note from ${selectedAtomicNotes.length} atomic notes`);
    }
  };

  // Add train of thought to structured note (new or existing)
  const addTrainOfThoughtToStructuredNote = async (hubNote: Note, selectedStructuredNote?: Note) => {
    const trainOfThought = hubNote.content; // The hub note's content is the train of thought
    const hubTitle = hubNote.title || hubNote.hubTheme || "Hub Note Insight";
    const hubLinkedNoteIds = hubNote.linkedAtomicNoteIds || [];
    
    if (selectedStructuredNote) {
      // Add to existing structured note
      const updatedContent = selectedStructuredNote.content + `\n\n## ${hubTitle}\n\n${trainOfThought}\n\n> **Source:** This insight comes from the hub note "${hubTitle}" which connects multiple atomic notes.\n\n---\n`;
      
      // Combine existing linked notes with hub note's linked notes (avoid duplicates)
      const existingLinkedIds = selectedStructuredNote.linkedAtomicNoteIds || [];
      const combinedLinkedIds = [...new Set([...existingLinkedIds, ...hubLinkedNoteIds])];
      
      const updatedNote: Note = {
        ...selectedStructuredNote,
        content: updatedContent,
        linkedAtomicNoteIds: combinedLinkedIds,
      };
      
      setNotes(prev => prev.map(note => note.id === selectedStructuredNote.id ? updatedNote : note));
      setActiveNote(updatedNote);
      
      console.log(`Added train of thought from "${hubTitle}" to existing structure note "${selectedStructuredNote.title}" with ${hubLinkedNoteIds.length} sources`);
    } else {
      // Create new structured note with the train of thought
      try {
        const rawTitle = await generateStructureNoteTitle([{ content: trainOfThought }]);
        
        // Clean the title by removing quotation marks
        const generatedTitle = rawTitle.replace(/^["']|["']$/g, '');
        
        const finalContent = `## ${hubTitle}

${trainOfThought}

> **Source:** This insight comes from the hub note "${hubTitle}" which connects multiple atomic notes.

## Analysis and Development

The train of thought above suggests several key ideas worth exploring further...

> **Note:** Expand on how this insight connects to other concepts

## Implications for Practice

This perspective has practical implications for...

> **Note:** Consider how this insight could be applied

## Related Questions

This train of thought raises several important questions:

> **Note:** What questions does this insight bring up?

---

*This structure note began with insights from the hub note "${hubTitle}". Consider linking related atomic notes to develop these ideas further.*`;

        const structuredNote: Note = {
          id: `structured-${Date.now()}`,
          title: generatedTitle,
          content: finalContent,
          createdAt: Date.now(),
          noteType: 'structured',
          linkedAtomicNoteIds: hubLinkedNoteIds, // Include all sources from the hub note
        };

        // Add the new structured note
        setNotes([structuredNote, ...notes]);
        
        // Switch to the Topics tab since structured notes appear there
        setSidebarActiveTab('hub');
        
        // Switch to the new structured note
        setActiveNote(structuredNote);
        
        // Close mobile sidebar if open
        if (isMobile) {
          setIsMobileSidebarOpen(false);
        }

        console.log(`Created new structure note "${generatedTitle}" from train of thought in hub note "${hubTitle}" with ${hubLinkedNoteIds.length} sources`);
      } catch (error) {
        console.error('Error creating structure note from train of thought:', error);
        
        // Fallback to simple structure note
        const fallbackTitle = `Structure Note - ${hubTitle}`;
        
        const finalContent = `## ${hubTitle}

${trainOfThought}

> **Source:** This insight comes from the hub note "${hubTitle}" which connects multiple atomic notes.

## Analysis and Development

The train of thought above suggests several key ideas worth exploring further...

---

*This structure note began with insights from the hub note "${hubTitle}".*`;

        const structuredNote: Note = {
          id: `structured-${Date.now()}`,
          title: fallbackTitle,
          content: finalContent,
          createdAt: Date.now(),
          noteType: 'structured',
          linkedAtomicNoteIds: hubLinkedNoteIds, // Include all sources from the hub note
        };

        setNotes([structuredNote, ...notes]);
        
        // Switch to the Topics tab since structured notes appear there
        setSidebarActiveTab('hub');
        
        setActiveNote(structuredNote);
        
        if (isMobile) {
          setIsMobileSidebarOpen(false);
        }

        console.log(`Created fallback structure note from train of thought in hub note "${hubTitle}" with ${hubLinkedNoteIds.length} sources`);
      }
    }
  };

  // Handle RAG question submission
  const handleQuestionSubmit = async (question: string): Promise<{ answer: string; sourcedNotes: Note[] }> => {
    const atomicNotes = notes.filter(note => note.isAtomic);
    
    if (atomicNotes.length === 0) {
      return {
        answer: "You don't have any atomic notes yet. Create some atomic notes first by splitting your regular notes into smaller, focused ideas.",
        sourcedNotes: []
      };
    }
    
    try {
      const result = await answerQuestionWithAtomicNotes(
        question, 
        atomicNotes.map(note => ({
          id: note.id,
          content: note.content,
          globalNumber: note.globalNumber
        }))
      );
      
      // Map back to full Note objects for display
      const sourcedNotes = result.sourcedNotes.map(sourceNote => 
        notes.find(note => note.id === sourceNote.id)
      ).filter(note => note !== undefined) as Note[];
      
      return {
        answer: result.answer,
        sourcedNotes
      };
    } catch (error) {
      console.error("Error in handleQuestionSubmit:", error);
      return {
        answer: `Something went wrong while processing your question: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
        sourcedNotes: []
      };
    }
  };

  // Handle viewing search result sources as cards
  const handleViewSourcesAsCards = (sourcedNotes: Note[], answer: string, question: string) => {
    // Clear active note and set the sourced notes as open atomic notes
    setActiveNote(null);
    setOpenAtomicNotes(sourcedNotes);
    
    // Store the search answer data
    setSearchAnswerData({ answer, question });
    
    // Close mobile sidebar if open
    if (isMobile) {
      setIsMobileSidebarOpen(false);
    }
  };

  // Handle refreshing the search answer with updated atomic notes
  const handleRefreshAnswer = async () => {
    if (!searchAnswerData?.question || isRefreshingAnswer || openAtomicNotes.length === 0) return;
    
    setIsRefreshingAnswer(true);
    
    try {
      // Use only the atomic notes currently shown in the flash card viewer
      const result = await answerQuestionWithAtomicNotes(
        searchAnswerData.question,
        openAtomicNotes.map(note => ({
          id: note.id,
          content: note.content,
          globalNumber: note.globalNumber
        }))
      );
      
      // Always update with the new answer (since function never returns null now)
      setSearchAnswerData({ 
        answer: result.answer, 
        question: searchAnswerData.question 
      });
      // Note: We don't update openAtomicNotes here since we want to keep the current viewer state
    } catch (error) {
      console.error("Error refreshing answer:", error);
      // Provide user feedback even on error
      setSearchAnswerData({ 
        answer: `Error refreshing answer: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`, 
        question: searchAnswerData.question 
      });
    } finally {
      setIsRefreshingAnswer(false);
    }
  };

  // Handle closing the search answer
  const handleCloseAnswer = () => {
    setSearchAnswerData(null);
    setOpenAtomicNotes([]);
    setActiveNote(null);
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

    // Show search results or multi-card view if we have search data OR atomic notes are open
    if (searchAnswerData || openAtomicNotes.length > 0) {
      // Get existing hub notes for the dropdown
      const existingHubNotes = notes.filter(note => 
        note.isSummary && (note.noteType === 'hub' || !note.noteType)
      );

      // Get existing structure notes for the dropdown
      const existingStructuredNotes = notes.filter(note => 
        note.noteType === 'structured'
      );

      return (
        <AtomicCardsView
          notes={openAtomicNotes}
          allNotes={notes}
          onSave={saveNote}
          onSelectNote={selectNote}
          onCloseCard={closeAtomicCard}
          onCreateTopic={createTopicFromAtomicNotes}
          onAddToExistingHub={addToExistingHub}
          onCreateStructuredNote={createStructuredNoteFromAtomicNotes}
          onAddToExistingStructuredNote={addToExistingStructuredNote}
          onDeleteNote={deleteNote}
          onCreateAtomicNotes={createAtomicNotes}
          searchAnswer={searchAnswerData?.answer}
          searchQuestion={searchAnswerData?.question}
          onRefreshAnswer={handleRefreshAnswer}
          isRefreshingAnswer={isRefreshingAnswer}
          onCloseAnswer={handleCloseAnswer}
          existingHubNotes={existingHubNotes}
          existingStructuredNotes={existingStructuredNotes}
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
            onAddTrainOfThoughtToStructuredNote={addTrainOfThoughtToStructuredNote}
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

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      <Header 
        createNewNote={createNewNote} 
        toggleSidebar={handleToggleSidebar} 
        isMobile={isMobile} 
        notes={notes}
        onQuestionSubmit={handleQuestionSubmit}
        onViewSourcesAsCards={handleViewSourcesAsCards}
      />
      <div className="flex flex-1 overflow-hidden">
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
          <NotesSidebar
            notes={notes}
            onSelectNote={selectNote}
            createNewNote={createNewNote}
            onDeleteNote={deleteNote}
            onDeleteMultipleNotes={deleteMultipleNotes}
            activeNoteId={activeNote?.id}
            isCollapsed={isMobile ? !isMobileSidebarOpen : isSidebarCollapsed}
            toggleSidebar={handleToggleSidebar}
            isMobile={isMobile}
            activeTab={sidebarActiveTab}
            onTabChange={setSidebarActiveTab}
          />
        </div>

        {/* Main Content Area */} 
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