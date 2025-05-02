
import { PageElement } from './page-builder';

export interface CustomComponent {
  id: string;
  name: string;
  description: string;
  type: 'display' | 'form' | 'list' | 'chart' | 'custom';
  objectBinding: string;
  preview: string;
  elements: PageElement[];
  createdAt: string;
  updatedAt: string;
}
