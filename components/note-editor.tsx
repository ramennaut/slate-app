"use client";

import { Note } from "@/lib/types";
import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardFooter, CardHeader } from "./ui/card";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { Save, Check } from "lucide-react";

interface NoteEditorProps {
  note: Note;
  onSave: (note: Note) => void;
  onCancel?: () => void;
}

export default function NoteEditor({
  note,
  onCancel,
  onSave,
}: NoteEditorProps) {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef({ title: note.title, content: note.content });
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Update local state when note prop changes (when switching notes)
  useEffect(() => {
    setTitle(note.title);
    setContent(note.content);
    lastSavedRef.current = { title: note.title, content: note.content };
    setSaveStatus('idle');
  }, [note.id]); // Dependency on note.id to detect note changes

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      const textarea = e.currentTarget;
      const cursorPosition = textarea.selectionStart;
      const textBeforeCursor = content.substring(0, cursorPosition);
      const textAfterCursor = content.substring(cursorPosition);
      
      // Find the current line
      const lines = textBeforeCursor.split('\n');
      const currentLine = lines[lines.length - 1];
      
      // Check if current line is a bullet point
      const bulletMatch = currentLine.match(/^(\s*)• (.*)$/);
      
      if (bulletMatch) {
        e.preventDefault();
        const indent = bulletMatch[1];
        const bulletText = bulletMatch[2];
        
        // If the bullet point is empty, remove it and exit bullet mode
        if (bulletText.trim() === '') {
          const newContent = textBeforeCursor.replace(/\n\s*• $/, '\n') + textAfterCursor;
          setContent(newContent);
          
          // Set cursor position
          setTimeout(() => {
            if (textareaRef.current) {
              const newPosition = cursorPosition - (indent.length + 2);
              textareaRef.current.setSelectionRange(newPosition, newPosition);
            }
          }, 0);
        } else {
          // Continue with new bullet point
          const newContent = textBeforeCursor + '\n' + indent + '• ' + textAfterCursor;
          setContent(newContent);
          
          // Set cursor position after the new bullet
          setTimeout(() => {
            if (textareaRef.current) {
              const newPosition = cursorPosition + indent.length + 3;
              textareaRef.current.setSelectionRange(newPosition, newPosition);
            }
          }, 0);
        }
      }
    }
  };

  // Handle automatic bullet point conversion
  useEffect(() => {
    const lines = content.split('\n');
    let hasChanges = false;
    
    const processedLines = lines.map(line => {
      // Convert "- " to bullet point at the beginning of a line
      if (line.match(/^(\s*)- (.+)$/)) {
        hasChanges = true;
        return line.replace(/^(\s*)- (.+)$/, '$1• $2');
      }
      // Convert standalone "- " to bullet point
      if (line.match(/^(\s*)- $/)) {
        hasChanges = true;
        return line.replace(/^(\s*)- $/, '$1• ');
      }
      return line;
    });
    
    if (hasChanges) {
      const newContent = processedLines.join('\n');
      setContent(newContent);
      
      // Maintain cursor position
      setTimeout(() => {
        if (textareaRef.current) {
          const cursorPos = textareaRef.current.selectionStart;
          textareaRef.current.setSelectionRange(cursorPos, cursorPos);
        }
      }, 0);
    }
  }, [content]);

  const autoSave = () => {
    const updatedNote = {
      ...note,
      title: title.trim() || "Untitled Note",
      content,
    };
    
    // Only save if content has actually changed
    if (lastSavedRef.current.title !== title || lastSavedRef.current.content !== content) {
      setSaveStatus('saving');
      onSave(updatedNote);
      lastSavedRef.current = { title, content };
      
      // Show "saved" status briefly
      setTimeout(() => {
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 1500);
      }, 100);
    }
  };

  // Autosave effect
  useEffect(() => {
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout for autosave
    timeoutRef.current = setTimeout(() => {
      autoSave();
    }, 2000); // 2 seconds delay

    // Cleanup function
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [title, content]); // Dependencies: title and content

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleManualSave = () => {
    // Clear any pending autosave
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    const updatedNote = {
      ...note,
      title: title.trim() || "Untitled Note",
      content,
    };
    
    setSaveStatus('saving');
    onSave(updatedNote);
    lastSavedRef.current = { title, content };
    
    setTimeout(() => {
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 1500);
    }, 100);
  };

  const getSaveButtonContent = () => {
    switch (saveStatus) {
      case 'saving':
        return (
          <>
            <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2" />
            Saving...
          </>
        );
      case 'saved':
        return (
          <>
            <Check className="h-4 w-4 mr-2" />
            Saved
          </>
        );
      default:
        return (
          <>
            <Save className="h-4 w-4 mr-2" />
            Save
          </>
        );
    }
  };

  return (
    <Card>
      <CardHeader>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Note title"
          className="text-xl font-bold border-none px-0 focus-visible:ring-0"
        />
      </CardHeader>
      <CardContent>
        <Textarea
          value={content}
          onChange={handleContentChange}
          onKeyDown={handleKeyDown}
          placeholder="Write your note here..."
          className="h-[calc(100vh-350px)] resize-none border-none focus-visible:ring-0 p-0 "
          ref={textareaRef}
        />
      </CardContent>
      <CardFooter className="flex justify-between items-center">
        <div className="text-sm text-muted-foreground">
          {saveStatus === 'idle' && "Changes autosave after 2 seconds"}
          {saveStatus === 'saving' && "Saving..."}
          {saveStatus === 'saved' && "✓ Autosaved"}
        </div>
        <div className="flex space-x-2">
          <Button 
            onClick={handleManualSave}
            disabled={saveStatus === 'saving'}
            size="sm"
          >
            {getSaveButtonContent()}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
