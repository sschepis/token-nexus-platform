import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { devtools } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { PageElement, Page, PageElementProps } from '@/types/page-builder';
import { CustomComponent } from '@/types/component-library';

// Add a new interface for uploaded media files
export interface UploadedMedia {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  createdAt: string;
}

// Component library types
export interface ComponentCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  order: number;
}

export interface ComponentFilter {
  category?: string;
  type?: string;
  tags?: string[];
  objectBinding?: string;
}

export interface ComponentSuggestion {
  id: string;
  component: CustomComponent;
  relevanceScore: number;
  confidence: number;
  reason: string;
  context: string;
}

export interface LayoutSuggestion {
  id: string;
  type: 'spacing' | 'alignment' | 'responsive' | 'performance';
  description: string;
  elementIds: string[];
  changes: Record<string, any>;
  impact: 'low' | 'medium' | 'high';
}

export interface BindingSuggestion {
  id: string;
  componentId: string;
  sourceObject: string;
  sourceField: string;
  targetProperty: string;
  confidence: number;
  description: string;
}

export interface ContentSuggestion {
  id: string;
  type: 'headline' | 'description' | 'cta' | 'list' | 'paragraph';
  content: string;
  context: string;
  tone: string;
}

export interface AIInteraction {
  id: string;
  type: 'query' | 'suggestion' | 'optimization';
  content: string;
  timestamp: Date;
  response?: string;
}

interface PageBuilderState {
  pages: Page[];
  currentPageId: string | null;
  selectedElementId: string | null;
  isDragging: boolean;
  clipboard: PageElement | null;
  uploadedMedia: UploadedMedia[];
  history: {
    past: Page[][];
    future: Page[][];
  };
  
  // Component library state
  componentLibrary: {
    components: CustomComponent[];
    categories: ComponentCategory[];
    selectedComponent: CustomComponent | null;
    searchQuery: string;
    filters: ComponentFilter;
    isLoading: boolean;
    error: string | null;
  };
  
  // AI assistant state
  aiAssistant: {
    isActive: boolean;
    isLoading: boolean;
    suggestions: ComponentSuggestion[];
    layoutOptimizations: LayoutSuggestion[];
    bindingSuggestions: BindingSuggestion[];
    contentSuggestions: ContentSuggestion[];
    interactions: AIInteraction[];
    autoBindingEnabled: boolean;
    lastSuggestionTime: Date | null;
  };
  
  // Enhanced UI state
  ui: {
    leftPanelWidth: number;
    rightPanelWidth: number;
    showComponentLibrary: boolean;
    showAIAssistant: boolean;
    showLayers: boolean;
    showStyles: boolean;
    showPageList: boolean;
    currentView: 'design' | 'code' | 'preview';
    deviceMode: 'desktop' | 'tablet' | 'mobile';
    isFullscreen: boolean;
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
  
  // Media actions
  addMedia: (file: File) => Promise<UploadedMedia>;
  deleteMedia: (mediaId: string) => void;
  getMedia: (mediaId: string) => UploadedMedia | undefined;
  
  // History operations
  undo: () => void;
  redo: () => void;
  saveHistoryState: () => void;
  
  // Component library actions
  setComponents: (components: CustomComponent[]) => void;
  addComponent: (component: CustomComponent) => void;
  updateComponent: (componentId: string, updates: Partial<CustomComponent>) => void;
  deleteComponent: (componentId: string) => void;
  selectComponent: (component: CustomComponent | null) => void;
  setComponentSearchQuery: (query: string) => void;
  setComponentFilters: (filters: ComponentFilter) => void;
  setComponentLibraryLoading: (isLoading: boolean) => void;
  setComponentLibraryError: (error: string | null) => void;
  
  // AI assistant actions
  toggleAIAssistant: () => void;
  setAILoading: (isLoading: boolean) => void;
  setComponentSuggestions: (suggestions: ComponentSuggestion[]) => void;
  setLayoutOptimizations: (optimizations: LayoutSuggestion[]) => void;
  setBindingSuggestions: (suggestions: BindingSuggestion[]) => void;
  setContentSuggestions: (suggestions: ContentSuggestion[]) => void;
  addAIInteraction: (interaction: AIInteraction) => void;
  toggleAutoBinding: () => void;
  clearAISuggestions: () => void;
  
  // UI actions
  setLeftPanelWidth: (width: number) => void;
  setRightPanelWidth: (width: number) => void;
  toggleComponentLibrary: () => void;
  toggleAIAssistantPanel: () => void;
  toggleLayers: () => void;
  toggleStyles: () => void;
  togglePageList: () => void;
  setCurrentView: (view: 'design' | 'code' | 'preview') => void;
  setDeviceMode: (mode: 'desktop' | 'tablet' | 'mobile') => void;
  toggleFullscreen: () => void;
}

const initialState: PageBuilderState = {
  pages: [],
  currentPageId: null,
  selectedElementId: null,
  isDragging: false,
  clipboard: null,
  uploadedMedia: [],
  history: {
    past: [],
    future: [],
  },
  
  // Component library initial state
  componentLibrary: {
    components: [],
    categories: [
      { id: 'layout', name: 'Layout', description: 'Layout components', icon: 'layout', order: 1 },
      { id: 'data-display', name: 'Data Display', description: 'Data display components', icon: 'table', order: 2 },
      { id: 'forms', name: 'Forms', description: 'Form components', icon: 'form-input', order: 3 },
      { id: 'charts', name: 'Charts', description: 'Chart components', icon: 'bar-chart', order: 4 },
      { id: 'apps', name: 'Apps', description: 'Mini-app components', icon: 'app-window', order: 5 },
      { id: 'custom', name: 'Custom', description: 'Custom components', icon: 'puzzle', order: 6 }
    ],
    selectedComponent: null,
    searchQuery: '',
    filters: {},
    isLoading: false,
    error: null,
  },
  
  // AI assistant initial state
  aiAssistant: {
    isActive: false,
    isLoading: false,
    suggestions: [],
    layoutOptimizations: [],
    bindingSuggestions: [],
    contentSuggestions: [],
    interactions: [],
    autoBindingEnabled: true,
    lastSuggestionTime: null,
  },
  
  // Enhanced UI initial state
  ui: {
    leftPanelWidth: 280,
    rightPanelWidth: 320,
    showComponentLibrary: true,
    showAIAssistant: false,
    showLayers: true,
    showStyles: true,
    showPageList: true, // Show page list by default
    currentView: 'design',
    deviceMode: 'desktop',
    isFullscreen: false,
  },
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
      
      // Media actions
      addMedia: async (file: File) => {
        // In a real app, this would upload to a server
        // For now, we'll create a data URL and simulate storage
        return new Promise<UploadedMedia>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => {
            const media: UploadedMedia = {
              id: uuidv4(),
              name: file.name,
              url: reader.result as string,
              type: file.type,
              size: file.size,
              createdAt: new Date().toISOString(),
            };
            
            set((state) => {
              state.uploadedMedia.push(media);
            });
            
            resolve(media);
          };
          reader.readAsDataURL(file);
        });
      },
      
      deleteMedia: (mediaId: string) => {
        set((state) => {
          state.uploadedMedia = state.uploadedMedia.filter((media) => media.id !== mediaId);
          
          // Also remove references to this media from all elements
          state.pages.forEach((page) => {
            const removeMediaReferences = (elements: PageElement[]) => {
              elements.forEach((element) => {
                if (element.props.mediaId === mediaId) {
                  delete element.props.mediaId;
                  delete element.props.mediaUrl;
                }
                if (element.children?.length) {
                  removeMediaReferences(element.children);
                }
              });
            };
            
            removeMediaReferences(page.elements);
          });
        });
      },
      
      getMedia: (mediaId: string) => {
        return get().uploadedMedia.find((media) => media.id === mediaId);
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
      
      // Component library actions
      setComponents: (components) => {
        set((state) => {
          state.componentLibrary.components = components;
        });
      },
      
      addComponent: (component) => {
        set((state) => {
          state.componentLibrary.components.push(component);
        });
      },
      
      updateComponent: (componentId, updates) => {
        set((state) => {
          const index = state.componentLibrary.components.findIndex(c => c.id === componentId);
          if (index !== -1) {
            state.componentLibrary.components[index] = {
              ...state.componentLibrary.components[index],
              ...updates
            };
          }
        });
      },
      
      deleteComponent: (componentId) => {
        set((state) => {
          state.componentLibrary.components = state.componentLibrary.components.filter(
            c => c.id !== componentId
          );
          if (state.componentLibrary.selectedComponent?.id === componentId) {
            state.componentLibrary.selectedComponent = null;
          }
        });
      },
      
      selectComponent: (component) => {
        set((state) => {
          state.componentLibrary.selectedComponent = component;
        });
      },
      
      setComponentSearchQuery: (query) => {
        set((state) => {
          state.componentLibrary.searchQuery = query;
        });
      },
      
      setComponentFilters: (filters) => {
        set((state) => {
          state.componentLibrary.filters = filters;
        });
      },
      
      setComponentLibraryLoading: (isLoading) => {
        set((state) => {
          state.componentLibrary.isLoading = isLoading;
        });
      },
      
      setComponentLibraryError: (error) => {
        set((state) => {
          state.componentLibrary.error = error;
        });
      },
      
      // AI assistant actions
      toggleAIAssistant: () => {
        set((state) => {
          state.aiAssistant.isActive = !state.aiAssistant.isActive;
          state.ui.showAIAssistant = state.aiAssistant.isActive;
        });
      },
      
      setAILoading: (isLoading) => {
        set((state) => {
          state.aiAssistant.isLoading = isLoading;
        });
      },
      
      setComponentSuggestions: (suggestions) => {
        set((state) => {
          state.aiAssistant.suggestions = suggestions;
          state.aiAssistant.lastSuggestionTime = new Date();
        });
      },
      
      setLayoutOptimizations: (optimizations) => {
        set((state) => {
          state.aiAssistant.layoutOptimizations = optimizations;
        });
      },
      
      setBindingSuggestions: (suggestions) => {
        set((state) => {
          state.aiAssistant.bindingSuggestions = suggestions;
        });
      },
      
      setContentSuggestions: (suggestions) => {
        set((state) => {
          state.aiAssistant.contentSuggestions = suggestions;
        });
      },
      
      addAIInteraction: (interaction) => {
        set((state) => {
          state.aiAssistant.interactions.push(interaction);
          // Keep only the last 50 interactions to prevent memory issues
          if (state.aiAssistant.interactions.length > 50) {
            state.aiAssistant.interactions = state.aiAssistant.interactions.slice(-50);
          }
        });
      },
      
      toggleAutoBinding: () => {
        set((state) => {
          state.aiAssistant.autoBindingEnabled = !state.aiAssistant.autoBindingEnabled;
        });
      },
      
      clearAISuggestions: () => {
        set((state) => {
          state.aiAssistant.suggestions = [];
          state.aiAssistant.layoutOptimizations = [];
          state.aiAssistant.bindingSuggestions = [];
          state.aiAssistant.contentSuggestions = [];
        });
      },
      
      // UI actions
      setLeftPanelWidth: (width) => {
        set((state) => {
          state.ui.leftPanelWidth = Math.max(200, Math.min(400, width));
        });
      },
      
      setRightPanelWidth: (width) => {
        set((state) => {
          state.ui.rightPanelWidth = Math.max(250, Math.min(500, width));
        });
      },
      
      toggleComponentLibrary: () => {
        set((state) => {
          state.ui.showComponentLibrary = !state.ui.showComponentLibrary;
        });
      },
      
      toggleAIAssistantPanel: () => {
        set((state) => {
          state.ui.showAIAssistant = !state.ui.showAIAssistant;
          state.aiAssistant.isActive = state.ui.showAIAssistant;
        });
      },
      
      toggleLayers: () => {
        set((state) => {
          state.ui.showLayers = !state.ui.showLayers;
        });
      },
      
      toggleStyles: () => {
        set((state) => {
          state.ui.showStyles = !state.ui.showStyles;
        });
      },

      togglePageList: () => {
        set((state) => {
          state.ui.showPageList = !state.ui.showPageList;
        });
      },
      
      setCurrentView: (view) => {
        set((state) => {
          state.ui.currentView = view;
        });
      },
      
      setDeviceMode: (mode) => {
        set((state) => {
          state.ui.deviceMode = mode;
        });
      },
      
      toggleFullscreen: () => {
        set((state) => {
          state.ui.isFullscreen = !state.ui.isFullscreen;
        });
      },
    }))
  )
);
