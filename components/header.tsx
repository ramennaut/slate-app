import { Button } from "./ui/button";
import { Plus, Menu, Search, X, MessageCircle } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Note } from "@/lib/types";

interface HeaderProps {
  createNewNote: () => void;
  toggleSidebar: () => void;
  isMobile: boolean;
  notes?: Note[];
  onQuestionSubmit?: (question: string) => Promise<{ answer: string; sourcedNotes: Note[] }>;
  onViewSourcesAsCards?: (notes: Note[], answer: string, question: string) => void;
}

export default function Header({
  createNewNote,
  toggleSidebar,
  isMobile,
  notes,
  onQuestionSubmit,
  onViewSourcesAsCards,
}: HeaderProps) {
  const [showSearch, setShowSearch] = useState(false);
  const [question, setQuestion] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Handle Enter key in search input
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    } else if (e.key === 'Escape') {
      setShowSearch(false);
      setQuestion("");
    }
  };

  // Handle search submission - automatically open flash cards
  const handleSearch = async () => {
    if (!question.trim() || !onQuestionSubmit || isSearching) return;
    
    setIsSearching(true);
    try {
      const result = await onQuestionSubmit(question.trim());
      if (onViewSourcesAsCards) {
        // Show results whether there are sourced notes or not
        // This ensures users see "can't find relevant notes" messages too
        onViewSourcesAsCards(result.sourcedNotes, result.answer, question.trim());
        // Clear and close search interface
        setQuestion("");
        setShowSearch(false);
      }
    } catch (error) {
      console.error("Error during search:", error);
    } finally {
      setIsSearching(false);
    }
  };

  // Handle backdrop click to close
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setShowSearch(false);
      setQuestion("");
    }
  };

  const atomicNotesCount = notes?.filter(note => note.isAtomic).length || 0;

  // Focus input when search opens
  useEffect(() => {
    if (showSearch && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showSearch]);

  // Global keyboard shortcut (Cmd+K or Ctrl+K)
  useEffect(() => {
    const handleGlobalKeydown = (e: KeyboardEvent) => {
      // Check for Cmd+K (Mac) or Ctrl+K (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        // Only if we have atomic notes and search is available
        if (onQuestionSubmit && atomicNotesCount > 0) {
          e.preventDefault();
          setShowSearch(true);
        }
      }
    };

    document.addEventListener('keydown', handleGlobalKeydown);
    return () => document.removeEventListener('keydown', handleGlobalKeydown);
  }, [onQuestionSubmit, atomicNotesCount]);

  return (
    <>
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm flex-shrink-0 sticky top-0 z-10">
        <div className="flex justify-between items-center px-4 sm:px-6 py-3 sm:py-4">
          {isMobile ? (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleSidebar}
                className="h-8 w-8"
              >
                <Menu className="h-5 w-5" />
              </Button>
              <div className="flex-1 flex justify-center items-center space-x-2">
                <div className="w-7 h-7 bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg flex items-center justify-center shadow-sm">
                  <div className="flex items-center">
                    <div className="w-2 h-2 border-2 border-white transform rotate-45 -mr-0.5"></div>
                    <div className="w-2 h-2 border-2 border-white transform rotate-45"></div>
                  </div>
                </div>
                <h1 className="text-xl font-semibold tracking-tight text-foreground">
                  Slate
                </h1>
              </div>
              <div className="flex items-center gap-1">
                {onQuestionSubmit && atomicNotesCount > 0 && (
                  <Button
                    onClick={() => setShowSearch(true)}
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    title="Ask a question about your notes"
                  >
                    <MessageCircle className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  onClick={createNewNote}
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                >
                  <Plus className="h-5 w-5" />
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center space-x-2 sm:space-x-4">
                <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg sm:rounded-xl flex items-center justify-center shadow-sm">
                  <div className="flex items-center">
                    <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 border-2 border-white transform rotate-45 -mr-0.5 sm:-mr-1"></div>
                    <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 border-2 border-white transform rotate-45"></div>
                  </div>
                </div>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-semibold tracking-tight text-foreground">
                  Slate
                </h1>
              </div>
              
              <div className="flex items-center gap-3">
                {onQuestionSubmit && atomicNotesCount > 0 && (
                  <Button
                    onClick={() => setShowSearch(true)}
                    size="sm"
                    variant="outline"
                    className="flex items-center gap-2 text-xs px-3 py-2 h-auto"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    Ask about your notes
                  </Button>
                )}
                
                <Button
                  onClick={createNewNote}
                  size="sm"
                  className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm px-2.5 py-1.5 sm:px-3 sm:py-2 h-auto"
                >
                  <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  New Thought
                </Button>
              </div>
            </>
          )}
        </div>
      </header>

      {/* Centered Search Modal - Spotlight Style */}
      {showSearch && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-start justify-center pt-[15vh]"
          onClick={handleBackdropClick}
        >
          <div className="bg-background border border-border rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden">
            <div className="flex items-center p-4 border-b border-border/50">
              <Search className="h-5 w-5 text-muted-foreground mr-3 flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Ask about your atomic notes..."
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={handleKeyPress}
                className="flex-1 text-lg bg-transparent border-none outline-none placeholder:text-muted-foreground"
                disabled={isSearching}
              />
              <div className="flex items-center gap-2 ml-3">
                {isSearching && (
                  <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
                )}
                <Button
                  onClick={() => {
                    setShowSearch(false);
                    setQuestion("");
                  }}
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 rounded-full"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="p-4 bg-muted/30">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <div className="flex items-center gap-4">
                  <span>↵ Search</span>
                  <span>Esc to close</span>
                </div>
                <span>{atomicNotesCount} atomic notes available</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
