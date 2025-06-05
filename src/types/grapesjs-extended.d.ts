import 'grapesjs';

declare module 'grapesjs' {
  interface Editor {
    BlockManager: {
      add(id: string, block: any): void;
      get(id: string): any;
      getAll(): any[];
      remove(id: string): void;
    };
    
    Commands: {
      add(name: string, command: { run: (editor: Editor, sender?: any, options?: any) => void; stop?: (editor: Editor, sender?: any, options?: any) => void; }): void;
      get(name: string): any;
      run(name: string, options?: any): any;
      stop(name: string, options?: any): any;
      isActive(name: string): boolean;
    };
    
    Canvas: {
      getDocument(): Document;
      getWindow(): Window;
      getBody(): HTMLElement;
      getWrapper(): HTMLElement;
    };
    
    UndoManager: {
      undo(): void;
      redo(): void;
      hasUndo(): boolean;
      hasRedo(): boolean;
    };
    
    on(event: string, callback: (...args: any[]) => void): void;
    off(event: string, callback?: (...args: any[]) => void): void;
    trigger(event: string, ...args: any[]): void;
    
    getProjectData(): any;
    loadProjectData(data: any): void;
    
    setDevice(device: string): void;
    getDevice(): string;
    
    getHtml(): string;
    getCss(): string;
    setComponents(components: string | any[]): void;
    setStyle(style: string): void;
    
    getContainer(): HTMLElement;
    getSelected(): any;
    select(component: any): void;
    
    destroy(): void;
  }
}

// Plugin function type
export type GrapesJSPlugin = (editor: import('grapesjs').Editor, options?: any) => void;