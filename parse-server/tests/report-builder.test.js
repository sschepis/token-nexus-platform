/**
 * Report Builder Tests
 * Tests the visual report builder components and functionality
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReportBuilder } from '../src/components/ReportBuilder';
import { ChartComponent } from '../src/components/ChartComponent';
import { TableComponent } from '../src/components/TableComponent';
import { QueryBuilder } from '../src/components/QueryBuilder';
import { ExportService } from '../src/services/ExportService';

describe('Report Builder', () => {
  const mockConfig = {
    components: {
      charts: true,
      tables: true,
      filters: true,
    },
    theme: 'light',
    export: ['pdf', 'excel'],
  };

  const mockData = {
    chartData: [
      { name: 'Jan', value: 100 },
      { name: 'Feb', value: 200 },
      { name: 'Mar', value: 300 },
    ],
    tableData: [
      { id: 1, name: 'Item 1', value: 100 },
      { id: 2, name: 'Item 2', value: 200 },
    ],
  };

  beforeEach(() => {
    // Mock API calls
    global.fetch = jest.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve(mockData),
      })
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    test('should render report builder with toolbox', () => {
      render(<ReportBuilder config={mockConfig} />);

      expect(screen.getByTestId('report-toolbox')).toBeInTheDocument();
      expect(screen.getByTestId('report-canvas')).toBeInTheDocument();
      expect(screen.getByTestId('properties-panel')).toBeInTheDocument();
    });

    test('should render available components based on config', () => {
      render(<ReportBuilder config={mockConfig} />);

      expect(screen.getByTestId('chart-tool')).toBeInTheDocument();
      expect(screen.getByTestId('table-tool')).toBeInTheDocument();
      expect(screen.getByTestId('filter-tool')).toBeInTheDocument();
    });

    test('should not render disabled components', () => {
      const disabledConfig = {
        ...mockConfig,
        components: {
          ...mockConfig.components,
          charts: false,
        },
      };

      render(<ReportBuilder config={disabledConfig} />);

      expect(screen.queryByTestId('chart-tool')).not.toBeInTheDocument();
    });
  });

  describe('Drag and Drop Functionality', () => {
    test('should allow dragging components to canvas', async () => {
      render(<ReportBuilder config={mockConfig} />);

      const chartTool = screen.getByTestId('chart-tool');
      const canvas = screen.getByTestId('report-canvas');

      fireEvent.dragStart(chartTool);
      fireEvent.drop(canvas);

      await waitFor(() => {
        expect(screen.getByTestId('chart-component')).toBeInTheDocument();
      });
    });

    test('should allow resizing components', async () => {
      render(<ReportBuilder config={mockConfig} />);

      // Add component to canvas
      const chartTool = screen.getByTestId('chart-tool');
      const canvas = screen.getByTestId('report-canvas');

      fireEvent.dragStart(chartTool);
      fireEvent.drop(canvas);

      const resizeHandle = screen.getByTestId('resize-handle');

      // Simulate resize
      fireEvent.mouseDown(resizeHandle);
      fireEvent.mouseMove(resizeHandle, { clientX: 100, clientY: 100 });
      fireEvent.mouseUp(resizeHandle);

      const component = screen.getByTestId('chart-component');
      expect(component).toHaveStyle({ width: '100px', height: '100px' });
    });
  });

  describe('Chart Component', () => {
    test('should render chart with provided data', async () => {
      const chartConfig = {
        type: 'line',
        xAxis: 'name',
        yAxis: 'value',
      };

      render(<ChartComponent data={mockData.chartData} config={chartConfig} />);

      expect(screen.getByTestId('chart')).toBeInTheDocument();
      expect(screen.getByText('Jan')).toBeInTheDocument();
      expect(screen.getByText('300')).toBeInTheDocument();
    });

    test('should update chart when data changes', async () => {
      const chartConfig = {
        type: 'line',
        xAxis: 'name',
        yAxis: 'value',
      };

      const { rerender } = render(
        <ChartComponent data={mockData.chartData} config={chartConfig} />
      );

      const newData = [...mockData.chartData, { name: 'Apr', value: 400 }];

      rerender(<ChartComponent data={newData} config={chartConfig} />);

      expect(screen.getByText('Apr')).toBeInTheDocument();
      expect(screen.getByText('400')).toBeInTheDocument();
    });
  });

  describe('Table Component', () => {
    test('should render table with provided data', () => {
      const columns = [
        { Header: 'Name', accessor: 'name' },
        { Header: 'Value', accessor: 'value' },
      ];

      render(<TableComponent columns={columns} data={mockData.tableData} />);

      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('200')).toBeInTheDocument();
    });

    test('should support sorting', async () => {
      const columns = [
        { Header: 'Name', accessor: 'name' },
        { Header: 'Value', accessor: 'value' },
      ];

      render(<TableComponent columns={columns} data={mockData.tableData} />);

      const valueHeader = screen.getByText('Value');
      fireEvent.click(valueHeader);

      const cells = screen.getAllByRole('cell');
      expect(cells[1]).toHaveTextContent('200');
    });
  });

  describe('Query Builder', () => {
    test('should fetch data based on query configuration', async () => {
      const queryConfig = {
        source: 'sales',
        filters: {
          date: '2023',
          category: 'electronics',
        },
      };

      render(<QueryBuilder config={queryConfig} />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/data',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify(queryConfig),
          })
        );
      });
    });

    test('should handle loading state', () => {
      const queryConfig = {
        source: 'sales',
        filters: {},
      };

      render(<QueryBuilder config={queryConfig} />);

      expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
    });

    test('should handle error state', async () => {
      global.fetch = jest.fn(() => Promise.reject('API Error'));

      const queryConfig = {
        source: 'sales',
        filters: {},
      };

      render(<QueryBuilder config={queryConfig} />);

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toBeInTheDocument();
      });
    });
  });

  describe('Export Functionality', () => {
    test('should export to PDF', async () => {
      const mockExportToPDF = jest.spyOn(ExportService, 'exportToPDF');

      render(<ReportBuilder config={mockConfig} />);

      const exportButton = screen.getByTestId('export-pdf');
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(mockExportToPDF).toHaveBeenCalled();
      });
    });

    test('should export to Excel', async () => {
      const mockExportToExcel = jest.spyOn(ExportService, 'exportToExcel');

      render(<ReportBuilder config={mockConfig} />);

      const exportButton = screen.getByTestId('export-excel');
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(mockExportToExcel).toHaveBeenCalled();
      });
    });
  });

  describe('State Management', () => {
    test('should save report state', async () => {
      const handleSave = jest.fn();

      render(<ReportBuilder config={mockConfig} onSave={handleSave} />);

      // Add components and configure
      const chartTool = screen.getByTestId('chart-tool');
      const canvas = screen.getByTestId('report-canvas');

      fireEvent.dragStart(chartTool);
      fireEvent.drop(canvas);

      const saveButton = screen.getByTestId('save-button');
      fireEvent.click(saveButton);

      expect(handleSave).toHaveBeenCalledWith(
        expect.objectContaining({
          components: expect.any(Array),
          layout: expect.any(Object),
        })
      );
    });

    test('should load saved report state', async () => {
      const savedState = {
        components: [
          {
            id: 'chart1',
            type: 'chart',
            config: { type: 'line' },
          },
        ],
        layout: {
          chart1: { x: 0, y: 0, w: 6, h: 4 },
        },
      };

      render(<ReportBuilder config={mockConfig} initialState={savedState} />);

      await waitFor(() => {
        expect(screen.getByTestId('chart-component')).toBeInTheDocument();
      });
    });
  });

  describe('Responsive Layout', () => {
    test('should adjust layout for different screen sizes', () => {
      const { container } = render(<ReportBuilder config={mockConfig} />);

      // Simulate resize to tablet
      window.innerWidth = 768;
      fireEvent(window, new Event('resize'));

      expect(container.querySelector('.layout')).toHaveStyle({
        maxWidth: '768px',
      });

      // Simulate resize to mobile
      window.innerWidth = 375;
      fireEvent(window, new Event('resize'));

      expect(container.querySelector('.layout')).toHaveStyle({
        maxWidth: '375px',
      });
    });
  });
});
