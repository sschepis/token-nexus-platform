
declare module 'grapesjs' {
  namespace grapesjs {
    function init(config: any): any;
  }
  
  export = grapesjs;
}

declare module 'grapesjs-preset-webpage' {
  const preset: any;
  export default preset;
}
