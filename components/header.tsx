import { Plus, FileText } from "lucide-react";
import { Button } from "./ui/button";

interface HeaderProps {
  onNewNote: () => void;
}
export default function Header({ onNewNote }: HeaderProps) {
  return (
    <header className="border-b p-4 bg-card flex-shrink-0">
      <div className="flex justify-between items-center px-2">
        <div className="flex items-center space-x-3">
          <div className="w-7 h-7 bg-slate-800 rounded-lg flex items-center justify-center">
            <div className="flex items-center">
              <div className="w-2 h-2 border border-white transform rotate-45 -mr-1"></div>
              <div className="w-2 h-2 border border-white transform rotate-45"></div>
            </div>
          </div>
          <h1 className="text-2xl font-light tracking-wide" style={{ fontFamily: 'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif' }}>
            Slate
          </h1>
        </div>
        <Button onClick={onNewNote} size="sm" className="cursor-pointer">
          <Plus className="h-4 w-4 mr-2" /> New Thought
        </Button>
      </div>
    </header>
  );
}
