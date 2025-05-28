import { Plus, Lightbulb, LucideIcon } from "lucide-react";
import { Button } from "./ui/button";

interface EmptyStateProps {
  message: string;
  buttonText?: string;
  description?: string;
  icon?: LucideIcon;
  onButtonClick?: () => void;
}

export default function EmptyState({
  message,
  buttonText,
  description = "Start capturing your thoughts and ideas in beautifully organized notes.",
  icon: IconComponent = Lightbulb,
  onButtonClick,
}: EmptyStateProps) {
  return (
    <div className="flex items-center justify-center h-full min-h-[300px]">
      <div className="text-center p-6 max-w-xs">
        <div className="mb-6">
          <div className="w-12 h-12 bg-sidebar-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4 border border-sidebar-primary/20">
            <IconComponent className="h-6 w-6 text-sidebar-primary/60" />
          </div>
        </div>
        <h3 className="text-lg font-medium text-sidebar-foreground mb-2">
          {message}
        </h3>
        <p className="text-sm text-sidebar-foreground/60 mb-6 leading-relaxed">
          {description}
        </p>
        {buttonText && (
          <Button 
            onClick={onButtonClick} 
            size="sm" 
            className="font-medium shadow-sm w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            {buttonText}
          </Button>
        )}
      </div>
    </div>
  );
}
