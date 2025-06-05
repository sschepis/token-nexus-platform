import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { FileJson } from "lucide-react";
import { toast } from "sonner";
import { DevToolsWrapper } from "@/components/dev/DevToolsWrapper";

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

interface ApiResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  data: unknown; // Changed from any
  time: number;
}

interface ApiFormData {
  url: string;
  method: HttpMethod;
  headers: string;
  body: string;
}

const ApiTestingPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("request");
  const [response, setResponse] = useState<ApiResponse | null>(null);
  const [responseTab, setResponseTab] = useState("body");
  
  const { register, handleSubmit, watch, setValue } = useForm<ApiFormData>({ // Added ApiFormData type
    defaultValues: {
      url: "https://jsonplaceholder.typicode.com/todos/1",
      method: "GET" as HttpMethod,
      headers: '{\n  "Content-Type": "application/json"\n}',
      body: '{\n  "title": "foo",\n  "body": "bar",\n  "userId": 1\n}',
    },
  });

  const method = watch("method");
  const showBody = method !== "GET" && method !== "DELETE";

  const onSubmit = async (data: ApiFormData) => { // Changed type to ApiFormData
    setIsLoading(true);
    const startTime = performance.now();
    
    try {
      let parsedHeaders = {};
      try {
        if (data.headers.trim() !== "") { // Ensure headers are not empty before parsing
          parsedHeaders = JSON.parse(data.headers);
        }
      } catch (e) {
        toast.error("Invalid JSON in headers");
        setIsLoading(false);
        return;
      }
      
      const options: RequestInit = {
        method: data.method,
        headers: parsedHeaders, // Use parsedHeaders
      };
      
      if (showBody && data.body && data.body.trim() !== "") { // Ensure body is not empty
        try {
          // Try to parse as JSON, if fails, send as text
          options.body = JSON.stringify(JSON.parse(data.body));
        } catch (e) {
          options.body = data.body; // Send as plain text if not valid JSON
        }
      }
      
      const res = await fetch(data.url, options);
      const responseHeaders: Record<string, string> = {};
      
      res.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });
      
      let responseData;
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        responseData = await res.json();
      } else {
        responseData = await res.text();
      }
      
      const endTime = performance.now();
      
      setResponse({
        status: res.status,
        statusText: res.statusText,
        headers: responseHeaders,
        data: responseData,
        time: Math.round(endTime - startTime),
      });
      
      setActiveTab("response");
      
      toast.success(`Request completed with status ${res.status}`);
    } catch (error: unknown) { // Changed type to unknown
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      toast.error(`Request failed: ${errorMessage}`);
      
      let errorStatus = 500;
      let errorStatusText = "Client Error";

      if (typeof error === 'object' && error !== null) {
        if ('status' in error && typeof (error as {status: unknown}).status === 'number') {
          errorStatus = (error as {status: number}).status;
        }
        if ('statusText' in error && typeof (error as {statusText: unknown}).statusText === 'string') {
          errorStatusText = (error as {statusText: string}).statusText;
        }
      }
      
      setResponse({ // Set some error response structure
        status: errorStatus,
        statusText: errorStatusText,
        headers: {},
        data: { error: errorMessage, details: String(error) },
        time: Math.round(performance.now() - startTime),
      });
      setActiveTab("response");
    } finally {
      setIsLoading(false);
    }
  };

  const formatJson = (json: unknown): string => { // Changed type to unknown, added return type
    try {
      if (typeof json === "string") {
        // If it's already a string, try to parse and re-stringify for formatting
        // If parsing fails, return the original string (it might be non-JSON text)
        try {
          return JSON.stringify(JSON.parse(json), null, 2);
        } catch {
          return json; 
        }
      }
      return JSON.stringify(json, null, 2);
    } catch (e) {
      // If stringifying fails (e.g., circular refs, though less likely for typical API responses)
      return String(json);
    }
  };

  return (
    <DevToolsWrapper toolName="API Testing">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">API Testing</h1>
            <p className="text-muted-foreground">
              Test API endpoints and view responses.
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="request">Request</TabsTrigger>
            <TabsTrigger value="response" disabled={!response}>
              Response {response && `(${response.status})`}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="request" className="space-y-4">
            <form onSubmit={handleSubmit(onSubmit)}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileJson className="h-5 w-5" />
                    API Request
                  </CardTitle>
                  <CardDescription>
                    Configure and send API requests to test endpoints.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-4">
                    <div className="w-[150px]">
                      <Label htmlFor="method">Method</Label>
                      <Select
                        defaultValue="GET"
                        onValueChange={(value) => setValue("method", value as HttpMethod)} // Use setValue for react-hook-form
                        value={method} // Control Select with watch value
                      >
                        <SelectTrigger id="method"> {/* Added id */}
                          <SelectValue placeholder="GET" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="GET">GET</SelectItem>
                          <SelectItem value="POST">POST</SelectItem>
                          <SelectItem value="PUT">PUT</SelectItem>
                          <SelectItem value="DELETE">DELETE</SelectItem>
                          <SelectItem value="PATCH">PATCH</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex-1">
                      <Label htmlFor="url">URL</Label>
                      <Input
                        id="url"
                        placeholder="https://api.example.com/endpoint"
                        {...register("url")}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="headers">Headers</Label>
                    <Textarea
                      id="headers"
                      placeholder="Enter headers as JSON"
                      className="font-mono text-sm"
                      rows={5}
                      {...register("headers")}
                    />
                  </div>
                  
                  {showBody && (
                    <div>
                      <Label htmlFor="body">Body</Label>
                      <Textarea
                        id="body"
                        placeholder="Enter request body as JSON or plain text"
                        className="font-mono text-sm"
                        rows={8}
                        {...register("body")}
                      />
                    </div>
                  )}
                  
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? "Sending..." : "Send Request"}
                  </Button>
                </CardContent>
              </Card>
            </form>
          </TabsContent>
          
          <TabsContent value="response" className="space-y-4">
            {response && (
              <Card>
                <CardHeader className="border-b">
                  <div className="flex justify-between items-center">
                    <CardTitle className="flex items-center gap-2">
                      Response
                      <span
                        className={`text-sm px-2 py-1 rounded ${
                          response.status >= 200 && response.status < 300
                            ? "bg-green-100 text-green-800"
                            : response.status >= 400
                            ? "bg-red-100 text-red-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {response.status} {response.statusText}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        ({response.time}ms)
                      </span>
                    </CardTitle>
                    
                    <Tabs value={responseTab} onValueChange={setResponseTab} className="w-auto">
                      <TabsList className="h-8">
                        <TabsTrigger value="body" className="text-xs px-3">Body</TabsTrigger>
                        <TabsTrigger value="headers" className="text-xs px-3">Headers</TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  {responseTab === "body" ? (
                    <pre className="bg-muted p-4 rounded-md overflow-auto text-sm font-mono">
                      {formatJson(response.data)}
                    </pre>
                  ) : (
                    <div className="space-y-2">
                      {Object.entries(response.headers).map(([key, value]) => (
                        <div key={key} className="flex border-b pb-1 last:border-0">
                          <span className="font-medium w-48 truncate">{key}:</span>
                          <span className="text-muted-foreground">{value}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DevToolsWrapper>
  );
};

export default ApiTestingPage;