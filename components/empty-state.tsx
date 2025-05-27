import { Plus } from "lucide-react";
import { Button } from "./ui/button";

interface EmptyStateProps {
  message: string;
  buttonText: string;
  onButtonClick?: () => void;
}
export default function EmptyState({
  message,
  buttonText,
  onButtonClick,
}: EmptyStateProps) {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center p-12 max-w-md">
        <div className="mb-6">
          <div className="w-16 h-16 bg-muted/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Plus className="h-8 w-8 text-muted-foreground/50" />
          </div>
        </div>
        <h3 className="text-xl font-semibold text-foreground mb-3">
          {message}
        </h3>
        <p className="text-muted-foreground mb-6 leading-relaxed">
          Start capturing your thoughts and ideas in beautifully organized notes.
        </p>
        <Button onClick={onButtonClick} size="lg" className="font-medium">
          <Plus className="h-4 w-4 mr-2" />
          {buttonText}
        </Button>
      </div>
    </div>
  );
}
