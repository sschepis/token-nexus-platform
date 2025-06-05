/**
 * Website Builder Themes
 * Provides pre-built themes for the website builder
 */

const themes = {
  // Modern Business Theme
  modern: {
    name: 'Modern Business',
    styles: `
      :root {
        --primary-color: #2c3e50;
        --secondary-color: #3498db;
        --accent-color: #e74c3c;
        --text-color: #333;
        --light-gray: #f5f6fa;
        --font-primary: 'Inter', sans-serif;
        --font-secondary: 'Poppins', sans-serif;
      }

      body {
        font-family: var(--font-primary);
        color: var(--text-color);
        line-height: 1.6;
      }

      .container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 0 20px;
      }

      h1, h2, h3, h4, h5, h6 {
        font-family: var(--font-secondary);
        font-weight: 600;
      }

      .btn {
        display: inline-block;
        padding: 12px 24px;
        border-radius: 4px;
        transition: all 0.3s ease;
        cursor: pointer;
        text-decoration: none;
      }

      .btn-primary {
        background: var(--primary-color);
        color: white;
      }

      .btn-primary:hover {
        background: var(--secondary-color);
        transform: translateY(-2px);
      }

      .section {
        padding: 80px 0;
      }

      .grid {
        display: grid;
        gap: 30px;
      }

      @media (min-width: 768px) {
        .grid-2 {
          grid-template-columns: repeat(2, 1fr);
        }

        .grid-3 {
          grid-template-columns: repeat(3, 1fr);
        }

        .grid-4 {
          grid-template-columns: repeat(4, 1fr);
        }
      }
    `,
    fonts: [
      'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Poppins:wght@500;600;700&display=swap',
    ],
  },

  // Creative Portfolio Theme
  creative: {
    name: 'Creative Portfolio',
    styles: `
      :root {
        --primary-color: #ff6b6b;
        --secondary-color: #4ecdc4;
        --dark-color: #2d3436;
        --light-color: #f7f7f7;
        --font-primary: 'Montserrat', sans-serif;
        --font-secondary: 'Playfair Display', serif;
      }

      body {
        font-family: var(--font-primary);
        color: var(--dark-color);
        line-height: 1.7;
      }

      .container {
        max-width: 1400px;
        margin: 0 auto;
        padding: 0 30px;
      }

      h1, h2, h3, h4, h5, h6 {
        font-family: var(--font-secondary);
        font-weight: 700;
      }

      .portfolio-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 20px;
      }

      .portfolio-item {
        position: relative;
        overflow: hidden;
        border-radius: 8px;
        transition: transform 0.3s ease;
      }

      .portfolio-item:hover {
        transform: translateY(-5px);
      }

      .portfolio-item img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .portfolio-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: opacity 0.3s ease;
      }

      .portfolio-item:hover .portfolio-overlay {
        opacity: 1;
      }
    `,
    fonts: [
      'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600&family=Playfair+Display:wght@700&display=swap',
    ],
  },

  // Minimal Blog Theme
  minimal: {
    name: 'Minimal Blog',
    styles: `
      :root {
        --primary-color: #1a1a1a;
        --secondary-color: #666;
        --accent-color: #f0f0f0;
        --font-primary: 'Source Sans Pro', sans-serif;
        --font-secondary: 'Merriweather', serif;
      }

      body {
        font-family: var(--font-primary);
        color: var(--primary-color);
        line-height: 1.8;
        background: white;
      }

      .container {
        max-width: 800px;
        margin: 0 auto;
        padding: 0 20px;
      }

      h1, h2, h3, h4, h5, h6 {
        font-family: var(--font-secondary);
        font-weight: 700;
        line-height: 1.3;
      }

      .post {
        margin-bottom: 60px;
      }

      .post-title {
        font-size: 2.5em;
        margin-bottom: 20px;
      }

      .post-meta {
        color: var(--secondary-color);
        font-size: 0.9em;
        margin-bottom: 20px;
      }

      .post-content {
        font-size: 1.1em;
      }

      blockquote {
        border-left: 4px solid var(--accent-color);
        padding-left: 20px;
        margin: 30px 0;
        font-style: italic;
      }
    `,
    fonts: [
      'https://fonts.googleapis.com/css2?family=Source+Sans+Pro:wght@400;600&family=Merriweather:wght@700&display=swap',
    ],
  },

  // Register theme with GrapesJS
  register(editor, themeName = 'modern') {
    const theme = this[themeName];
    if (!theme) {
      console.error(`Theme "${themeName}" not found`);
      return;
    }

    // Add theme styles
    const style = document.createElement('style');
    style.textContent = theme.styles;
    document.head.appendChild(style);

    // Add theme fonts
    theme.fonts.forEach(font => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = font;
      document.head.appendChild(link);
    });

    // Add theme to editor
    editor.Config.canvasCss = theme.styles;

    // Add theme selection command
    editor.Commands.add('set-theme', {
      run: (editor, sender, options = {}) => {
        const themeName = options.theme || 'modern';
        this.register(editor, themeName);
      },
    });
  },
};

module.exports = themes;
