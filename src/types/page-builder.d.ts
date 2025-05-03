
export interface PageElementPosition {
  x: number;
  y: number;
}

export interface PageElementSize {
  width: number;
  height: number;
}

export interface PageElementProps {
  [key: string]: any;
  label?: string;
  fieldBinding?: string;
  locked?: boolean;
  visible?: boolean;
  customId?: string;
  mediaId?: string; // Added for referencing media files
  mediaUrl?: string; // Added for storing the direct URL to media
}

export interface PageElement {
  id: string;
  type: string;
  props: PageElementProps;
  position: PageElementPosition;
  size: PageElementSize;
  children: PageElement[];
  style?: {
    [key: string]: string;
  };
  objectReference?: string;
}

export interface Page {
  id: string;
  title: string;
  elements: PageElement[];
  createdAt: string;
  updatedAt: string;
}

export interface DropTarget {
  id: string;
  type: 'canvas' | 'element';
}

// Added new types for file uploads and templates
export interface MediaFile {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  dimensions?: { width: number; height: number };
  createdAt: string;
}

export interface PageTemplate {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  elements: PageElement[];
  tags: string[];
  createdAt: string;
}
