import { Button } from "./ui/button";
import { Plus, PanelLeftClose, Menu } from "lucide-react";

interface HeaderProps {
  createNewNote: () => void;
  toggleSidebar: () => void;
  isMobile: boolean;
  isSidebarCollapsed: boolean;
}

export default function Header({
  createNewNote,
  toggleSidebar,
  isMobile,
  isSidebarCollapsed,
}: HeaderProps) {
  return (
    <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm flex-shrink-0 sticky top-0 z-10">
      <div className="flex justify-between items-center px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center space-x-2 sm:space-x-4">
          {isMobile && (
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              className="mr-1 sm:mr-0 h-8 w-8 sm:h-9 sm:w-9"
            >
              {isSidebarCollapsed ? (
                <Menu className="h-5 w-5" />
              ) : (
                <PanelLeftClose className="h-5 w-5" />
              )}
            </Button>
          )}
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
        <Button
          onClick={createNewNote}
          size="sm"
          className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm px-2.5 py-1.5 sm:px-3 sm:py-2 h-auto"
        >
          <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          New Thought
        </Button>
      </div>
    </header>
  );
}
