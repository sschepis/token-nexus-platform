
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
