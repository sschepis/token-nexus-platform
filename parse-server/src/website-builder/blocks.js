/**
 * Default Block Templates
 * Provides pre-built blocks for the website builder
 */

const blocks = {
  // Layout blocks
  layout: {
    hero: {
      label: 'Hero Section',
      category: 'Layout',
      content: `
        <section class="hero">
          <div class="container">
            <h1>Welcome to Our Site</h1>
            <p class="lead">Create something amazing with our platform</p>
            <button class="cta-button">Get Started</button>
          </div>
        </section>
      `,
      style: `
        .hero {
          padding: 100px 0;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          text-align: center;
        }
        .hero h1 {
          font-size: 3em;
          margin-bottom: 20px;
        }
        .hero .lead {
          font-size: 1.5em;
          margin-bottom: 30px;
        }
        .cta-button {
          padding: 15px 30px;
          font-size: 1.2em;
          background: #fff;
          color: #764ba2;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          transition: transform 0.3s ease;
        }
        .cta-button:hover {
          transform: translateY(-2px);
        }
      `,
    },

    features: {
      label: 'Features Grid',
      category: 'Layout',
      content: `
        <section class="features">
          <div class="container">
            <div class="feature-grid">
              <div class="feature-item">
                <i class="fas fa-rocket"></i>
                <h3>Fast & Reliable</h3>
                <p>Lightning fast performance you can count on.</p>
              </div>
              <div class="feature-item">
                <i class="fas fa-shield-alt"></i>
                <h3>Secure</h3>
                <p>Your data is safe with us.</p>
              </div>
              <div class="feature-item">
                <i class="fas fa-cogs"></i>
                <h3>Customizable</h3>
                <p>Make it yours with endless options.</p>
              </div>
            </div>
          </div>
        </section>
      `,
      style: `
        .features {
          padding: 80px 0;
          background: #f8f9fa;
        }
        .feature-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 30px;
          text-align: center;
        }
        .feature-item {
          padding: 30px;
          background: white;
          border-radius: 10px;
          box-shadow: 0 5px 15px rgba(0,0,0,0.1);
          transition: transform 0.3s ease;
        }
        .feature-item:hover {
          transform: translateY(-5px);
        }
        .feature-item i {
          font-size: 2.5em;
          color: #764ba2;
          margin-bottom: 20px;
        }
      `,
    },

    testimonials: {
      label: 'Testimonials',
      category: 'Layout',
      content: `
        <section class="testimonials">
          <div class="container">
            <h2>What Our Clients Say</h2>
            <div class="testimonial-grid">
              <div class="testimonial-item">
                <div class="quote">"Amazing service! Couldn't be happier."</div>
                <div class="author">- John Doe</div>
              </div>
              <div class="testimonial-item">
                <div class="quote">"The best platform we've used."</div>
                <div class="author">- Jane Smith</div>
              </div>
              <div class="testimonial-item">
                <div class="quote">"Highly recommended!"</div>
                <div class="author">- Mike Johnson</div>
              </div>
            </div>
          </div>
        </section>
      `,
      style: `
        .testimonials {
          padding: 80px 0;
          background: #fff;
        }
        .testimonials h2 {
          text-align: center;
          margin-bottom: 50px;
        }
        .testimonial-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 30px;
        }
        .testimonial-item {
          padding: 30px;
          background: #f8f9fa;
          border-radius: 10px;
          text-align: center;
        }
        .testimonial-item .quote {
          font-size: 1.2em;
          font-style: italic;
          margin-bottom: 20px;
        }
        .testimonial-item .author {
          color: #666;
        }
      `,
    },
  },

  // Component blocks
  components: {
    callToAction: {
      label: 'Call to Action',
      category: 'Components',
      content: `
        <div class="cta-box">
          <h2>Ready to Get Started?</h2>
          <p>Join thousands of satisfied customers today.</p>
          <button class="cta-button">Sign Up Now</button>
        </div>
      `,
      style: `
        .cta-box {
          padding: 60px;
          background: #764ba2;
          color: white;
          text-align: center;
          border-radius: 10px;
        }
        .cta-box h2 {
          margin-bottom: 20px;
        }
        .cta-box .cta-button {
          padding: 15px 30px;
          font-size: 1.2em;
          background: white;
          color: #764ba2;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          transition: transform 0.3s ease;
        }
        .cta-box .cta-button:hover {
          transform: translateY(-2px);
        }
      `,
    },

    contactForm: {
      label: 'Contact Form',
      category: 'Components',
      content: `
        <form class="contact-form">
          <div class="form-group">
            <label for="name">Name</label>
            <input type="text" id="name" required>
          </div>
          <div class="form-group">
            <label for="email">Email</label>
            <input type="email" id="email" required>
          </div>
          <div class="form-group">
            <label for="message">Message</label>
            <textarea id="message" rows="5" required></textarea>
          </div>
          <button type="submit">Send Message</button>
        </form>
      `,
      style: `
        .contact-form {
          max-width: 600px;
          margin: 0 auto;
          padding: 30px;
          background: white;
          border-radius: 10px;
          box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        }
        .form-group {
          margin-bottom: 20px;
        }
        .form-group label {
          display: block;
          margin-bottom: 5px;
          color: #333;
        }
        .form-group input,
        .form-group textarea {
          width: 100%;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 5px;
        }
        .contact-form button {
          width: 100%;
          padding: 15px;
          background: #764ba2;
          color: white;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          transition: background 0.3s ease;
        }
        .contact-form button:hover {
          background: #653a8e;
        }
      `,
    },
  },

  // Helper function to register blocks with GrapesJS
  register(editor) {
    // Register layout blocks
    Object.entries(this.layout).forEach(([id, block]) => {
      editor.BlockManager.add(`layout-${id}`, {
        label: block.label,
        category: block.category,
        content: {
          type: 'layout',
          content: block.content,
          style: block.style,
        },
        render: ({ model }) => `
          <div class="gjs-block">
            <div class="gjs-block-label">${block.label}</div>
          </div>
        `,
      });
    });

    // Register component blocks
    Object.entries(this.components).forEach(([id, block]) => {
      editor.BlockManager.add(`component-${id}`, {
        label: block.label,
        category: block.category,
        content: {
          type: 'component',
          content: block.content,
          style: block.style,
        },
        render: ({ model }) => `
          <div class="gjs-block">
            <div class="gjs-block-label">${block.label}</div>
          </div>
        `,
      });
    });
  },
};

module.exports = blocks;
