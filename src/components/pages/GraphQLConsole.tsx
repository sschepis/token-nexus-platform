
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Code } from "lucide-react";
import { cn } from "@/lib/utils";

const GraphQLConsole = () => {
  const { toast } = useToast();
  const [query, setQuery] = useState(`query {
  hero {
    name
    friends {
      name
    }
  }
}`);
  const [variables, setVariables] = useState("{}");
  const [headers, setHeaders] = useState("{\n  \"Authorization\": \"Bearer YOUR_TOKEN\"\n}");
  const [endpoint, setEndpoint] = useState("https://api.example.com/graphql");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  
  const handleExecute = async () => {
    setLoading(true);
    setResponse("");
    
    try {
      let parsedHeaders = {};
      try {
        parsedHeaders = JSON.parse(headers);
      } catch (e) {
        toast({
          title: "Invalid headers format",
          description: "Please enter valid JSON for headers",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
      
      let parsedVariables = {};
      try {
        parsedVariables = variables ? JSON.parse(variables) : {};
      } catch (e) {
        toast({
          title: "Invalid variables format",
          description: "Please enter valid JSON for variables",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
      
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...parsedHeaders,
        },
        body: JSON.stringify({
          query,
          variables: parsedVariables,
        }),
      });
      
      const data = await response.json();
      setResponse(JSON.stringify(data, null, 2));
      
      toast({
        title: "Query executed",
        description: `Received ${Object.keys(data).length} keys in response`,
      });
    } catch (error) {
      console.error("GraphQL query error:", error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      setResponse(JSON.stringify({ error: errorMessage }, null, 2));
      
      toast({
        title: "Error executing query",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">GraphQL Console</h1>
            <p className="text-muted-foreground mt-2">
              Execute GraphQL queries and explore responses
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Endpoint Configuration</CardTitle>
                <CardDescription>
                  Set the GraphQL endpoint URL
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <label htmlFor="endpoint" className="text-sm font-medium">
                    GraphQL Endpoint
                  </label>
                  <input
                    id="endpoint"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={endpoint}
                    onChange={(e) => setEndpoint(e.target.value)}
                    placeholder="https://api.example.com/graphql"
                  />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>GraphQL Query</CardTitle>
                <CardDescription>
                  Write your query or mutation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  className="font-mono h-64"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Enter your GraphQL query..."
                />
              </CardContent>
            </Card>
            
            <Tabs defaultValue="variables">
              <TabsList>
                <TabsTrigger value="variables">Variables</TabsTrigger>
                <TabsTrigger value="headers">Headers</TabsTrigger>
              </TabsList>
              
              <TabsContent value="variables" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Query Variables</CardTitle>
                    <CardDescription>
                      Enter variables as JSON
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      className="font-mono h-32"
                      value={variables}
                      onChange={(e) => setVariables(e.target.value)}
                      placeholder='{"id": "1234", "limit": 10}'
                    />
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="headers" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>HTTP Headers</CardTitle>
                    <CardDescription>
                      Enter headers as JSON
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      className="font-mono h-32"
                      value={headers}
                      onChange={(e) => setHeaders(e.target.value)}
                      placeholder='{"Authorization": "Bearer token"}'
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
            
            <Button 
              onClick={handleExecute} 
              className="w-full" 
              disabled={loading}
            >
              <Code className="h-4 w-4 mr-2" />
              {loading ? "Executing..." : "Execute Query"}
            </Button>
          </div>
          
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Response</CardTitle>
              <CardDescription>
                GraphQL query response
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div 
                className={cn(
                  "font-mono p-4 rounded-md whitespace-pre-wrap overflow-auto bg-muted h-[600px]",
                  !response && "flex items-center justify-center text-muted-foreground"
                )}
              >
                {response || "Response will appear here after execution"}
              </div>
            </CardContent>
          </Card>
        </div>
    </div>
  );
};

export default GraphQLConsole;
