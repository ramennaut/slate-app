"use client";

import { Note } from "@/lib/types";
import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "./ui/button";
import { ArrowLeft, X, Plus, Trash2, Layers, BookOpen, MessageCircle, Search, ChevronDown } from "lucide-react";
import { generateTermDefinition } from "@/lib/openai";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ScrollArea } from "./ui/scroll-area";

interface AtomicCardsViewProps {
  notes: Note[];
  allNotes: Note[];
  onSave: (note: Note) => void;
  onSelectNote: (note: Note) => void;
  onCloseCard: (noteId: string) => void;
  onCreateTopic?: (selectedAtomicNotes: Note[]) => Promise<void>;
  onAddToExistingHub?: (selectedAtomicNotes: Note[], hubNote: Note) => Promise<void>;
  onCreateStructuredNote?: (selectedAtomicNotes: Note[]) => void;
  onAddToExistingStructuredNote?: (selectedAtomicNotes: Note[], structuredNote: Note) => Promise<void>;
  onDeleteNote?: (noteId: string) => void;
  onCreateAtomicNotes?: (atomicNotes: Array<{ title: string; content: string }>) => void;
  searchAnswer?: string;
  searchQuestion?: string;
  onRefreshAnswer?: () => void;
  isRefreshingAnswer?: boolean;
  onCloseAnswer?: () => void;
  existingHubNotes?: Note[];
  existingStructuredNotes?: Note[];
}

interface CardState {
  [noteId: string]: {
    content: string;
    hasUnsavedChanges: boolean;
  };
}

// Component to render search answer with clickable atomic note references
interface SearchAnswerDisplayProps {
  answer: string;
  question?: string;
  noteCount: number;
  onNoteClick: (noteReference: string) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  onClose?: () => void;
}

function SearchAnswerDisplay({ answer, question, noteCount, onNoteClick, onRefresh, isRefreshing, onClose }: SearchAnswerDisplayProps) {
  // Component to render markdown with clickable note references
  const MarkdownWithNoteRefs = ({ text }: { text: string }) => {
    const markdownRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
      if (!markdownRef.current) return;
      
      // Find all text nodes and process citations
      const processTextNodes = (element: HTMLElement) => {
        const walker = document.createTreeWalker(
          element,
          NodeFilter.SHOW_TEXT,
          null
        );
        
        const textNodes: Text[] = [];
        let node: Text | null;
        
        while ((node = walker.nextNode() as Text | null)) {
          if (node.textContent && node.textContent.includes('AN-')) {
            textNodes.push(node);
          }
        }
        
        // Process each text node that contains citations
        textNodes.forEach(textNode => {
          const parent = textNode.parentNode;
          if (!parent) return;
          
          const text = textNode.textContent || '';
          const citationRegex = /(\([^)]*AN-\d+[^)]*\)|AN-\d+)/g;
          
          if (!text.match(citationRegex)) return;
          
          // Create document fragment to hold new nodes
          const fragment = document.createDocumentFragment();
          let lastIndex = 0;
          let match: RegExpExecArray | null;
          
          while ((match = citationRegex.exec(text)) !== null) {
            // Add text before citation
            if (match.index > lastIndex) {
              fragment.appendChild(document.createTextNode(text.substring(lastIndex, match.index)));
            }
            
            const citation = match[1];
            if (!citation) continue; // Safety check
            
            // Handle parenthesized groups with multiple citations
            if (citation.startsWith('(') && citation.endsWith(')')) {
              fragment.appendChild(document.createTextNode('('));
              
              const inner = citation.slice(1, -1);
              const innerRegex = /(AN-\d+)/g;
              let innerLastIndex = 0;
              let innerMatch: RegExpExecArray | null;
              
              while ((innerMatch = innerRegex.exec(inner)) !== null) {
                // Add text before citation
                if (innerMatch.index > innerLastIndex) {
                  fragment.appendChild(document.createTextNode(inner.substring(innerLastIndex, innerMatch.index)));
                }
                
                // Create clickable button for citation - capture the value immediately
                const citationText = innerMatch[1];
                if (!citationText) continue; // Safety check
                
                const button = document.createElement('button');
                button.textContent = citationText;
                button.className = 'text-primary hover:text-primary/80 font-medium underline decoration-primary/30 hover:decoration-primary/60 transition-colors cursor-pointer';
                button.onclick = () => onNoteClick(citationText);
                fragment.appendChild(button);
                
                innerLastIndex = innerMatch.index + innerMatch[0].length;
              }
              
              // Add remaining text
              if (innerLastIndex < inner.length) {
                fragment.appendChild(document.createTextNode(inner.substring(innerLastIndex)));
              }
              
              fragment.appendChild(document.createTextNode(')'));
            } else {
              // Single citation
              const button = document.createElement('button');
              button.textContent = citation;
              button.className = 'text-primary hover:text-primary/80 font-medium underline decoration-primary/30 hover:decoration-primary/60 transition-colors cursor-pointer';
              button.onclick = () => onNoteClick(citation);
              fragment.appendChild(button);
            }
            
            lastIndex = match.index + match[0].length;
          }
          
          // Add remaining text
          if (lastIndex < text.length) {
            fragment.appendChild(document.createTextNode(text.substring(lastIndex)));
          }
          
          // Replace the original text node with our processed fragment
          parent.replaceChild(fragment, textNode);
        });
      };
      
      // Process the rendered markdown
      processTextNodes(markdownRef.current);
    }, [text]); // Removed onNoteClick from dependencies

    return (
      <div ref={markdownRef}>
        <ReactMarkdown 
          remarkPlugins={[remarkGfm]}
          components={{
            // Style other markdown elements properly
            p: ({ children }) => (
              <p className="mb-3 last:mb-0">{children}</p>
            ),
            strong: ({ children }) => (
              <strong className="font-semibold">{children}</strong>
            ),
            em: ({ children }) => (
              <em className="italic">{children}</em>
            ),
            code: ({ children }) => (
              <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono">{children}</code>
            ),
            ul: ({ children }) => (
              <ul className="list-disc list-outside mb-3 space-y-1 ml-6">{children}</ul>
            ),
            ol: ({ children }) => (
              <ol className="list-decimal list-outside mb-3 space-y-1 ml-6">{children}</ol>
            ),
            li: ({ children }) => (
              <li className="leading-relaxed pl-2">{children}</li>
            ),
            h1: ({ children }) => (
              <h1 className="text-lg font-bold mb-3 mt-4 first:mt-0">{children}</h1>
            ),
            h2: ({ children }) => (
              <h2 className="text-md font-bold mb-2 mt-3 first:mt-0">{children}</h2>
            ),
            h3: ({ children }) => (
              <h3 className="text-sm font-bold mb-2 mt-2 first:mt-0">{children}</h3>
            ),
            blockquote: ({ children }) => (
              <blockquote className="border-l-4 border-primary/30 pl-4 italic mb-3 mt-3">{children}</blockquote>
            ),
            pre: ({ children }) => (
              <pre className="bg-muted p-3 rounded-lg overflow-x-auto text-xs font-mono mb-3 mt-3">{children}</pre>
            ),
          }}
        >
          {text}
        </ReactMarkdown>
      </div>
    );
  };

  return (
    <div className="mb-6 p-6 bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 rounded-xl">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
          <MessageCircle className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              {question && (
                <div className="text-sm font-medium text-muted-foreground">
                  Q: {question}
                </div>
              )}
            </div>
            <div className="flex items-center gap-1 ml-3">
              {onRefresh && (
                <Button
                  onClick={onRefresh}
                  disabled={isRefreshing}
                  size="sm"
                  variant="ghost"
                  className="p-1.5 h-auto text-muted-foreground/60 hover:text-foreground hover:bg-background/50 rounded-lg transition-colors"
                  title="Refresh answer with current notes"
                >
                  {isRefreshing ? (
                    <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                  ) : (
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  )}
                </Button>
              )}
              {onClose && (
                <Button
                  onClick={onClose}
                  size="sm"
                  variant="ghost"
                  className="p-1.5 h-auto text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                  title="Close search answer"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
          <div className="prose prose-sm max-w-none text-foreground">
            <div className="text-sm leading-relaxed">
              <MarkdownWithNoteRefs text={answer} />
            </div>
          </div>
          <div className="mt-3 text-xs text-muted-foreground">
            📚 Based on {noteCount} source note{noteCount !== 1 ? 's' : ''} shown below
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AtomicCardsView({
  notes,
  allNotes,
  onSave,
  onSelectNote,
  onCloseCard,
  onCreateTopic,
  onAddToExistingHub,
  onCreateStructuredNote,
  onAddToExistingStructuredNote,
  onDeleteNote,
  onCreateAtomicNotes,
  searchAnswer,
  searchQuestion,
  onRefreshAnswer,
  isRefreshingAnswer,
  onCloseAnswer,
  existingHubNotes,
  existingStructuredNotes,
}: AtomicCardsViewProps) {
  const [cardStates, setCardStates] = useState<CardState>({});
  const [isCreatingTopic, setIsCreatingTopic] = useState(false);
  const [isCreatingStructured, setIsCreatingStructured] = useState(false);
  const [highlightedNoteId, setHighlightedNoteId] = useState<string | null>(null);
  
  // Add Notes functionality - similar to hub notes
  const [showAddNotes, setShowAddNotes] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  
  // Hub dropdown state
  const [showHubDropdown, setShowHubDropdown] = useState(false);
  const hubDropdownRef = useRef<HTMLButtonElement>(null);
  const hubPopoverRef = useRef<HTMLDivElement>(null);
  
  // Structure note dropdown state
  const [showStructureDropdown, setShowStructureDropdown] = useState(false);
  const structureDropdownRef = useRef<HTMLButtonElement>(null);
  const structurePopoverRef = useRef<HTMLDivElement>(null);
  
  // Text selection and context menu state
  const [selectedText, setSelectedText] = useState("");
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [isDefiningTerm, setIsDefiningTerm] = useState(false);
  const [activeTextareaId, setActiveTextareaId] = useState<string | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const textareaRefs = useRef<{[key: string]: HTMLTextAreaElement | null}>({});
  const cardRefs = useRef<{[key: string]: HTMLDivElement | null}>({});

  // Get available atomic notes (not currently shown in flash card view)
  const openNoteIds = notes.map(note => note.id);
  const availableAtomicNotes = allNotes.filter(note => 
    note.isAtomic && !openNoteIds.includes(note.id)
  );

  // Search functionality for adding notes
  const getSearchResults = () => {
    if (!searchQuery.trim()) {
      return availableAtomicNotes;
    }

    const query = searchQuery.toLowerCase();
    
    return availableAtomicNotes.filter(note => {
      // Search by content
      if (note.content.toLowerCase().includes(query)) {
        return true;
      }
      
      // Search by global number (e.g., "AN-1" or just "1")
      if (note.globalNumber) {
        const noteRef = `an-${note.globalNumber}`;
        if (noteRef.includes(query) || note.globalNumber.toString() === query) {
          return true;
        }
      }
      
      return false;
    });
  };

  const searchResults = getSearchResults();

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current && 
        !popoverRef.current.contains(event.target as Node) &&
        addButtonRef.current &&
        !addButtonRef.current.contains(event.target as Node)
      ) {
        setShowAddNotes(false);
        setSearchQuery("");
      }
      
      if (
        hubPopoverRef.current && 
        !hubPopoverRef.current.contains(event.target as Node) &&
        hubDropdownRef.current &&
        !hubDropdownRef.current.contains(event.target as Node)
      ) {
        setShowHubDropdown(false);
      }

      if (
        structurePopoverRef.current && 
        !structurePopoverRef.current.contains(event.target as Node) &&
        structureDropdownRef.current &&
        !structureDropdownRef.current.contains(event.target as Node)
      ) {
        setShowStructureDropdown(false);
      }
    };

    if (showAddNotes || showHubDropdown || showStructureDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showAddNotes, showHubDropdown, showStructureDropdown]);

  // Add atomic note to flash card view
  const addAtomicNoteToCards = (atomicNote: Note) => {
    // Simply trigger onSelectNote to add it to the flash card view
    onSelectNote(atomicNote);
    setShowAddNotes(false);
    setSearchQuery("");
  };

  // Helper function to get preview text
  const getPreviewText = (content: string) => {
    return content.length > 100 ? content.substring(0, 100) + "..." : content;
  };

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contextMenuRef.current && 
          !contextMenuRef.current.contains(event.target as Node)) {
        setShowContextMenu(false);
      }
    };

    if (showContextMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showContextMenu]);

  const handleCreateTopic = async () => {
    if (!onCreateTopic || notes.length < 1) return;
    
    setIsCreatingTopic(true);
    setShowHubDropdown(false);
    
    try {
      await onCreateTopic(notes); // Use all notes in the flash card view
    } catch (error) {
      console.error('Failed to create topic:', error);
    } finally {
      setIsCreatingTopic(false);
    }
  };

  const handleAddToExistingHub = (hubNote: Note) => {
    if (!onAddToExistingHub || notes.length < 1) return;
    
    setIsCreatingTopic(true);
    setShowHubDropdown(false);
    
    try {
      onAddToExistingHub(notes, hubNote);
    } catch (error) {
      console.error('Failed to add to existing hub:', error);
    } finally {
      setIsCreatingTopic(false);
    }
  };

  const handleAddToExistingStructuredNote = (structuredNote: Note) => {
    if (!onAddToExistingStructuredNote || notes.length < 1) return;
    
    setIsCreatingStructured(true);
    setShowStructureDropdown(false);
    
    try {
      onAddToExistingStructuredNote(notes, structuredNote);
    } catch (error) {
      console.error('Failed to add to existing structure note:', error);
    } finally {
      setIsCreatingStructured(false);
    }
  };

  const handleCreateStructuredNote = () => {
    if (!onCreateStructuredNote || notes.length === 0) return;
    
    setIsCreatingStructured(true);
    
    try {
      onCreateStructuredNote(notes); // Use all notes in the flash card view
    } catch (error) {
      console.error('Failed to create structured note:', error);
    } finally {
      setIsCreatingStructured(false);
    }
  };

  const getCardContent = (note: Note) => {
    return cardStates[note.id]?.content ?? note.content;
  };

  const hasUnsavedChanges = (note: Note) => {
    return cardStates[note.id]?.hasUnsavedChanges ?? false;
  };

  const updateCardContent = (noteId: string, content: string) => {
    setCardStates(prev => ({
      ...prev,
      [noteId]: {
        content,
        hasUnsavedChanges: true
      }
    }));
  };

  const saveCard = (note: Note) => {
    const currentContent = getCardContent(note);
    const updatedNote = { ...note, content: currentContent };
    onSave(updatedNote);
    
    // Clear the local state after saving
    setCardStates(prev => {
      const newState = { ...prev };
      delete newState[note.id];
      return newState;
    });
  };

  // Handle text selection for context menu
  const handleTextSelection = useCallback((noteId: string) => {
    const textarea = textareaRefs.current[noteId];
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    
    if (start !== end) {
      const selected = textarea.value.substring(start, end).trim();
      if (selected.length > 0) {
        setSelectedText(selected);
        setActiveTextareaId(noteId);
      } else {
        setSelectedText("");
        setShowContextMenu(false);
        setActiveTextareaId(null);
      }
    } else {
      setSelectedText("");
      setShowContextMenu(false);
      setActiveTextareaId(null);
    }
  }, []);

  // Handle right-click context menu
  const handleContextMenu = useCallback((event: React.MouseEvent, noteId: string) => {
    // Always prevent default context menu initially
    event.preventDefault();
    
    // Check for selected text at the time of right-click
    const textarea = textareaRefs.current[noteId];
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    
    if (start !== end) {
      const currentSelectedText = textarea.value.substring(start, end).trim();
      
      // Only show our custom context menu if there's selected text
      if (currentSelectedText.length > 0) {
        setSelectedText(currentSelectedText);
        setActiveTextareaId(noteId);
        setContextMenuPosition({ x: event.clientX, y: event.clientY });
        setShowContextMenu(true);
      }
    }
  }, []);

  // Handle defining a term
  const handleDefineTerm = async () => {
    if (!selectedText || isDefiningTerm || !activeTextareaId) return;

    console.log("Starting term definition in flash cards for:", selectedText);

    // Set loading state immediately for instant feedback
    // DON'T hide context menu yet - keep it visible to show loading state
    setIsDefiningTerm(true);

    try {
      // Get context from the active textarea
      const textarea = textareaRefs.current[activeTextareaId];
      const textContent = textarea?.value || "";
      
      let context = "";
      const termIndex = textContent.indexOf(selectedText);
      if (termIndex !== -1) {
        const contextStart = Math.max(0, termIndex - 100);
        const contextEnd = Math.min(textContent.length, termIndex + selectedText.length + 100);
        context = textContent.substring(contextStart, contextEnd);
      }

      console.log("About to call generateTermDefinition with context:", context.substring(0, 50) + "...");

      const definition = await generateTermDefinition(selectedText, context);
      
      console.log("Received definition:", definition);
      
      if (definition && onCreateAtomicNotes) {
        console.log("Creating atomic note with definition in flash cards");
        // Create an atomic note with the definition
        onCreateAtomicNotes([{
          title: definition.title,
          content: definition.content
        }]);
        console.log("Called onCreateAtomicNotes successfully in flash cards");
      } else {
        console.log("Failed to create atomic note in flash cards:", {
          hasDefinition: !!definition,
          hasCallback: !!onCreateAtomicNotes
        });
      }
    } catch (error) {
      console.error("Error defining term in flash cards:", error);
    } finally {
      // Hide context menu and reset state after operation completes
      setShowContextMenu(false);
      setIsDefiningTerm(false);
      setSelectedText("");
      setActiveTextareaId(null);
    }
  };

  // Function to highlight a note by its global number
  const highlightNoteByNumber = useCallback((globalNumber: number) => {
    const note = notes.find(n => n.globalNumber === globalNumber);
    if (note) {
      setHighlightedNoteId(note.id);
      
      // Scroll to the note
      const cardElement = cardRefs.current[note.id];
      if (cardElement) {
        cardElement.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center'
        });
      }
      
      // Clear highlight after 3 seconds
      setTimeout(() => {
        setHighlightedNoteId(null);
      }, 3000);
    }
  }, [notes]);

  // Function to handle note reference clicks
  const handleNoteClick = useCallback((noteReference: string) => {
    // Updated regex to extract number from both AN-X and (AN-X) formats
    const match = noteReference.match(/\(?AN-(\d+)\)?/);
    if (match) {
      const globalNumber = parseInt(match[1]);
      highlightNoteByNumber(globalNumber);
    }
  }, [highlightNoteByNumber]);

  const renderCard = (note: Note) => {
    const content = getCardContent(note);
    const unsaved = hasUnsavedChanges(note);
    const isHighlighted = highlightedNoteId === note.id;

    return (
      <div
        key={note.id}
        className={`bg-card border rounded-2xl p-0 shadow-md hover:shadow-lg transition-all duration-300 w-full max-w-md group hover:scale-[1.02] relative ${
          isHighlighted 
            ? 'border-transparent shadow-lg scale-[1.02]' 
            : 'border-border'
        }`}
        ref={(el) => {
          cardRefs.current[note.id] = el;
        }}
      >
        {/* Rainbow border overlay when highlighted */}
        {isHighlighted && (
          <div 
            className="absolute inset-0 rounded-2xl pointer-events-none"
            style={{
              background: 'linear-gradient(90deg, #ff9999 0%, #ffb366 12.5%, #ffdd66 25%, #99ff99 37.5%, #66b3ff 50%, #b366ff 62.5%, #ff66b3 75%, #66ffdd 87.5%, #66b3ff 100%)',
              backgroundSize: '200% 100%',
              animation: 'rainbow-border 3s ease-in-out infinite',
              padding: '2px',
              zIndex: -1
            }}
          >
            <div className="w-full h-full bg-card rounded-2xl"></div>
          </div>
        )}
        
        {/* Card Header */}
        <div className="px-5 pt-4 pb-3 border-b border-border/30 flex items-center justify-between">
          {/* Back link to source */}
          {note.sourceNoteId && (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground/70 hover:text-foreground hover:bg-accent/50 p-2 h-auto -ml-2 rounded-lg transition-colors min-w-0 max-w-[180px]"
              onClick={() => {
                const sourceNote = allNotes.find(n => n.id === note.sourceNoteId);
                if (sourceNote) {
                  onSelectNote(sourceNote);
                }
              }}
            >
              <ArrowLeft className="h-3 w-3 mr-2 flex-shrink-0" />
              <span className="text-xs font-medium truncate">
                {(() => {
                  const sourceNote = allNotes.find(n => n.id === note.sourceNoteId);
                  if (!sourceNote) return "Source Note";
                  
                  // If source is an atomic note, show its reference number
                  if (sourceNote.isAtomic && sourceNote.globalNumber) {
                    return `AN-${sourceNote.globalNumber}`;
                  }
                  
                  // Otherwise show the title for regular notes
                  return sourceNote.title || "Source Note";
                })()}
              </span>
            </Button>
          )}
          
          {/* Spacer to push close button to the right */}
          <div className="flex-1"></div>
          
          {/* Close button */}
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 p-1.5 h-auto rounded-lg transition-colors flex-shrink-0"
            onClick={() => onCloseCard(note.id)}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Card Content */}
        <div className="p-5">
          <textarea
            ref={(el) => {
              textareaRefs.current[note.id] = el;
            }}
            value={content}
            onChange={(e) => updateCardContent(note.id, e.target.value)}
            onSelect={() => handleTextSelection(note.id)}
            onContextMenu={(e) => handleContextMenu(e, note.id)}
            placeholder="Write your atomic note here..."
            className="w-full h-48 resize-none border-none focus:ring-0 focus:outline-none p-0 bg-transparent text-sm leading-relaxed shadow-none rounded-none outline-none overflow-y-auto placeholder:text-muted-foreground/40 selection:bg-primary/20 break-words overflow-wrap-anywhere"
            style={{
              fontFamily: "inherit",
              fontSize: "14px",
              lineHeight: "1.6em",
              wordWrap: "break-word",
              overflowWrap: "anywhere",
            }}
          />
        </div>

        {/* Card Footer */}
        <div className="px-5 pb-4 pt-3 border-t border-border/30 bg-muted/20 rounded-b-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground/80 font-medium">
                {new Date(note.createdAt).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric'
                })}
              </span>
              {/* Atomic note reference number */}
              {note.isAtomic && note.globalNumber && (
                <>
                  <span className="text-xs text-muted-foreground/60">•</span>
                  <span className="text-xs font-semibold text-muted-foreground/80">
                    #AN-{note.globalNumber}
                  </span>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unsaved && (
                <Button
                  size="sm"
                  onClick={() => saveCard(note)}
                  className="h-7 px-3 text-xs font-medium bg-primary/90 hover:bg-primary shadow-sm"
                >
                  Save
                </Button>
              )}
              {!unsaved && (
                <div className="flex items-center gap-1 text-muted-foreground/60">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                  <span className="text-xs">Saved</span>
                </div>
              )}
              
              {/* Delete button in lower right */}
              {onDeleteNote && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 p-1.5 h-7 w-7 rounded-lg transition-colors"
                  onClick={() => onDeleteNote(note.id)}
                  title="Delete this atomic note"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (notes.length === 0 && !searchAnswer) {
    return null;
  }

  return (
    <div className="min-h-full p-4 sm:p-6">
      {/* Search Answer Display */}
      {searchAnswer && (
        <SearchAnswerDisplay
          answer={searchAnswer}
          question={searchQuestion}
          noteCount={notes.length}
          onNoteClick={handleNoteClick}
          onRefresh={onRefreshAnswer}
          isRefreshing={isRefreshingAnswer}
          onClose={onCloseAnswer}
        />
      )}
      
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <Layers className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold text-foreground">
              {searchAnswer ? "Source Notes" : "Flash Card View"}
            </h2>
            <span className="px-2.5 py-1 bg-primary/10 text-primary text-xs font-semibold rounded-full">
              {notes.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* Add Notes Button */}
            {onCreateAtomicNotes && (
              <div className="relative">
                <Button
                  onClick={() => setShowAddNotes(!showAddNotes)}
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-xs"
                  ref={addButtonRef}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Note
                </Button>
                
                {/* Search Popover */}
                {showAddNotes && (
                  <div 
                    ref={popoverRef}
                    className="absolute top-full right-0 mt-2 w-[500px] border border-border rounded-lg p-4 bg-background shadow-xl z-50"
                    style={{
                      maxHeight: 'calc(100vh - 150px)',
                    }}
                  >
                    <h4 className="text-sm font-medium text-foreground mb-3">
                      Add Atomic Note to Flash Cards
                    </h4>
                    
                    {/* Search Bar */}
                    <div className="relative mb-3">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Search by content or reference number (e.g. AN-1)..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                        autoFocus
                      />
                    </div>
                    
                    {/* Search Results */}
                    <ScrollArea className="h-60">
                      <div className="space-y-2">
                        {searchResults.length > 0 ? (
                          <>
                            {searchQuery.trim() && (
                              <div className="text-xs text-muted-foreground mb-2 px-1">
                                {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} found
                              </div>
                            )}
                            {searchResults.map(note => (
                              <button
                                key={note.id}
                                onClick={() => addAtomicNoteToCards(note)}
                                className="w-full text-left p-3 text-sm text-foreground bg-background hover:bg-accent rounded-md transition-colors border border-transparent hover:border-border"
                              >
                                <div className="line-clamp-2 break-words leading-relaxed">
                                  {getPreviewText(note.content)}
                                </div>
                                {note.globalNumber && (
                                  <div className="text-xs text-muted-foreground mt-2 font-medium">
                                    AN-{note.globalNumber}
                                  </div>
                                )}
                              </button>
                            ))}
                          </>
                        ) : (
                          <div className="text-sm text-muted-foreground text-center py-8">
                            {searchQuery.trim() ? (
                              <>
                                <div className="mb-2">No notes found matching &quot;{searchQuery}&quot;</div>
                                <div className="text-xs">Try searching by content or reference number (e.g. AN-1)</div>
                              </>
                            ) : availableAtomicNotes.length === 0 ? (
                              <>
                                <div className="mb-2">All atomic notes are already in view</div>
                                <div className="text-xs">Create more atomic notes to add them here</div>
                              </>
                            ) : (
                              <>
                                <div className="mb-2">No atomic notes available</div>
                                <div className="text-xs">Create some atomic notes first to add them to flash cards</div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                )}
              </div>
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                notes.forEach(note => onCloseCard(note.id));
              }}
              className="text-xs font-medium"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Clear Cards
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground/80 ml-6">
          {searchAnswer 
            ? "These are the atomic notes that informed the answer above" 
            : (onCreateTopic || onCreateStructuredNote) 
              ? "Create hub notes or structure notes from all notes in this view" 
              : "Click and edit multiple notes simultaneously"
          }
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 pb-20">
        {notes.map(note => renderCard(note))}
      </div>

      {/* Floating Create Buttons */}
      {(onCreateTopic || onCreateStructuredNote) && (
        <div className="fixed bottom-6 right-6 z-50 flex gap-3">
          {onCreateTopic && (
            <div className="relative">
              <Button
                onClick={() => setShowHubDropdown(!showHubDropdown)}
                size="sm"
                className="font-medium shadow-lg hover:shadow-xl transition-shadow pr-2"
                disabled={notes.length < 1 || isCreatingTopic || isCreatingStructured}
                title={notes.length < 1 ? "Need at least 1 note to create a cluster" : "Cluster these notes into a topic"}
                ref={hubDropdownRef}
              >
                {isCreatingTopic ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Cluster notes ({notes.length})
                    <ChevronDown className="h-3 w-3 ml-1" />
                  </>
                )}
              </Button>
              
              {/* Hub Options Dropdown */}
              {showHubDropdown && !isCreatingTopic && !isCreatingStructured && (
                <div 
                  ref={hubPopoverRef}
                  className="absolute bottom-full right-0 mb-2 w-[320px] max-h-[400px] border border-border rounded-lg bg-background shadow-xl z-50 overflow-hidden"
                  style={{
                    maxHeight: 'calc(100vh - 120px)', // Ensure it fits in viewport
                  }}
                >
                  <div className="p-3 border-b border-border/30">
                    <h4 className="text-sm font-medium text-foreground">
                      Cluster Options
                    </h4>
                  </div>
                  
                  <div className="flex flex-col max-h-full">
                    {/* Create New Hub - Fixed at top */}
                    <div className="p-3 border-b border-border/20">
                      <button
                        onClick={handleCreateTopic}
                        className="w-full text-left p-3 text-sm text-foreground bg-background hover:bg-accent rounded-md transition-colors border border-border/30 hover:border-border"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Plus className="h-4 w-4" />
                          <span className="font-medium">Create New Cluster</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Generate a new topic cluster from all {notes.length} cards
                        </div>
                      </button>
                    </div>
                    
                    {/* Scrollable section for existing clusters */}
                    <div className="flex-1 overflow-hidden">
                      {existingHubNotes && existingHubNotes.length > 0 ? (
                        <>
                          <div className="px-3 pt-3 pb-2">
                            <div className="text-xs font-medium text-muted-foreground">
                              Add to Existing Cluster
                            </div>
                          </div>
                          <ScrollArea className="flex-1 max-h-[240px]">
                            <div className="px-3 pb-3 space-y-1">
                              {existingHubNotes.map(hubNote => (
                                <button
                                  key={hubNote.id}
                                  onClick={() => handleAddToExistingHub(hubNote)}
                                  className="w-full text-left p-3 text-sm text-foreground hover:bg-accent rounded-md transition-colors border border-transparent hover:border-border/30"
                                >
                                  <div className="font-medium text-xs mb-1 line-clamp-1">
                                    {hubNote.title || "Untitled Cluster"}
                                  </div>
                                  <div className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                    {hubNote.content?.substring(0, 60) + (hubNote.content && hubNote.content.length > 60 ? "..." : "")}
                                  </div>
                                  {hubNote.linkedAtomicNoteIds && (
                                    <div className="text-xs text-muted-foreground/70 mt-1">
                                      {hubNote.linkedAtomicNoteIds.length} linked notes
                                    </div>
                                  )}
                                </button>
                              ))}
                            </div>
                          </ScrollArea>
                        </>
                      ) : (
                        <div className="p-4 text-center">
                          <div className="text-xs text-muted-foreground">
                            No existing clusters. Create your first one above.
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {onCreateStructuredNote && (
            <div className="relative">
              <Button
                onClick={() => setShowStructureDropdown(!showStructureDropdown)}
                size="sm"
                variant="default"
                className="font-medium shadow-lg hover:shadow-xl transition-shadow pr-2"
                disabled={notes.length === 0 || isCreatingTopic || isCreatingStructured}
                title={notes.length === 0 ? "Need at least 1 note to expand topic" : "Expand these notes into a structure note"}
                ref={structureDropdownRef}
              >
                {isCreatingStructured ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2" />
                    Creating...
                  </>
                ) : (
                  <>
                    <BookOpen className="h-4 w-4 mr-2" />
                    Expand this Topic ({notes.length})
                    <ChevronDown className="h-3 w-3 ml-1" />
                  </>
                )}
              </Button>
              
              {/* Structure Note Options Dropdown */}
              {showStructureDropdown && !isCreatingTopic && !isCreatingStructured && (
                <div 
                  ref={structurePopoverRef}
                  className="absolute bottom-full right-0 mb-2 w-[320px] max-h-[400px] border border-border rounded-lg bg-background shadow-xl z-50 overflow-hidden"
                  style={{
                    maxHeight: 'calc(100vh - 120px)', // Ensure it fits in viewport
                  }}
                >
                  <div className="p-3 border-b border-border/30">
                    <h4 className="text-sm font-medium text-foreground">
                      Structure Options
                    </h4>
                  </div>
                  
                  <div className="flex flex-col max-h-full">
                    {/* Create New Structure Note - Fixed at top */}
                    <div className="p-3 border-b border-border/20">
                      <button
                        onClick={handleCreateStructuredNote}
                        className="w-full text-left p-3 text-sm text-foreground bg-background hover:bg-accent rounded-md transition-colors border border-border/30 hover:border-border"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Plus className="h-4 w-4" />
                          <span className="font-medium">Create New Structure Note</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Generate a new structure note from all {notes.length} cards
                        </div>
                      </button>
                    </div>
                    
                    {/* Scrollable section for existing structure notes */}
                    <div className="flex-1 overflow-hidden">
                      {existingStructuredNotes && existingStructuredNotes.length > 0 ? (
                        <>
                          <div className="px-3 pt-3 pb-2">
                            <div className="text-xs font-medium text-muted-foreground">
                              Add to Existing Structure Note
                            </div>
                          </div>
                          <ScrollArea className="flex-1 max-h-[240px]">
                            <div className="px-3 pb-3 space-y-1">
                              {existingStructuredNotes.map(structuredNote => (
                                <button
                                  key={structuredNote.id}
                                  onClick={() => handleAddToExistingStructuredNote(structuredNote)}
                                  className="w-full text-left p-3 text-sm text-foreground hover:bg-accent rounded-md transition-colors border border-transparent hover:border-border/30"
                                >
                                  <div className="font-medium text-xs mb-1 line-clamp-1">
                                    {structuredNote.title || "Untitled Structure Note"}
                                  </div>
                                  <div className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                    {structuredNote.content?.substring(0, 60) + (structuredNote.content && structuredNote.content.length > 60 ? "..." : "")}
                                  </div>
                                  {structuredNote.linkedAtomicNoteIds && (
                                    <div className="text-xs text-muted-foreground/70 mt-1">
                                      {structuredNote.linkedAtomicNoteIds.length} linked notes
                                    </div>
                                  )}
                                </button>
                              ))}
                            </div>
                          </ScrollArea>
                        </>
                      ) : (
                        <div className="p-4 text-center">
                          <div className="text-xs text-muted-foreground">
                            No existing structure notes. Create your first one above.
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Context Menu for defining terms */}
      {showContextMenu && selectedText && (
        <div
          ref={contextMenuRef}
          className="fixed z-50 bg-background border border-border rounded-lg shadow-xl py-1 min-w-48"
          style={{
            left: contextMenuPosition.x,
            top: contextMenuPosition.y,
          }}
        >
          <Button
            variant="ghost"
            size="sm"
            className={`w-full justify-start px-3 py-2 h-auto text-sm font-normal hover:bg-accent transition-all duration-200 ${
              isDefiningTerm ? 'bg-accent/50 cursor-not-allowed' : ''
            }`}
            onClick={handleDefineTerm}
            disabled={isDefiningTerm}
          >
            {isDefiningTerm ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full mr-2 flex-shrink-0" />
                <span className="text-primary font-medium">Defining...</span>
              </>
            ) : (
              <>
                <BookOpen className="h-4 w-4 mr-2 flex-shrink-0" />
                <span>Define &quot;{selectedText.length > 20 ? selectedText.substring(0, 20) + "..." : selectedText}&quot;</span>
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
} 