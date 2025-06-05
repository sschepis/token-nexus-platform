/**
 * Data Components Configuration
 * Default settings and templates for data components
 */

const dataConfig = {
  // Default settings for all data components
  defaults: {
    // Pagination settings
    pagination: {
      enabled: true,
      itemsPerPage: 10,
      showPageNumbers: true,
      showFirstLast: true,
      showPrevNext: true,
    },

    // Sorting settings
    sorting: {
      enabled: true,
      defaultField: 'createdAt',
      defaultOrder: 'desc',
      allowMultiple: false,
    },

    // Filtering settings
    filtering: {
      enabled: true,
      allowCustomFilters: true,
      operators: ['equals', 'contains', 'gt', 'lt', 'in'],
    },

    // Cache settings
    cache: {
      enabled: true,
      duration: 5 * 60 * 1000, // 5 minutes
      invalidateOnUpdate: true,
    },

    // Real-time updates
    liveQuery: {
      enabled: true,
      events: ['create', 'update', 'delete'],
    },
  },

  // Default templates for different data views
  templates: {
    // List templates
    list: {
      default: `
        <div class="data-list">
          {{#each items}}
            <div class="data-item">
              <h3>{{this.title}}</h3>
              <p>{{this.description}}</p>
            </div>
          {{/each}}
        </div>
      `,
      compact: `
        <div class="data-list-compact">
          {{#each items}}
            <div class="data-item-compact">{{this.title}}</div>
          {{/each}}
        </div>
      `,
      table: `
        <table class="data-table">
          <thead>
            <tr>
              {{#each fields}}
                <th>{{this}}</th>
              {{/each}}
            </tr>
          </thead>
          <tbody>
            {{#each items}}
              <tr>
                {{#each ../fields}}
                  <td>{{lookup .. this}}</td>
                {{/each}}
              </tr>
            {{/each}}
          </tbody>
        </table>
      `,
    },

    // Grid templates
    grid: {
      default: `
        <div class="data-grid">
          {{#each items}}
            <div class="data-card">
              {{#if this.image}}
                <img src="{{this.image.url}}" alt="{{this.title}}">
              {{/if}}
              <div class="data-card-content">
                <h3>{{this.title}}</h3>
                <p>{{this.description}}</p>
              </div>
            </div>
          {{/each}}
        </div>
      `,
      gallery: `
        <div class="data-gallery">
          {{#each items}}
            <div class="gallery-item">
              <img src="{{this.image.url}}" alt="{{this.title}}">
              <div class="gallery-overlay">
                <h3>{{this.title}}</h3>
              </div>
            </div>
          {{/each}}
        </div>
      `,
    },

    // Form templates
    form: {
      default: `
        <form class="data-form">
          {{#each fields}}
            <div class="form-group">
              <label for="{{this.name}}">{{this.label}}</label>
              {{{renderField this}}}
            </div>
          {{/each}}
          <button type="submit">Submit</button>
        </form>
      `,
      inline: `
        <form class="data-form-inline">
          {{#each fields}}
            <div class="form-group-inline">
              <label for="{{this.name}}">{{this.label}}</label>
              {{{renderField this}}}
            </div>
          {{/each}}
          <button type="submit">Submit</button>
        </form>
      `,
    },

    // Detail templates
    detail: {
      default: `
        <div class="data-detail">
          {{#each fields}}
            <div class="detail-field">
              <label>{{this.label}}</label>
              <div class="field-value">{{{renderValue .. this}}}</div>
            </div>
          {{/each}}
        </div>
      `,
      card: `
        <div class="data-detail-card">
          {{#if image}}
            <div class="detail-image">
              <img src="{{image.url}}" alt="{{title}}">
            </div>
          {{/if}}
          <div class="detail-content">
            <h2>{{title}}</h2>
            {{#each fields}}
              <div class="detail-field">
                <label>{{this.label}}</label>
                <div class="field-value">{{{renderValue .. this}}}</div>
              </div>
            {{/each}}
          </div>
        </div>
      `,
    },
  },

  // Default styles for components
  styles: {
    // List styles
    list: `
      .data-list {
        display: flex;
        flex-direction: column;
        gap: 20px;
      }
      .data-item {
        padding: 20px;
        background: white;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      }
      .data-list-compact {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .data-item-compact {
        padding: 10px;
        background: #f5f5f5;
        border-radius: 4px;
      }
      .data-table {
        width: 100%;
        border-collapse: collapse;
      }
      .data-table th,
      .data-table td {
        padding: 12px;
        border-bottom: 1px solid #eee;
        text-align: left;
      }
      .data-table th {
        background: #f5f5f5;
        font-weight: 600;
      }
    `,

    // Grid styles
    grid: `
      .data-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
        gap: 20px;
      }
      .data-card {
        background: white;
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        transition: transform 0.3s ease;
      }
      .data-card:hover {
        transform: translateY(-5px);
      }
      .data-card img {
        width: 100%;
        height: 200px;
        object-fit: cover;
      }
      .data-card-content {
        padding: 20px;
      }
      .data-gallery {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 10px;
      }
      .gallery-item {
        position: relative;
        aspect-ratio: 1;
        overflow: hidden;
        border-radius: 8px;
      }
      .gallery-item img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .gallery-overlay {
        position: absolute;
        inset: 0;
        background: rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: opacity 0.3s ease;
      }
      .gallery-item:hover .gallery-overlay {
        opacity: 1;
      }
    `,

    // Form styles
    form: `
      .data-form {
        max-width: 600px;
        margin: 0 auto;
      }
      .form-group {
        margin-bottom: 20px;
      }
      .form-group label {
        display: block;
        margin-bottom: 5px;
        font-weight: 500;
      }
      .form-group input,
      .form-group textarea,
      .form-group select {
        width: 100%;
        padding: 8px 12px;
        border: 1px solid #ddd;
        border-radius: 4px;
      }
      .data-form-inline {
        display: flex;
        gap: 20px;
        align-items: flex-end;
      }
      .form-group-inline {
        flex: 1;
      }
    `,

    // Detail styles
    detail: `
      .data-detail {
        max-width: 800px;
        margin: 0 auto;
      }
      .detail-field {
        margin-bottom: 20px;
      }
      .detail-field label {
        font-weight: 500;
        color: #666;
        margin-bottom: 5px;
        display: block;
      }
      .data-detail-card {
        background: white;
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      }
      .detail-image {
        width: 100%;
        height: 300px;
      }
      .detail-image img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .detail-content {
        padding: 30px;
      }
    `,
  },

  // Helper functions for templates
  helpers: {
    renderField(field) {
      switch (field.type) {
        case 'text':
          return `<input type="text" id="${field.name}" name="${field.name}" ${
            field.required ? 'required' : ''
          }>`;
        case 'textarea':
          return `<textarea id="${field.name}" name="${field.name}" rows="4" ${
            field.required ? 'required' : ''
          }></textarea>`;
        case 'select':
          return `
            <select id="${field.name}" name="${field.name}" ${field.required ? 'required' : ''}>
              <option value="">Select ${field.label}</option>
              ${field.options
                .map(opt => `<option value="${opt.value}">${opt.label}</option>`)
                .join('')}
            </select>
          `;
        case 'checkbox':
          return `<input type="checkbox" id="${field.name}" name="${field.name}">`;
        case 'file':
          return `<input type="file" id="${field.name}" name="${field.name}" ${
            field.required ? 'required' : ''
          }>`;
        default:
          return `<input type="text" id="${field.name}" name="${field.name}" ${
            field.required ? 'required' : ''
          }>`;
      }
    },

    renderValue(data, field) {
      const value = data[field.name];
      switch (field.type) {
        case 'image':
          return `<img src="${value.url}" alt="${field.label}">`;
        case 'file':
          return `<a href="${value.url}" target="_blank">Download ${field.label}</a>`;
        case 'date':
          return new Date(value).toLocaleDateString();
        case 'boolean':
          return value ? 'Yes' : 'No';
        case 'array':
          return Array.isArray(value) ? value.join(', ') : '';
        case 'pointer':
          return value ? value.get(field.displayField || 'objectId') : '';
        default:
          return value;
      }
    },

    formatDate(date) {
      return new Date(date).toLocaleDateString();
    },

    formatCurrency(amount) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(amount);
    },
  },
};

module.exports = dataConfig;
