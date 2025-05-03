
import React from 'react';
import { useFileUpload, UploadedFile } from '@/hooks/useFileUpload';
import { Button } from './button';
import { X, Upload, File, Image } from 'lucide-react';

interface FileUploadProps {
  onChange?: (files: UploadedFile[]) => void;
  maxFiles?: number;
  maxSize?: number;
  accept?: Record<string, string[]>;
  className?: string;
}

export function FileUpload({
  onChange,
  maxFiles = 5,
  maxSize = 5 * 1024 * 1024,
  accept = {
    'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.svg', '.webp'],
  },
  className = '',
}: FileUploadProps) {
  const {
    files,
    getRootProps,
    getInputProps,
    isDragActive,
    removeFile,
  } = useFileUpload({
    maxFiles,
    maxSize,
    acceptedFileTypes: accept,
  });

  React.useEffect(() => {
    if (onChange) onChange(files);
  }, [files, onChange]);

  return (
    <div className={`space-y-4 ${className}`}>
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
          ${isDragActive ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary/50'}`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center space-y-2">
          <Upload className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm font-medium">
            {isDragActive ? (
              "Drop the files here..."
            ) : (
              "Drag & drop files here, or click to select files"
            )}
          </p>
          <p className="text-xs text-muted-foreground">
            Max {maxFiles} file{maxFiles > 1 ? 's' : ''}, up to {Math.round(maxSize / 1024 / 1024)}MB each
          </p>
        </div>
      </div>

      {files.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {files.map((file) => (
            <div key={file.id} className="relative group">
              <div className="w-full aspect-square rounded-md overflow-hidden border bg-background">
                {file.type.startsWith('image/') ? (
                  <img
                    src={file.preview}
                    alt={file.name}
                    className="h-full w-full object-cover"
                    onLoad={() => {
                      // Revoke the data uri after image has loaded to save memory
                      URL.revokeObjectURL(file.preview);
                    }}
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center">
                    <File className="h-10 w-10 text-muted-foreground" />
                  </div>
                )}
              </div>
              
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute -top-2 -right-2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => removeFile(file.id)}
              >
                <X className="h-3 w-3" />
              </Button>
              
              <p className="mt-1 text-xs truncate">{file.name}</p>
              <p className="text-xs text-muted-foreground">
                {(file.size / 1024).toFixed(1)} KB
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
