import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Database, Table as TableIcon, Plus, AlertCircle } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { usePermission } from "@/hooks/usePermission";
import { usePageController } from "@/hooks/usePageController";
import { DevToolsWrapper } from "@/components/dev/DevToolsWrapper";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Mock database tables for the UI
const mockTables = [
  { name: "users", count: 126 },
  { name: "organizations", count: 14 },
  { name: "products", count: 57 },
  { name: "orders", count: 312 },
  { name: "payments", count: 289 },
  { name: "audit_logs", count: 1532 },
];

interface ColumnDefinition {
  name: string;
  type: string;
  nullable: boolean;
  isPrimary: boolean;
}

interface TableDefinition {
  name: string;
  columns: ColumnDefinition[];
}

const mockTableDefinition: TableDefinition = {
  name: "users",
  columns: [
    { name: "id", type: "uuid", nullable: false, isPrimary: true },
    { name: "email", type: "varchar", nullable: false, isPrimary: false },
    { name: "first_name", type: "varchar", nullable: true, isPrimary: false },
    { name: "last_name", type: "varchar", nullable: true, isPrimary: false },
    { name: "created_at", type: "timestamp", nullable: false, isPrimary: false },
    { name: "updated_at", type: "timestamp", nullable: false, isPrimary: false },
    { name: "last_login", type: "timestamp", nullable: true, isPrimary: false },
    { name: "is_active", type: "boolean", nullable: false, isPrimary: false },
  ]
};

// Mock table data
const mockData = [
  {
    id: "d5b640e2-547e-4252-a9a9-91ddc510c53f",
    email: "john@example.com",
    first_name: "John",
    last_name: "Doe",
    created_at: "2023-01-15T08:30:00Z",
    updated_at: "2023-04-20T14:22:10Z",
    last_login: "2023-04-20T14:22:10Z",
    is_active: true
  },
  {
    id: "7a9e4b1c-8f2d-4e6a-b3c5-1d2e9f7a8b3c",
    email: "jane@example.com",
    first_name: "Jane",
    last_name: "Smith",
    created_at: "2023-02-10T11:45:00Z",
    updated_at: "2023-04-18T09:15:22Z",
    last_login: "2023-04-18T09:15:22Z",
    is_active: true
  },
  {
    id: "c3b2a1f9-e8d7-4c6b-a5f4-3e2d1c0b9a8",
    email: "bob@example.com",
    first_name: "Bob",
    last_name: "Johnson",
    created_at: "2023-03-05T15:20:00Z",
    updated_at: "2023-04-15T16:30:45Z",
    last_login: "2023-04-15T16:30:45Z",
    is_active: true
  }
];

const DatabaseExplorerPage = () => {
  const { toast } = useToast();
  const { hasPermission } = usePermission();
  const [selectedTable, setSelectedTable] = useState<string | null>("users");
  const [query, setQuery] = useState(`SELECT * FROM users LIMIT 100;`);
  const [queryResults, setQueryResults] = useState<Record<string, unknown>[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("browse");
  const [error, setError] = useState<string | null>(null);

  // Permission checks
  const canRead = hasPermission('dev:read');
  const canWrite = hasPermission('dev:write');
  const canExecute = hasPermission('dev:execute');

  // Initialize page controller
  const pageController = usePageController({
    pageId: 'database-explorer',
    pageName: 'Database Explorer',
    description: 'Browse database tables and run SQL queries',
    category: 'development',
    permissions: ['dev:read', 'dev:write', 'dev:execute'],
    tags: ['database', 'sql', 'development', 'debugging']
  });

  const handleSelectTable = (tableName: string) => {
    setSelectedTable(tableName);
    setQuery(`SELECT * FROM ${tableName} LIMIT 100;`);
    
    if (tableName === "users") {
      setQueryResults(mockData);
    } else {
      setQueryResults([]);
    }
    setActiveTab("browse"); // Switch to browse tab when a new table is selected
  };

  const handleExecuteQuery = () => {
    if (!canExecute) {
      toast({
        title: "Permission denied",
        description: "You don't have permission to execute database queries",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setError(null);
    
    setTimeout(() => {
      try {
        if (query.toLowerCase().includes("select") && query.toLowerCase().includes("from users")) {
          setQueryResults(mockData);
          toast({
            title: "Query executed",
            description: "Query executed successfully",
          });
        } else if (query.toLowerCase().includes("select")) {
          setQueryResults([]); // For other select queries, return empty for mock
          toast({
            title: "Query executed",
            description: "Query executed (mock response: no results for non-user tables)",
          });
        }
         else {
          setQueryResults(null); // For non-select queries, clear results
          toast({
            title: "Query executed",
            description: "Unsupported query type for mock explorer or no results.",
          });
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        setError(errorMessage);
        toast({
          title: "Query failed",
          description: `Failed to execute query: ${errorMessage}`,
          variant: "destructive",
        });
        setQueryResults(null);
      } finally {
        setIsLoading(false);
      }
    }, 700);
  };

  const renderBrowseTabContent = () => {
    if (!selectedTable) return <p className="text-muted-foreground p-4">Select a table to browse its data.</p>;
    if (!queryResults) return <p className="text-muted-foreground p-4">Execute a query or select a table to view data.</p>;
    
    return (
      <div>
        {queryResults.length > 0 ? (
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  {Object.keys(queryResults[0]).map((key) => (
                    <TableHead key={key}>{key}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {queryResults.map((row, rowIndex) => (
                  <TableRow key={rowIndex}>
                    {Object.values(row).map((value, cellIndex) => (
                      <TableCell key={cellIndex}>
                        {typeof value === "boolean" 
                          ? value ? "true" : "false" 
                          : String(value)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        ) : (
          <div className="flex flex-col items-center justify-center h-[400px]">
            <p className="text-muted-foreground mb-4">No data to display for {selectedTable}.</p>
          </div>
        )}
      </div>
    );
  };

  const renderStructureTabContent = () => {
    if (!selectedTable) return <p className="text-muted-foreground p-4">Select a table to view its structure.</p>;
    // For simplicity, always show 'users' structure. In a real app, fetch this.
    const currentTableDef = selectedTable === "users" ? mockTableDefinition : { name: selectedTable, columns: []};

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Column</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Nullable</TableHead>
            <TableHead>Key</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {currentTableDef.columns.map((column) => (
            <TableRow key={column.name}>
              <TableCell>{column.name}</TableCell>
              <TableCell>{column.type}</TableCell>
              <TableCell>{column.nullable ? "YES" : "NO"}</TableCell>
              <TableCell>
                {column.isPrimary ? "Primary" : ""}
              </TableCell>
            </TableRow>
          ))}
           {currentTableDef.columns.length === 0 && (
            <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No structure information for this table (mock).</TableCell></TableRow>
          )}
        </TableBody>
      </Table>
    );
  };

  const renderSqlTabContent = () => {
    return (
      <div className="space-y-4">
        <div>
          <Label htmlFor="query">SQL Query</Label>
          <Textarea
            id="query"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="font-mono text-sm"
            rows={6}
          />
        </div>
        <Button onClick={handleExecuteQuery} disabled={isLoading || !canExecute}>
          {isLoading ? "Executing..." : "Execute Query"}
        </Button>
        {!canExecute && (
          <p className="text-sm text-muted-foreground mt-2">
            You need execute permissions to run database queries
          </p>
        )}
        
        {queryResults && (
          <div className="border rounded-md mt-4">
            <div className="bg-muted px-4 py-2 font-medium border-b">
              Results
            </div>
            <ScrollArea className="h-[300px]">
              <Table>
                {queryResults.length > 0 && queryResults[0] ? ( // Added check for queryResults[0]
                  <>
                    <TableHeader>
                      <TableRow>
                        {Object.keys(queryResults[0]).map((key) => (
                          <TableHead key={key}>{key}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {queryResults.map((row, rowIndex) => (
                        <TableRow key={rowIndex}>
                          {Object.values(row).map((value, cellIndex) => (
                            <TableCell key={cellIndex}>
                              {typeof value === "boolean" 
                                ? value ? "true" : "false" 
                                : String(value)}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </>
                ) : (
                   <TableBody>
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No results found or query did not return data.
                      </TableCell>
                    </TableRow>
                  </TableBody>
                )}
              </Table>
            </ScrollArea>
          </div>
        )}
      </div>
    );
  };

  // Show permission error if user can't read dev tools
  if (!canRead) {
    return (
      <DevToolsWrapper toolName="Database Explorer">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Database Explorer</h1>
            <p className="text-muted-foreground">
              Browse database tables and run SQL queries.
            </p>
          </div>
          
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You don't have permission to access development tools. Please contact your administrator.
            </AlertDescription>
          </Alert>
        </div>
      </DevToolsWrapper>
    );
  }

  return (
    <DevToolsWrapper toolName="Database Explorer">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Database Explorer</h1>
          <p className="text-muted-foreground">
            Browse database tables and run SQL queries.
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 md:col-span-3">
            <Card className="h-full">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center">
                  <Database className="mr-2 h-5 w-5" />
                  Tables
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[calc(100vh-250px)]"> {/* Adjust height as needed */}
                  <ul className="space-y-1">
                    {mockTables.map((table) => (
                      <li key={table.name}>
                        <Button
                          variant={selectedTable === table.name ? "secondary" : "ghost"}
                          className="w-full justify-start text-sm font-normal"
                          onClick={() => handleSelectTable(table.name)}
                        >
                          <TableIcon className="mr-2 h-4 w-4" />
                          {table.name}
                          <span className="ml-auto text-xs text-muted-foreground">
                            {table.count}
                          </span>
                        </Button>
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          <div className="col-span-12 md:col-span-9">
            {selectedTable ? (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-center">
                    <CardTitle>Table: {selectedTable}</CardTitle>
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                      <TabsList>
                        <TabsTrigger value="browse">Browse</TabsTrigger>
                        <TabsTrigger value="structure">Structure</TabsTrigger>
                        <TabsTrigger value="sql">SQL Query</TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Conditional rendering based on activeTab */}
                  {activeTab === "browse" && renderBrowseTabContent()}
                  {activeTab === "structure" && renderStructureTabContent()}
                  {activeTab === "sql" && renderSqlTabContent()}
                </CardContent>
              </Card>
            ) : (
              <Card className="h-full flex items-center justify-center">
                <p className="text-muted-foreground">Select a table from the list to explore.</p>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DevToolsWrapper>
  );
};

export default DatabaseExplorerPage;