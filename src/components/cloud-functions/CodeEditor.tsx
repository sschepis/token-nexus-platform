import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  Copy, 
  Download, 
  Upload, 
  Maximize2, 
  Minimize2, 
  RotateCcw,
  CheckCircle,
  AlertCircle,
  Info
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: 'javascript' | 'typescript';
  placeholder?: string;
  className?: string;
  readOnly?: boolean;
  showLineNumbers?: boolean;
  maxHeight?: string;
  onValidate?: (code: string) => { isValid: boolean; errors: string[]; warnings: string[] };
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

const CodeEditor: React.FC<CodeEditorProps> = ({
  value,
  onChange,
  language = 'javascript',
  placeholder = 'Enter your code here...',
  className,
  readOnly = false,
  showLineNumbers = true,
  maxHeight = '500px',
  onValidate
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [validation, setValidation] = useState<ValidationResult>({ isValid: true, errors: [], warnings: [] });
  const [lineCount, setLineCount] = useState(1);

  // Calculate line numbers
  useEffect(() => {
    const lines = value.split('\n').length;
    setLineCount(lines);
  }, [value]);

  // Validate code when it changes
  useEffect(() => {
    if (onValidate && value.trim()) {
      const result = onValidate(value);
      setValidation(result);
    } else {
      setValidation({ isValid: true, errors: [], warnings: [] });
    }
  }, [value, onValidate]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newValue = value.substring(0, start) + '  ' + value.substring(end);
      onChange(newValue);
      
      // Set cursor position after the inserted spaces
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      }, 0);
    }
    
    // Auto-indent on Enter
    if (e.key === 'Enter') {
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const lines = value.substring(0, start).split('\n');
      const currentLine = lines[lines.length - 1];
      const indent = currentLine.match(/^(\s*)/)?.[1] || '';
      
      // Add extra indent for opening braces
      const extraIndent = currentLine.trim().endsWith('{') ? '  ' : '';
      
      setTimeout(() => {
        const newValue = value.substring(0, start) + '\n' + indent + extraIndent + value.substring(start);
        onChange(newValue);
        textarea.selectionStart = textarea.selectionEnd = start + 1 + indent.length + extraIndent.length;
      }, 0);
    }
  }, [value, onChange]);

  const copyToClipboard = useCallback(() => {
    navigator.clipboard.writeText(value);
    toast.success('Code copied to clipboard');
  }, [value]);

  const downloadCode = useCallback(() => {
    const blob = new Blob([value], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `function.${language}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Code downloaded');
  }, [value, language]);

  const uploadCode = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.js,.ts,.txt';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result as string;
          onChange(content);
          toast.success('Code uploaded successfully');
        };
        reader.readAsText(file);
      }
    };
    input.click();
  }, [onChange]);

  const resetCode = useCallback(() => {
    onChange('');
    toast.info('Code cleared');
  }, [onChange]);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(!isFullscreen);
  }, [isFullscreen]);

  const getValidationIcon = () => {
    if (validation.errors.length > 0) {
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
    if (validation.warnings.length > 0) {
      return <Info className="h-4 w-4 text-yellow-500" />;
    }
    if (value.trim() && validation.isValid) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    return null;
  };

  const editorContent = (
    <div className="relative">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline">{language}</Badge>
          {getValidationIcon()}
          {validation.errors.length > 0 && (
            <Badge variant="destructive">{validation.errors.length} error(s)</Badge>
          )}
          {validation.warnings.length > 0 && (
            <Badge variant="secondary">{validation.warnings.length} warning(s)</Badge>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={copyToClipboard}
            disabled={!value.trim()}
          >
            <Copy className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={downloadCode}
            disabled={!value.trim()}
          >
            <Download className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={uploadCode}
          >
            <Upload className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={resetCode}
            disabled={!value.trim()}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleFullscreen}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <div className="relative border rounded-md overflow-hidden">
        {showLineNumbers && (
          <div className="absolute left-0 top-0 bottom-0 w-12 bg-muted border-r flex flex-col text-xs text-muted-foreground font-mono">
            {Array.from({ length: lineCount }, (_, i) => (
              <div key={i + 1} className="px-2 py-0.5 text-right leading-6">
                {i + 1}
              </div>
            ))}
          </div>
        )}
        
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          readOnly={readOnly}
          className={cn(
            'font-mono text-sm resize-none border-0 focus-visible:ring-0',
            showLineNumbers && 'pl-14',
            className
          )}
          style={{
            minHeight: '300px',
            maxHeight: isFullscreen ? '80vh' : maxHeight,
            lineHeight: '1.5'
          }}
        />
      </div>

      {/* Validation Messages */}
      {(validation.errors.length > 0 || validation.warnings.length > 0) && (
        <div className="mt-2 space-y-1">
          {validation.errors.map((error, index) => (
            <div key={`error-${index}`} className="flex items-center gap-2 text-sm text-red-600">
              <AlertCircle className="h-3 w-3" />
              {error}
            </div>
          ))}
          {validation.warnings.map((warning, index) => (
            <div key={`warning-${index}`} className="flex items-center gap-2 text-sm text-yellow-600">
              <Info className="h-3 w-3" />
              {warning}
            </div>
          ))}
        </div>
      )}

      {/* Status Bar */}
      <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
        <div>
          Lines: {lineCount} | Characters: {value.length}
        </div>
        <div>
          {language.toUpperCase()}
        </div>
      </div>
    </div>
  );

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-background p-4">
        <Card className="h-full">
          <CardHeader>
            <CardTitle>Code Editor - Fullscreen</CardTitle>
          </CardHeader>
          <CardContent className="h-full overflow-auto">
            {editorContent}
          </CardContent>
        </Card>
      </div>
    );
  }

  return editorContent;
};

export default CodeEditor;