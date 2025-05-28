"use client";

import EmptyState from "@/components/empty-state";
import Header from "@/components/header";
import NotesSidebar from "@/components/notes-sidebar";
import NoteEditor from "@/components/note-editor";
import { loadNotes, saveNotes } from "@/lib/storage";
import { Note } from "@/lib/types";
import { useEffect, useState } from "react";
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

  useEffect(() => {
    setNotes(loadNotes());
  }, []);

  useEffect(() => {
    saveNotes(notes);
  }, [notes]);

  const createNewNote = () => {
    const newNote: Note = {
      id: Date.now().toString(),
      title: getRandomDefaultTitle(),
      content: "",
      createdAt: Date.now(),
    };
    setNotes([newNote, ...notes]);
    setActiveNote(newNote);
  };

  const selectNote = (note: Note) => {
    setActiveNote(note);
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

  return (
    <div className="flex flex-col h-screen">
      <Header onNewNote={createNewNote} />
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-80 flex-shrink-0">
          <NotesSidebar
            createNewNote={createNewNote}
            notes={notes}
            onSelectNote={selectNote}
            onDeleteNote={deleteNote}
            activeNoteId={activeNote?.id}
          />
        </div>
        {/* Main Content */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full p-6">
            {renderNoteContent()}
          </div>
        </div>
      </div>
    </div>
  );
}
