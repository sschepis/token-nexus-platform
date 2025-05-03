
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { devtools } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { PageElement, Page, PageElementProps } from '@/types/page-builder';

interface PageBuilderState {
  pages: Page[];
  currentPageId: string | null;
  selectedElementId: string | null;
  isDragging: boolean;
  clipboard: PageElement | null;
  history: {
    past: Page[][];
    future: Page[][];
  };
}

interface PageBuilderActions {
  // Page actions
  setCurrentPageId: (pageId: string) => void;
  addPage: (title: string) => void;
  updatePage: (pageId: string, updates: Partial<Omit<Page, 'id'>>) => void;
  deletePage: (pageId: string) => void;
  
  // Element actions
  addElement: (element: Omit<PageElement, 'id'>) => void;
  updateElement: (elementId: string, updates: Partial<Omit<PageElement, 'id'>>) => void;
  deleteElement: (elementId: string) => void;
  selectElement: (elementId: string | null) => void;
  moveElement: (elementId: string, position: { x: number; y: number }) => void;
  resizeElement: (elementId: string, size: { width: number; height: number }) => void;
  updateElementProps: (elementId: string, props: PageElementProps) => void;
  
  // Drag operations
  setDragging: (isDragging: boolean) => void;
  
  // Clipboard operations
  copyElement: (elementId: string) => void;
  cutElement: (elementId: string) => void;
  pasteElement: () => void;
  
  // History operations
  undo: () => void;
  redo: () => void;
  saveHistoryState: () => void;
}

const initialState: PageBuilderState = {
  pages: [],
  currentPageId: null,
  selectedElementId: null,
  isDragging: false,
  clipboard: null,
  history: {
    past: [],
    future: [],
  }
};

export const usePageBuilderStore = create<PageBuilderState & PageBuilderActions>()(
  devtools(
    immer((set, get) => ({
      ...initialState,
      
      // Page actions
      setCurrentPageId: (pageId) => {
        set((state) => {
          state.currentPageId = pageId;
          state.selectedElementId = null;
        });
      },
      
      addPage: (title) => {
        const newPage: Page = {
          id: uuidv4(),
          title,
          elements: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        
        set((state) => {
          state.pages.push(newPage);
          state.currentPageId = newPage.id;
          state.selectedElementId = null;
          
          // Save to history
          state.history.past.push([...state.pages]);
          state.history.future = [];
        });
      },
      
      updatePage: (pageId, updates) => {
        set((state) => {
          const pageIndex = state.pages.findIndex((page) => page.id === pageId);
          if (pageIndex !== -1) {
            const updatedPage = {
              ...state.pages[pageIndex],
              ...updates,
              updatedAt: new Date().toISOString(),
            };
            state.pages[pageIndex] = updatedPage;
            
            // Save to history
            state.history.past.push([...state.pages]);
            state.history.future = [];
          }
        });
      },
      
      deletePage: (pageId) => {
        set((state) => {
          const pageIndex = state.pages.findIndex((page) => page.id === pageId);
          if (pageIndex !== -1) {
            state.pages.splice(pageIndex, 1);
            
            // If we're deleting the current page, select another one
            if (state.currentPageId === pageId) {
              state.currentPageId = state.pages.length > 0 ? state.pages[0].id : null;
              state.selectedElementId = null;
            }
            
            // Save to history
            state.history.past.push([...state.pages]);
            state.history.future = [];
          }
        });
      },
      
      // Element actions
      addElement: (elementData) => {
        const element: PageElement = {
          ...elementData,
          id: uuidv4(),
          children: elementData.children || [],
        };
        
        set((state) => {
          if (state.currentPageId) {
            const pageIndex = state.pages.findIndex((page) => page.id === state.currentPageId);
            if (pageIndex !== -1) {
              state.pages[pageIndex].elements.push(element);
              state.pages[pageIndex].updatedAt = new Date().toISOString();
              state.selectedElementId = element.id;
              
              // Save to history
              state.history.past.push([...state.pages]);
              state.history.future = [];
            }
          }
        });
      },
      
      updateElement: (elementId, updates) => {
        set((state) => {
          if (!state.currentPageId) return;
          
          const pageIndex = state.pages.findIndex((page) => page.id === state.currentPageId);
          if (pageIndex === -1) return;
          
          const findAndUpdateElement = (elements: PageElement[]): boolean => {
            for (let i = 0; i < elements.length; i++) {
              if (elements[i].id === elementId) {
                elements[i] = { ...elements[i], ...updates };
                return true;
              }
              
              if (elements[i].children && elements[i].children.length > 0) {
                if (findAndUpdateElement(elements[i].children)) {
                  return true;
                }
              }
            }
            return false;
          };
          
          if (findAndUpdateElement(state.pages[pageIndex].elements)) {
            state.pages[pageIndex].updatedAt = new Date().toISOString();
            
            // Save to history
            state.history.past.push([...state.pages]);
            state.history.future = [];
          }
        });
      },
      
      deleteElement: (elementId) => {
        set((state) => {
          if (!state.currentPageId) return;
          
          const pageIndex = state.pages.findIndex((page) => page.id === state.currentPageId);
          if (pageIndex === -1) return;
          
          const findAndDeleteElement = (elements: PageElement[]): boolean => {
            for (let i = 0; i < elements.length; i++) {
              if (elements[i].id === elementId) {
                elements.splice(i, 1);
                return true;
              }
              
              if (elements[i].children && elements[i].children.length > 0) {
                if (findAndDeleteElement(elements[i].children)) {
                  return true;
                }
              }
            }
            return false;
          };
          
          if (findAndDeleteElement(state.pages[pageIndex].elements)) {
            state.pages[pageIndex].updatedAt = new Date().toISOString();
            
            if (state.selectedElementId === elementId) {
              state.selectedElementId = null;
            }
            
            // Save to history
            state.history.past.push([...state.pages]);
            state.history.future = [];
          }
        });
      },
      
      selectElement: (elementId) => {
        set((state) => {
          state.selectedElementId = elementId;
        });
      },
      
      moveElement: (elementId, position) => {
        set((state) => {
          if (!state.currentPageId) return;
          
          const pageIndex = state.pages.findIndex((page) => page.id === state.currentPageId);
          if (pageIndex === -1) return;
          
          const findAndMoveElement = (elements: PageElement[]): boolean => {
            for (let i = 0; i < elements.length; i++) {
              if (elements[i].id === elementId) {
                elements[i].position = position;
                return true;
              }
              
              if (elements[i].children && elements[i].children.length > 0) {
                if (findAndMoveElement(elements[i].children)) {
                  return true;
                }
              }
            }
            return false;
          };
          
          if (findAndMoveElement(state.pages[pageIndex].elements)) {
            state.pages[pageIndex].updatedAt = new Date().toISOString();
          }
        });
      },
      
      resizeElement: (elementId, size) => {
        set((state) => {
          if (!state.currentPageId) return;
          
          const pageIndex = state.pages.findIndex((page) => page.id === state.currentPageId);
          if (pageIndex === -1) return;
          
          const findAndResizeElement = (elements: PageElement[]): boolean => {
            for (let i = 0; i < elements.length; i++) {
              if (elements[i].id === elementId) {
                elements[i].size = size;
                return true;
              }
              
              if (elements[i].children && elements[i].children.length > 0) {
                if (findAndResizeElement(elements[i].children)) {
                  return true;
                }
              }
            }
            return false;
          };
          
          if (findAndResizeElement(state.pages[pageIndex].elements)) {
            state.pages[pageIndex].updatedAt = new Date().toISOString();
          }
        });
      },
      
      updateElementProps: (elementId, props) => {
        set((state) => {
          if (!state.currentPageId) return;
          
          const pageIndex = state.pages.findIndex((page) => page.id === state.currentPageId);
          if (pageIndex === -1) return;
          
          const findAndUpdateProps = (elements: PageElement[]): boolean => {
            for (let i = 0; i < elements.length; i++) {
              if (elements[i].id === elementId) {
                elements[i].props = { ...elements[i].props, ...props };
                return true;
              }
              
              if (elements[i].children && elements[i].children.length > 0) {
                if (findAndUpdateProps(elements[i].children)) {
                  return true;
                }
              }
            }
            return false;
          };
          
          if (findAndUpdateProps(state.pages[pageIndex].elements)) {
            state.pages[pageIndex].updatedAt = new Date().toISOString();
            
            // Save to history
            state.history.past.push([...state.pages]);
            state.history.future = [];
          }
        });
      },
      
      // Drag operations
      setDragging: (isDragging) => {
        set((state) => {
          state.isDragging = isDragging;
        });
      },
      
      // Clipboard operations
      copyElement: (elementId) => {
        const state = get();
        if (!state.currentPageId) return;
        
        const pageIndex = state.pages.findIndex((page) => page.id === state.currentPageId);
        if (pageIndex === -1) return;
        
        const findElement = (elements: PageElement[]): PageElement | null => {
          for (const element of elements) {
            if (element.id === elementId) {
              return JSON.parse(JSON.stringify(element)); // Deep clone
            }
            
            if (element.children && element.children.length > 0) {
              const found = findElement(element.children);
              if (found) return found;
            }
          }
          return null;
        };
        
        const elementToCopy = findElement(state.pages[pageIndex].elements);
        if (elementToCopy) {
          set({ clipboard: elementToCopy });
        }
      },
      
      cutElement: (elementId) => {
        const { copyElement, deleteElement } = get();
        
        copyElement(elementId);
        deleteElement(elementId);
      },
      
      pasteElement: () => {
        const state = get();
        if (!state.clipboard || !state.currentPageId) return;
        
        // Generate new IDs for the pasted element and its children
        const generateNewIds = (element: PageElement): PageElement => {
          const newElement = { ...element, id: uuidv4() };
          
          if (newElement.children && newElement.children.length > 0) {
            newElement.children = newElement.children.map(generateNewIds);
          }
          
          return newElement;
        };
        
        const elementToPaste = generateNewIds(state.clipboard);
        
        // Offset position slightly to make it clear it's a copy
        elementToPaste.position = {
          x: elementToPaste.position.x + 10,
          y: elementToPaste.position.y + 10
        };
        
        set((state) => {
          const pageIndex = state.pages.findIndex((page) => page.id === state.currentPageId);
          if (pageIndex !== -1) {
            state.pages[pageIndex].elements.push(elementToPaste);
            state.pages[pageIndex].updatedAt = new Date().toISOString();
            state.selectedElementId = elementToPaste.id;
            
            // Save to history
            state.history.past.push([...state.pages]);
            state.history.future = [];
          }
        });
      },
      
      // History operations
      undo: () => {
        set((state) => {
          const { past, future } = state.history;
          
          if (past.length === 0) return;
          
          const newPast = [...past];
          const previousPages = newPast.pop();
          
          if (previousPages) {
            future.unshift(state.pages);
            state.pages = previousPages;
            
            // Update current page and selected element if they no longer exist
            const pageExists = state.pages.some(page => page.id === state.currentPageId);
            if (!pageExists && state.pages.length > 0) {
              state.currentPageId = state.pages[0].id;
            } else if (!pageExists) {
              state.currentPageId = null;
            }
            
            state.history.past = newPast;
          }
        });
      },
      
      redo: () => {
        set((state) => {
          const { past, future } = state.history;
          
          if (future.length === 0) return;
          
          const newFuture = [...future];
          const nextPages = newFuture.shift();
          
          if (nextPages) {
            past.push(state.pages);
            state.pages = nextPages;
            
            // Update current page and selected element if they no longer exist
            const pageExists = state.pages.some(page => page.id === state.currentPageId);
            if (!pageExists && state.pages.length > 0) {
              state.currentPageId = state.pages[0].id;
            } else if (!pageExists) {
              state.currentPageId = null;
            }
            
            state.history.future = newFuture;
          }
        });
      },
      
      saveHistoryState: () => {
        set((state) => {
          state.history.past.push([...state.pages]);
          state.history.future = [];
        });
      },
    }))
  )
);
