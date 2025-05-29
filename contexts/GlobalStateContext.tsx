import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Note } from '@/lib/types'; // Assuming Note type is in lib/types

interface GlobalState {
  완성된_노트_목록: Note[]; // Example state - adjust as needed
  addHubNoteToSidebar: (note: Note) => void;
  addStructureNoteToSidebar: (note: Note) => void;
  // Add other global state and functions as needed
}

const GlobalStateContext = createContext<GlobalState | undefined>(undefined);

export const GlobalStateProvider = ({ children }: { children: ReactNode }) => {
  const [완성된_노트_목록, set완성된_노트_목록] = useState<Note[]>([]);

  const addHubNoteToSidebar = (note: Note) => {
    // Basic implementation - replace with your actual logic
    set완성된_노트_목록(prev => [...prev, note]);
    console.log('Hub note added to sidebar (placeholder):', note.title);
  };

  const addStructureNoteToSidebar = (note: Note) => {
    // Basic implementation - replace with your actual logic
    set완성된_노트_목록(prev => [...prev, note]);
    console.log('Structure note added to sidebar (placeholder):', note.title);
  };

  // You'll need to add the actual logic for these functions
  // and any other state variables you need globally.

  return (
    <GlobalStateContext.Provider value={{
      완성된_노트_목록,
      addHubNoteToSidebar,
      addStructureNoteToSidebar,
    }}>
      {children}
    </GlobalStateContext.Provider>
  );
};

export const useGlobalState = () => {
  const context = useContext(GlobalStateContext);
  if (context === undefined) {
    throw new Error('useGlobalState must be used within a GlobalStateProvider');
  }
  return context;
}; 