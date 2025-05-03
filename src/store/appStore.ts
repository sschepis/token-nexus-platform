
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface AppState {
  isSidebarOpen: boolean;
  isLoading: boolean;
  appErrors: Error[];
  activeView: string;
}

interface AppActions {
  setSidebarOpen: (isOpen: boolean) => void;
  toggleSidebar: () => void;
  setLoading: (isLoading: boolean) => void;
  setActiveView: (view: string) => void;
  addError: (error: Error) => void;
  clearErrors: () => void;
}

export const useAppStore = create<AppState & AppActions>()(
  devtools((set) => ({
    isSidebarOpen: true,
    isLoading: false,
    appErrors: [],
    activeView: 'dashboard',
    
    setSidebarOpen: (isOpen) => set({ isSidebarOpen: isOpen }),
    toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
    setLoading: (isLoading) => set({ isLoading }),
    setActiveView: (view) => set({ activeView: view }),
    addError: (error) => set((state) => ({ appErrors: [...state.appErrors, error] })),
    clearErrors: () => set({ appErrors: [] }),
  }))
);
