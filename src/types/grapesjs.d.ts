
declare module 'grapesjs' {
  export interface EditorConfig {
    container: HTMLElement | string;
    height?: string | number;
    width?: string | number;
    canvas?: {
      styles?: string[];
    };
    fromElement?: boolean;
    storageManager?: {
      id?: string;
      type?: string;
      autosave?: boolean;
      autoload?: boolean;
      stepsBeforeSave?: number;
    };
    plugins?: any[];
    pluginsOpts?: {
      [key: string]: any;
    };
    deviceManager?: {
      devices?: {
        id: string;
        name: string;
        width: string;
        widthMedia?: string;
      }[];
    };
    panels?: {
      defaults?: any[];
    };
  }

  export interface Editor {
    setComponents(component: string | object): void;
    setStyle(style: string | object): void;
    getHtml(): string;
    getCss(): string;
    Commands: {
      add(name: string, command: { run: (editor: any) => void }): void;
    };
    setDevice(device: string): void;
    destroy(): void;
  }

  export function init(config: EditorConfig): Editor;
}

declare module 'grapesjs-preset-webpage' {
  const preset: any;
  export default preset;
}

declare module 'grapesjs/dist/css/grapes.min.css';
