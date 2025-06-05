# Parse Server CMS Plugin

A comprehensive Content Management System (CMS) plugin for Parse Server that provides content
management, website building with GrapesJS, and data-aware components.

## Features

### Website Builder

- Visual page builder powered by GrapesJS
- Drag-and-drop interface
- Pre-built components and templates
- Custom code blocks
- Form builder
- Responsive design tools
- Real-time preview
- Version control

### Data-Aware Components

- Dynamic data display components
- Real-time data updates
- Customizable templates
- Advanced filtering and sorting
- Pagination support
- Relationship handling
- Form generation
- Data visualization

### Content Management

- Visual content editor
- Template-based content creation
- Version control and drafts
- Content scheduling
- Media management
- Custom fields and validation

### Media Management

- Image and file uploads
- Automatic image optimization
- Video processing
- Media library
- CDN integration
- Usage tracking

### Core Features

- Multi-tenant architecture
- Role-based access control
- Real-time updates
- Webhooks and events
- Caching system
- API-first design

## Installation

```bash
npm install parse-server-cms
```

## Quick Start

```javascript
const express = require('express');
const { ParseServer } = require('parse-server');
const ParseServerCMS = require('parse-server-cms');

const app = express();

const parseServer = new ParseServer({
  databaseURI: 'mongodb://localhost:27017/parse-cms',
  appId: 'your-app-id',
  masterKey: 'your-master-key',
  serverURL: 'http://localhost:1337/parse',

  // Initialize the CMS plugin
  plugins: [
    {
      module: ParseServerCMS,
      options: {
        database: {
          collectionPrefix: 'CMS',
        },
        content: {
          versioning: { enabled: true },
        },
        media: {
          storage: { type: 'parse' },
        },
      },
    },
  ],
});

app.use('/parse', parseServer);
```

## Data Components

### Available Components

1. **List Components**

   - Data List
   - Data Grid
   - Data Table

2. **Single Item Components**

   - Data Card
   - Data Detail
   - Data Profile

3. **Form Components**

   - Data Form
   - Data Search
   - Data Filter

4. **Chart Components**

   - Data Chart
   - Data Metric
   - Data Dashboard

5. **Relationship Components**
   - Data Relation
   - Data Selector
   - Data Tree

### Using Data Components

```javascript
// Add a data list to your page
editor.addComponent({
  type: 'data-dataList',
  config: {
    className: 'Product',
    template: 'grid',
    pagination: {
      enabled: true,
      itemsPerPage: 12,
    },
    sorting: {
      field: 'price',
      order: 'asc',
    },
  },
});

// Add a data form
editor.addComponent({
  type: 'data-dataForm',
  config: {
    className: 'Contact',
    fields: [
      { name: 'name', type: 'text', required: true },
      { name: 'email', type: 'email', required: true },
      { name: 'message', type: 'textarea' },
    ],
  },
});

// Add a data chart
editor.addComponent({
  type: 'data-dataChart',
  config: {
    className: 'Sales',
    type: 'line',
    dataField: 'amount',
    groupBy: 'date',
  },
});
```

### Customizing Components

```javascript
// Custom template
const template = `
  <div class="product-grid">
    {{#each items}}
      <div class="product-card">
        <img src="{{this.image.url}}" alt="{{this.name}}">
        <h3>{{this.name}}</h3>
        <p class="price">${{this.price}}</p>
        <button class="add-to-cart" data-id="{{this.objectId}}">
          Add to Cart
        </button>
      </div>
    {{/each}}
  </div>
`;

// Custom styling
const style = `
  .product-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 30px;
    padding: 20px;
  }
  .product-card {
    border: 1px solid #eee;
    border-radius: 8px;
    padding: 15px;
    text-align: center;
  }
`;

// Add component with custom template and style
editor.addComponent({
  type: 'data-dataList',
  config: {
    className: 'Product',
    template,
    style
  }
});
```

### Real-time Updates

Data components automatically update when the underlying data changes:

```javascript
// Enable live updates
editor.addComponent({
  type: 'data-dataList',
  config: {
    className: 'Product',
    liveQuery: {
      enabled: true,
      events: ['create', 'update', 'delete'],
    },
  },
});
```

### Data Blocks

Pre-built blocks combining data components with styling:

```javascript
// Add a product grid block
editor.BlockManager.add('product-grid', {
  label: 'Product Grid',
  content: {
    type: 'data-dataGrid',
    config: {
      className: 'Product',
      template: 'product-grid',
    },
  },
});
```

## Documentation

- [Getting Started](docs/getting-started.md)
- [Configuration](docs/configuration.md)
- [Website Builder](docs/website-builder.md)
- [Data Components](docs/data-components.md)
- [Content Management](docs/content-management.md)
- [API Reference](docs/api-reference.md)

## Example

Check out the [example](example/) directory for a complete working example.

```bash
# Clone the repository
git clone https://github.com/yourusername/parse-server-cms.git

# Install dependencies
cd parse-server-cms
npm install

# Run the example
npm run example:dev
```

## Development

```bash
# Install dependencies
npm install

# Build the plugin
npm run build

# Run tests
npm test

# Run linting
npm run lint

# Generate documentation
npm run docs
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- [Documentation](docs/)
- [GitHub Issues](https://github.com/yourusername/parse-server-cms/issues)
- [Example Project](example/)
- [API Reference](docs/api-reference.md)
