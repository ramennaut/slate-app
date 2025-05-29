"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import { Check, X, FileText, Zap, Edit3, Eye, EyeOff } from "lucide-react";

interface AtomicNotesPreviewProps {
  potentialNotes: Array<{ title: string; content: string }>;
  onApprove: (selectedNotes: Array<{ title: string; content: string }>) => void;
  onCancel: () => void;
  sourceNoteTitle: string;
}

export default function AtomicNotesPreview({
  potentialNotes,
  onApprove,
  onCancel,
  sourceNoteTitle
}: AtomicNotesPreviewProps) {
  // Track which notes are selected (all selected by default)
  const [selectedNotes, setSelectedNotes] = useState<Set<number>>(
    new Set(potentialNotes.map((_, index) => index))
  );

  // Track edited content for each note
  const [editedNotes, setEditedNotes] = useState<Map<number, string>>(new Map());
  
  // Track which notes are in edit mode
  const [editingNotes, setEditingNotes] = useState<Set<number>>(new Set());

  // View mode: grid or list
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Show only selected notes
  const [showOnlySelected, setShowOnlySelected] = useState(false);

  const toggleNote = (index: number) => {
    const newSelected = new Set(selectedNotes);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedNotes(newSelected);
  };

  const toggleEdit = (index: number) => {
    const newEditing = new Set(editingNotes);
    if (newEditing.has(index)) {
      newEditing.delete(index);
    } else {
      newEditing.add(index);
    }
    setEditingNotes(newEditing);
  };

  const updateNoteContent = (index: number, content: string) => {
    const newEdited = new Map(editedNotes);
    newEdited.set(index, content);
    setEditedNotes(newEdited);
  };

  const getNoteContent = (index: number) => {
    return editedNotes.get(index) ?? potentialNotes[index].content;
  };

  const handleApprove = () => {
    const approved = potentialNotes
      .map((_, index) => ({
        title: potentialNotes[index].title,
        content: getNoteContent(index)
      }))
      .filter((_, index) => selectedNotes.has(index));
    onApprove(approved);
  };

  const selectAll = () => {
    setSelectedNotes(new Set(potentialNotes.map((_, index) => index)));
  };

  const selectNone = () => {
    setSelectedNotes(new Set());
  };

  const filteredIndices = showOnlySelected 
    ? potentialNotes.map((_, index) => index).filter(index => selectedNotes.has(index))
    : potentialNotes.map((_, index) => index);

  const renderNoteCard = (index: number) => {
    const note = potentialNotes[index];
    const isSelected = selectedNotes.has(index);
    const isEditing = editingNotes.has(index);
    const content = getNoteContent(index);

    if (viewMode === 'list') {
      return (
        <div
          key={index}
          className={`flex items-start gap-4 p-4 rounded-lg border transition-all duration-200 ${
            isSelected
              ? "border-primary/50 bg-primary/5"
              : "border-border hover:border-border/80 bg-card"
          }`}
        >
          {/* Selection checkbox */}
          <div
            onClick={() => toggleNote(index)}
            className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer transition-colors ${
              isSelected
                ? "border-primary bg-primary text-white"
                : "border-muted-foreground/30 hover:border-primary/50"
            }`}
          >
            {isSelected && <Check className="h-3 w-3" />}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-3 w-3 text-muted-foreground/60" />
              <span className="text-xs text-muted-foreground font-medium">
                Atomic Note {index + 1}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleEdit(index)}
                className="h-6 w-6 p-0 ml-auto"
              >
                <Edit3 className="h-3 w-3" />
              </Button>
            </div>
            {isEditing ? (
              <textarea
                value={content}
                onChange={(e) => updateNoteContent(index, e.target.value)}
                className="w-full min-h-[80px] p-2 text-sm border border-border rounded resize-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            ) : (
              <p className="text-sm text-foreground/90 leading-relaxed">
                {content}
              </p>
            )}
          </div>
        </div>
      );
    }

    // Grid view
    return (
      <div
        key={index}
        className={`relative rounded-xl border p-4 transition-all duration-200 ${
          isSelected
            ? "border-primary/50 bg-primary/5 shadow-md"
            : "border-border hover:border-border/80 bg-card"
        }`}
      >
        {/* Selection indicator and edit button */}
        <div className="flex items-center justify-between mb-2">
          <div
            onClick={() => toggleNote(index)}
            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center cursor-pointer transition-colors ${
              isSelected
                ? "border-primary bg-primary text-white"
                : "border-muted-foreground/30 hover:border-primary/50"
            }`}
          >
            {isSelected && <Check className="h-3 w-3" />}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => toggleEdit(index)}
            className="h-6 w-6 p-0"
          >
            <Edit3 className="h-3 w-3" />
          </Button>
        </div>

        {/* Note header */}
        <div className="flex items-center gap-2 mb-2">
          <FileText className="h-3 w-3 text-muted-foreground/60" />
          <span className="text-xs text-muted-foreground font-medium">
            Atomic Note {index + 1}
          </span>
        </div>

        {/* Note content */}
        {isEditing ? (
          <textarea
            value={content}
            onChange={(e) => updateNoteContent(index, e.target.value)}
            className="w-full h-32 p-2 text-sm border border-border rounded resize-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        ) : (
          <p className="text-sm text-foreground/90 leading-relaxed line-clamp-6">
            {content}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] relative">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 px-6 py-5 border-b border-border/50 bg-card rounded-t-2xl">
          <div className="flex items-center gap-3 mb-2">
            <Zap className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold text-foreground">
              Create Atomic Notes
            </h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Review, edit, and select which atomic notes to create from &quot;{sourceNoteTitle}&quot;
          </p>
          
          {/* Controls */}
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">
                {selectedNotes.size} of {potentialNotes.length} selected
              </span>
              <Button variant="ghost" size="sm" onClick={selectAll} className="h-6 px-2 text-xs">
                Select All
              </Button>
              <Button variant="ghost" size="sm" onClick={selectNone} className="h-6 px-2 text-xs">
                Select None
              </Button>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowOnlySelected(!showOnlySelected)}
                className="h-6 px-2 text-xs"
              >
                {showOnlySelected ? <Eye className="h-3 w-3 mr-1" /> : <EyeOff className="h-3 w-3 mr-1" />}
                {showOnlySelected ? 'Show All' : 'Selected Only'}
              </Button>
              <div className="flex rounded-md border border-border overflow-hidden">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="h-6 px-2 text-xs rounded-none"
                >
                  Grid
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="h-6 px-2 text-xs rounded-none"
                >
                  List
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Content - Scrollable area with fixed positioning */}
        <div 
          className="absolute top-[140px] bottom-[80px] left-0 right-0 overflow-y-auto p-6"
          style={{ scrollbarWidth: 'thin' }}
        >
          <div className={
            viewMode === 'grid' 
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-4"
              : "space-y-3 pb-4"
          }>
            {filteredIndices.map(index => renderNoteCard(index))}
          </div>
        </div>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 px-6 py-4 border-t border-border/50 bg-card rounded-b-2xl">
          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              {editedNotes.size > 0 && `${editedNotes.size} note${editedNotes.size !== 1 ? 's' : ''} edited`}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={onCancel}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button
                onClick={handleApprove}
                disabled={selectedNotes.size === 0}
                className="min-w-[120px]"
              >
                <Zap className="h-4 w-4 mr-2" />
                Create {selectedNotes.size} Note{selectedNotes.size !== 1 ? 's' : ''}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 