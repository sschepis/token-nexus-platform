/**
 * Table Component
 * Renders data tables with sorting, filtering, and pagination
 */

import React, { useMemo } from 'react';
import {
  useTable,
  useSortBy,
  useFilters,
  usePagination,
  useResizeColumns,
  useFlexLayout,
} from 'react-table';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  TextField,
  Typography,
  Paper,
  IconButton,
  CircularProgress,
} from '@mui/material';
import {
  KeyboardArrowUp as SortAscIcon,
  KeyboardArrowDown as SortDescIcon,
  FilterList as FilterIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';

// Default filter component
const DefaultColumnFilter = ({ column: { filterValue, setFilter, Header } }) => {
  return (
    <TextField
      size="small"
      value={filterValue || ''}
      onChange={e => setFilter(e.target.value || undefined)}
      placeholder={`Filter ${Header}`}
      sx={{ mt: 1 }}
    />
  );
};

export const TableComponent = ({
  title,
  columns: userColumns,
  dataSource,
  pagination = true,
  sortable = true,
  filterable = true,
  pageSize: initialPageSize = 10,
  filters = {},
  onDataLoad,
  className,
}) => {
  // Fetch data using react-query
  const { data, isLoading, error } = useQuery(
    ['tableData', dataSource, filters],
    async () => {
      const response = await fetch(`/api/data/${dataSource}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ filters }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch table data');
      }

      const data = await response.json();
      onDataLoad?.(data);
      return data;
    },
    {
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );

  // Prepare columns configuration
  const columns = useMemo(
    () =>
      userColumns.map(column => ({
        ...column,
        Filter: filterable ? DefaultColumnFilter : undefined,
        // Add custom cell renderers based on data type
        Cell:
          column.Cell ||
          (props => {
            const value = props.value;
            if (value === null || value === undefined) return '-';
            if (typeof value === 'boolean') return value ? 'Yes' : 'No';
            if (typeof value === 'object') return JSON.stringify(value);
            return value;
          }),
      })),
    [userColumns, filterable]
  );

  // Initialize react-table instance
  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    page,
    prepareRow,
    state: { pageIndex, pageSize },
    gotoPage,
    setPageSize,
    rows,
  } = useTable(
    {
      columns,
      data: data || [],
      initialState: { pageSize: initialPageSize },
    },
    useFilters,
    useSortBy,
    usePagination,
    useResizeColumns,
    useFlexLayout
  );

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
      className={className}
      data-testid="table-component"
    >
      {/* Table Title */}
      {title && (
        <Typography variant="h6" component="h3" sx={{ p: 2 }}>
          {title}
        </Typography>
      )}

      {/* Table Content */}
      <Paper sx={{ flex: 1, overflow: 'auto' }}>
        {isLoading ? (
          <Box
            sx={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CircularProgress />
          </Box>
        ) : error ? (
          <Box
            sx={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'error.main',
            }}
          >
            <Typography>Error loading table data</Typography>
          </Box>
        ) : !data?.length ? (
          <Box
            sx={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'text.secondary',
            }}
          >
            <Typography>No data available</Typography>
          </Box>
        ) : (
          <Table {...getTableProps()} stickyHeader>
            <TableHead>
              {headerGroups.map(headerGroup => (
                <TableRow {...headerGroup.getHeaderGroupProps()}>
                  {headerGroup.headers.map(column => (
                    <TableCell
                      {...column.getHeaderProps(
                        sortable ? column.getSortByToggleProps() : undefined
                      )}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {column.render('Header')}
                        {sortable && column.isSorted && (
                          <TableSortLabel
                            active={column.isSorted}
                            direction={column.isSortedDesc ? 'desc' : 'asc'}
                            IconComponent={column.isSortedDesc ? SortDescIcon : SortAscIcon}
                          />
                        )}
                        {filterable && (
                          <IconButton
                            size="small"
                            onClick={() => column.setFilter(column.filterValue ? undefined : '')}
                          >
                            {column.filterValue ? (
                              <ClearIcon fontSize="small" />
                            ) : (
                              <FilterIcon fontSize="small" />
                            )}
                          </IconButton>
                        )}
                      </Box>
                      {filterable && column.canFilter && column.render('Filter')}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableHead>
            <TableBody {...getTableBodyProps()}>
              {page.map(row => {
                prepareRow(row);
                return (
                  <TableRow {...row.getRowProps()}>
                    {row.cells.map(cell => (
                      <TableCell {...cell.getCellProps()}>{cell.render('Cell')}</TableCell>
                    ))}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Paper>

      {/* Pagination */}
      {pagination && data?.length > 0 && (
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={rows.length}
          rowsPerPage={pageSize}
          page={pageIndex}
          onPageChange={(_, newPage) => gotoPage(newPage)}
          onRowsPerPageChange={e => setPageSize(Number(e.target.value))}
        />
      )}
    </Box>
  );
};

TableComponent.defaultProps = {
  pagination: true,
  sortable: true,
  filterable: true,
  pageSize: 10,
  filters: {},
};
