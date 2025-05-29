"use client";

import { useState, useRef } from "react";
import { Button } from "./ui/button";
import { Eye, Edit } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  className?: string;
}

export default function MarkdownEditor({
  value,
  onChange,
  onKeyDown,
  placeholder = "Write your markdown here...",
  className = ""
}: MarkdownEditorProps) {
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Toolbar moved up - no header section */}
      <div className="flex items-center justify-end gap-1 mb-4">
        <Button
          variant={viewMode === 'edit' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setViewMode('edit')}
          className="h-7 px-2 text-xs"
        >
          <Edit className="h-3 w-3 mr-1" />
          Edit
        </Button>
        <Button
          variant={viewMode === 'preview' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setViewMode('preview')}
          className="h-7 px-2 text-xs"
        >
          <Eye className="h-3 w-3 mr-1" />
          Preview
        </Button>
      </div>

      {/* Editor/Preview Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Edit Mode */}
        {viewMode === 'edit' && (
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            className="flex-1 resize-none border-none focus:ring-0 focus:outline-none p-0 bg-transparent text-base leading-relaxed shadow-none rounded-none outline-none min-h-0 w-full overflow-y-auto"
            style={{
              fontFamily: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif",
              fontSize: "16px",
              lineHeight: "1.6em",
            }}
          />
        )}

        {/* Preview Mode */}
        {viewMode === 'preview' && (
          <div className="flex-1 overflow-y-auto">
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({ children }) => <h1 className="text-2xl font-bold mb-6 text-foreground">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-xl font-semibold mb-4 text-foreground">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-lg font-medium mb-3 text-foreground">{children}</h3>,
                  p: ({ children }) => <p className="mb-4 text-foreground leading-relaxed">{children}</p>,
                  ul: ({ children }) => <ul className="mb-4 pl-6 space-y-2">{children}</ul>,
                  ol: ({ children }) => <ol className="mb-4 pl-6 space-y-2">{children}</ol>,
                  li: ({ children }) => <li className="text-foreground">{children}</li>,
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-4 border-primary/30 pl-6 italic text-muted-foreground mb-4 py-2">
                      {children}
                    </blockquote>
                  ),
                  code: ({ children }) => (
                    <code className="bg-muted px-2 py-1 rounded text-sm font-mono">{children}</code>
                  ),
                  pre: ({ children }) => (
                    <pre className="bg-muted p-4 rounded-lg overflow-x-auto mb-4">{children}</pre>
                  ),
                }}
              >
                {value || '*Start writing to see preview...*'}
              </ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 