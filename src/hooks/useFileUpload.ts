
import { useCallback, useState } from 'react';
import { useDropzone, FileRejection, DropzoneOptions } from 'react-dropzone';

export type UploadedFile = {
  id: string;
  file: File;
  preview: string;
  name: string;
  size: number;
  type: string;
  lastModified: number;
};

interface UseFileUploadOptions extends Omit<DropzoneOptions, 'onDrop'> {
  maxFiles?: number;
  maxSize?: number;
  acceptedFileTypes?: Record<string, string[]>;
}

export function useFileUpload(options: UseFileUploadOptions = {}) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [rejected, setRejected] = useState<FileRejection[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const {
    maxFiles = 5,
    maxSize = 5 * 1024 * 1024, // 5MB default
    acceptedFileTypes = {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.svg', '.webp'],
    },
    ...dropzoneOptions
  } = options;

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
      if (acceptedFiles?.length) {
        setFiles((previousFiles) => {
          // Check if we would exceed max files
          if (previousFiles.length + acceptedFiles.length > maxFiles) {
            // Only take what we can fit
            const availableSlots = Math.max(0, maxFiles - previousFiles.length);
            acceptedFiles = acceptedFiles.slice(0, availableSlots);
          }

          const newFiles = acceptedFiles.map((file) => ({
            id: `file-${Date.now()}-${file.name}`,
            file,
            preview: URL.createObjectURL(file),
            name: file.name,
            size: file.size,
            type: file.type,
            lastModified: file.lastModified,
          }));

          return [...previousFiles, ...newFiles];
        });
      }

      if (rejectedFiles?.length) {
        setRejected((previousRejected) => [...previousRejected, ...rejectedFiles]);
      }
    },
    [maxFiles]
  );

  const { getRootProps, getInputProps, isDragActive, ...rest } = useDropzone({
    onDrop,
    maxFiles,
    maxSize,
    accept: acceptedFileTypes,
    ...dropzoneOptions,
  });

  // Remove a file from the list
  const removeFile = useCallback((id: string) => {
    setFiles((files) => {
      const fileToRemove = files.find((f) => f.id === id);
      if (fileToRemove?.preview) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      return files.filter((f) => f.id !== id);
    });
  }, []);

  // Clear all files
  const clearFiles = useCallback(() => {
    setFiles((files) => {
      files.forEach((file) => {
        if (file.preview) {
          URL.revokeObjectURL(file.preview);
        }
      });
      return [];
    });
    setRejected([]);
  }, []);

  // Remove a rejected file
  const removeRejected = useCallback((id: string) => {
    setRejected((rejected) => rejected.filter((r) => r.file.name !== id));
  }, []);

  return {
    files,
    rejected,
    isUploading,
    setIsUploading,
    getRootProps,
    getInputProps,
    isDragActive,
    removeFile,
    clearFiles,
    removeRejected,
    ...rest,
  };
}
