import { Button } from "./ui/button";
import { Plus, Menu, Search, X, MessageCircle } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Note } from "@/lib/types";

interface HeaderProps {
  createNewNote: () => void;
  toggleSidebar: () => void;
  isMobile: boolean;
  notes?: Note[];
  onQuestionSubmit?: (question: string) => Promise<{ answer: string; sourcedNotes: Note[] } | null>;
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
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Handle search submission - automatically open flash cards
  const handleSearch = async () => {
    if (!question.trim() || !onQuestionSubmit || isSearching) return;
    
    setIsSearching(true);
    try {
      const result = await onQuestionSubmit(question.trim());
      if (result && result.sourcedNotes.length > 0 && onViewSourcesAsCards) {
        // Automatically open flash cards with the answer
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

  // Handle Enter key in search input
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  };

  // Close search when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearch(false);
      }
    };

    if (showSearch) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showSearch]);

  // Focus input when search opens
  useEffect(() => {
    if (showSearch && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showSearch]);

  const atomicNotesCount = notes?.filter(note => note.isAtomic).length || 0;

  return (
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
                  onClick={() => setShowSearch(!showSearch)}
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
            
            {/* Desktop Search Bar */}
            <div className="flex items-center gap-3">
              {onQuestionSubmit && atomicNotesCount > 0 && (
                <div className="relative" ref={searchRef}>
                  <Button
                    onClick={() => setShowSearch(!showSearch)}
                    size="sm"
                    variant="outline"
                    className="flex items-center gap-2 text-xs px-3 py-2 h-auto"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    Ask about your notes
                  </Button>
                  
                  {/* Search Dropdown */}
                  {showSearch && (
                    <div className="absolute top-full right-0 mt-2 w-[500px] border border-border rounded-lg p-4 bg-background shadow-xl z-50">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-medium text-foreground">Ask about your atomic notes</h4>
                          <Button
                            onClick={() => {
                              setShowSearch(false);
                              setQuestion("");
                            }}
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                        
                        <div className="flex gap-2">
                          <div className="flex-1 relative">
                            <input
                              ref={inputRef}
                              type="text"
                              placeholder="What would you like to know about your notes?"
                              value={question}
                              onChange={(e) => setQuestion(e.target.value)}
                              onKeyPress={handleKeyPress}
                              className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                              disabled={isSearching}
                            />
                          </div>
                          <Button
                            onClick={handleSearch}
                            disabled={!question.trim() || isSearching}
                            size="sm"
                            className="px-3"
                          >
                            {isSearching ? (
                              <div className="animate-spin h-3 w-3 border-2 border-current border-t-transparent rounded-full" />
                            ) : (
                              <Search className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
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
      
      {/* Mobile Search Dropdown */}
      {isMobile && showSearch && (
        <div className="border-t border-border bg-background p-4" ref={searchRef}>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-foreground">Ask about your notes</h4>
              <Button
                onClick={() => {
                  setShowSearch(false);
                  setQuestion("");
                }}
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
            
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="What would you like to know?"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                  disabled={isSearching}
                />
              </div>
              <Button
                onClick={handleSearch}
                disabled={!question.trim() || isSearching}
                size="sm"
                className="px-3"
              >
                {isSearching ? (
                  <div className="animate-spin h-3 w-3 border-2 border-current border-t-transparent rounded-full" />
                ) : (
                  <Search className="h-3 w-3" />
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
