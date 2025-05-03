
declare module 'grapesjs' {
  interface GrapesJSEditor {
    setComponents(component: string | {}): any;
    setStyle(style: string | {}): any;
    getHtml(): string;
    getCss(): string;
    Commands: {
      add(name: string, command: { run: (editor: any) => void }): void;
    };
    setDevice(device: string): void;
    destroy(): void;
  }

  interface GrapesJS {
    init(config: any): GrapesJSEditor;
  }

  const grapesjs: GrapesJS;
  export default grapesjs;
}

declare module 'grapesjs-preset-webpage' {
  const preset: any;
  export default preset;
}

declare module 'grapesjs/dist/css/grapes.min.css';
