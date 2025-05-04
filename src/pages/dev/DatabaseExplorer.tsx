import React, { useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Database, Table as TableIcon, Plus } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

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

const DatabaseExplorer = () => {
  const [selectedTable, setSelectedTable] = useState<string | null>("users");
  const [query, setQuery] = useState(`SELECT * FROM users LIMIT 100;`);
  const [queryResults, setQueryResults] = useState<any[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("browse");

  const handleSelectTable = (tableName: string) => {
    setSelectedTable(tableName);
    setQuery(`SELECT * FROM ${tableName} LIMIT 100;`);
    
    // In a real app, this would fetch the actual data
    if (tableName === "users") {
      setQueryResults(mockData);
    } else {
      setQueryResults([]);
    }
  };

  const handleExecuteQuery = () => {
    setIsLoading(true);
    
    // Simulate API request
    setTimeout(() => {
      try {
        // Very basic SQL query parsing - in a real app this would be handled by the backend
        if (query.toLowerCase().includes("select") && query.toLowerCase().includes("from users")) {
          setQueryResults(mockData);
          toast.success("Query executed successfully");
        } else {
          setQueryResults([]);
          toast.info("No results found or unsupported query");
        }
      } catch (error) {
        toast.error("Failed to execute query");
      } finally {
        setIsLoading(false);
      }
    }, 700);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Database Explorer</h1>
          <p className="text-muted-foreground">
            Browse database tables and run SQL queries.
          </p>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Sidebar with tables */}
          <div className="col-span-12 md:col-span-3">
            <Card className="h-full">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center">
                  <Database className="mr-2 h-5 w-5" />
                  Tables
                </CardTitle>
              </CardHeader>
              <CardContent>
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
              </CardContent>
            </Card>
          </div>

          {/* Main content area */}
          <div className="col-span-12 md:col-span-9">
            {selectedTable && (
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
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="hidden">
                    <TabsContent value="browse" className="mt-0">
                      {queryResults && queryResults.length > 0 ? (
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
                          <p className="text-muted-foreground mb-4">No data available</p>
                          <Button size="sm" onClick={() => handleSelectTable(selectedTable)}>
                            Load Data
                          </Button>
                        </div>
                      )}
                    </TabsContent>
                    
                    <TabsContent value="structure" className="mt-0">
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
                          {mockTableDefinition.columns.map((column) => (
                            <TableRow key={column.name}>
                              <TableCell>{column.name}</TableCell>
                              <TableCell>{column.type}</TableCell>
                              <TableCell>{column.nullable ? "YES" : "NO"}</TableCell>
                              <TableCell>
                                {column.isPrimary ? "Primary" : ""}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TabsContent>
                    
                    <TabsContent value="sql" className="mt-0 space-y-4">
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
                      <Button onClick={handleExecuteQuery} disabled={isLoading}>
                        {isLoading ? "Executing..." : "Execute Query"}
                      </Button>
                      
                      {queryResults && (
                        <div className="border rounded-md mt-4">
                          <div className="bg-muted px-4 py-2 font-medium border-b">
                            Results
                          </div>
                          <ScrollArea className="h-[300px]">
                            <Table>
                              {queryResults.length > 0 && (
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
                              )}
                              {queryResults.length === 0 && (
                                <TableBody>
                                  <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8">
                                      No results found
                                    </TableCell>
                                  </TableRow>
                                </TableBody>
                              )}
                            </Table>
                          </ScrollArea>
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                  
                  {activeTab === "browse" && (
                    <div>
                      {queryResults && queryResults.length > 0 ? (
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
                          <p className="text-muted-foreground mb-4">No data available</p>
                          <Button size="sm" onClick={() => handleSelectTable(selectedTable)}>
                            Load Data
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {activeTab === "structure" && (
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
                        {mockTableDefinition.columns.map((column) => (
                          <TableRow key={column.name}>
                            <TableCell>{column.name}</TableCell>
                            <TableCell>{column.type}</TableCell>
                            <TableCell>{column.nullable ? "YES" : "NO"}</TableCell>
                            <TableCell>
                              {column.isPrimary ? "Primary" : ""}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                  
                  {activeTab === "sql" && (
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
                      <Button onClick={handleExecuteQuery} disabled={isLoading}>
                        {isLoading ? "Executing..." : "Execute Query"}
                      </Button>
                      
                      {queryResults && (
                        <div className="border rounded-md mt-4">
                          <div className="bg-muted px-4 py-2 font-medium border-b">
                            Results
                          </div>
                          <ScrollArea className="h-[300px]">
                            <Table>
                              {queryResults.length > 0 && (
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
                              )}
                              {queryResults.length === 0 && (
                                <TableBody>
                                  <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8">
                                      No results found
                                    </TableCell>
                                  </TableRow>
                                </TableBody>
                              )}
                            </Table>
                          </ScrollArea>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default DatabaseExplorer;
