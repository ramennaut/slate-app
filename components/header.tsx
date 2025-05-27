import { Plus } from "lucide-react";
import { Button } from "./ui/button";

interface HeaderProps {
  onNewNote: () => void;
}
export default function Header({ onNewNote }: HeaderProps) {
  return (
    <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm flex-shrink-0 sticky top-0 z-10">
      <div className="flex justify-between items-center px-6 py-4">
        <div className="flex items-center space-x-4">
          <div className="w-8 h-8 bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl flex items-center justify-center shadow-sm">
            <div className="flex items-center">
              <div className="w-2.5 h-2.5 border-2 border-white transform rotate-45 -mr-1"></div>
              <div className="w-2.5 h-2.5 border-2 border-white transform rotate-45"></div>
            </div>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Slate
          </h1>
        </div>
        <Button onClick={onNewNote} size="default" className="font-medium shadow-sm">
          <Plus className="h-4 w-4 mr-2" /> 
          New Thought
        </Button>
      </div>
    </header>
  );
}
