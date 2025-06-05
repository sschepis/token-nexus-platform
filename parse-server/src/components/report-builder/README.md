# Report Builder System

A flexible and powerful visual report builder system built with React and Material-UI. This system
allows users to create custom reports by dragging and dropping components onto a canvas, configuring
their properties, and arranging them in a grid layout.

## Features

- 📊 Multiple visualization types (charts, tables, filters)
- 🎨 Drag and drop interface
- 📐 Resizable components
- 🔄 Real-time data updates
- 📱 Responsive layout
- 🎯 Advanced filtering
- 💾 State management
- 📤 Export capabilities
- 🎨 Customizable themes

## Installation

```bash
npm install @mui/material @emotion/react @emotion/styled
npm install recharts react-table react-grid-layout @tanstack/react-query
```

## Usage

```jsx
import { ReportBuilder } from './components/report-builder';

const MyReport = () => {
  const handleSave = state => {
    console.log('Report state:', state);
  };

  const handleExport = (format, state) => {
    console.log(`Exporting as ${format}:`, state);
  };

  return (
    <ReportBuilder
      config={{
        components: {
          charts: true,
          tables: true,
          filters: true,
        },
        theme: 'light',
        export: ['pdf', 'excel'],
      }}
      onSave={handleSave}
      onExport={handleExport}
    />
  );
};
```

## Components

### ReportBuilder

The main component that provides the report building interface.

```jsx
<ReportBuilder
  config={config}
  initialState={initialState}
  onSave={handleSave}
  onExport={handleExport}
/>
```

#### Props

- `config` (Object): Configuration options for the report builder
- `initialState` (Object): Initial report state
- `onSave` (Function): Callback when report is saved
- `onExport` (Function): Callback when report is exported

### ChartComponent

Renders various types of charts using recharts.

```jsx
<ChartComponent type="line" title="Sales Report" xAxis="month" yAxis="revenue" dataSource="sales" />
```

#### Supported Chart Types

- Line Chart
- Bar Chart
- Pie Chart
- Area Chart
- Scatter Plot

### TableComponent

Renders data tables with sorting, filtering, and pagination.

```jsx
<TableComponent
  title="Sales Data"
  columns={columns}
  dataSource="sales"
  pagination={true}
  sortable={true}
/>
```

### FilterComponent

Provides data filtering capabilities.

```jsx
<FilterComponent title="Date Filter" type="dateRange" field="date" onChange={handleFilterChange} />
```

#### Filter Types

- Select
- Multi-select
- Date
- Date Range
- Text
- Number
- Boolean

## State Management

The report builder uses a custom hook `useReportState` to manage component state and layout.

```jsx
const {
  components,
  layout,
  addComponent,
  updateComponent,
  removeComponent,
  updateLayout,
  undo,
  redo,
  saveState,
  loadState,
} = useReportState(initialState);
```

## Theming

Customize the appearance using Material-UI themes:

```jsx
import { theme } from './components/report-builder/theme';
import { ThemeProvider } from '@mui/material/styles';

const App = () => (
  <ThemeProvider theme={theme}>
    <ReportBuilder />
  </ThemeProvider>
);
```

## Data Integration

### Data Source Configuration

```jsx
const dataSource = {
  // Define your data source
  sales: {
    url: '/api/sales',
    method: 'POST',
    transform: data => data.map(/* transform data */),
  },
};

<ReportBuilder dataSources={dataSource} />;
```

### Custom Data Fetching

```jsx
const fetchData = async (source, filters) => {
  const response = await fetch(`/api/data/${source}`, {
    method: 'POST',
    body: JSON.stringify({ filters }),
  });
  return response.json();
};

<ReportBuilder fetchData={fetchData} />;
```

## Export Options

### PDF Export

```jsx
const handleExport = async (format, state) => {
  if (format === 'pdf') {
    const pdf = await generatePDF(state);
    // Handle PDF file
  }
};
```

### Excel Export

```jsx
const handleExport = async (format, state) => {
  if (format === 'excel') {
    const excel = await generateExcel(state);
    // Handle Excel file
  }
};
```

## Examples

See the `example/pages/report-builder-example.js` file for a complete implementation example.

## Development

### Running the Example

```bash
npm install
npm run dev
```

Visit `http://localhost:3000/report-builder-example` to see the example in action.

### Testing

```bash
npm test
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
