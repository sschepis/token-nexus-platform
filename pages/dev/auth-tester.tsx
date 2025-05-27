import React, { useState } from "react";
import { Key, Lock, Shield, User, UserCheck, UserX, RefreshCw, Check, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
interface TokenData {
  id: string;
  type: "basic" | "bearer" | "jwt" | "oauth2";
  value: string;
  expired: boolean;
  created: Date;
  expires?: Date;
}

interface AuthResult {
  id: string;
  timestamp: Date;
  endpoint: string;
  method: string;
  status: "success" | "error";
  message: string;
  headers?: Record<string, string>;
  responseTime: number;
}

const AuthTesterPage: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState<string>("token-tester");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [tokens, setTokens] = useState<TokenData[]>([
    {
      id: "token-1",
      type: "bearer",
      value: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      expired: false,
      created: new Date(Date.now() - 86400000),
      expires: new Date(Date.now() + 86400000)
    },
    {
      id: "token-2",
      type: "jwt",
      value: "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
      expired: false,
      created: new Date(Date.now() - 86400000 * 2),
      expires: new Date(Date.now() + 86400000 * 2)
    },
    {
      id: "token-3",
      type: "basic",
      value: "Basic dXNlcm5hbWU6cGFzc3dvcmQ=",
      expired: true,
      created: new Date(Date.now() - 86400000 * 10),
      expires: new Date(Date.now() - 86400000)
    }
  ]);
  const [results, setResults] = useState<AuthResult[]>([]);

  // Form states
  const [tokenType, setTokenType] = useState<string>("bearer");
  const [tokenValue, setTokenValue] = useState<string>("");
  const [endpoint, setEndpoint] = useState<string>("https://api.example.com/auth/test");
  const [method, setMethod] = useState<string>("GET");
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");

  const handleTestToken = () => {
    setIsLoading(true);
    
    setTimeout(() => {
      const success = Math.random() > 0.3;
      const responseTime = Math.floor(Math.random() * 500) + 100;
      
      const newResult: AuthResult = {
        id: `result-${results.length + 1}`,
        timestamp: new Date(),
        endpoint,
        method,
        status: success ? "success" : "error",
        message: success 
          ? "Authentication successful. Server returned 200 OK."
          : "Authentication failed. Server returned 401 Unauthorized.",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `${tokenType.charAt(0).toUpperCase() + tokenType.slice(1)} ${tokenValue.substring(0, 20)}...`
        },
        responseTime
      };
      
      setResults(prev => [newResult, ...prev]);
      toast[success ? "success" : "error"](newResult.message);
      setIsLoading(false);
    }, 1000);
  };

  const handleGenerateToken = () => {
    setIsLoading(true);
    
    setTimeout(() => {
      const mockToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
      const expiresDays = Math.floor(Math.random() * 10) + 1;
      
      const newToken: TokenData = {
        id: `token-${tokens.length + 1}`,
        type: tokenType as "basic" | "bearer" | "jwt" | "oauth2",
        value: tokenType === "basic" 
          ? `Basic ${typeof window !== 'undefined' ? btoa(`${username}:${password}`) : ''}` // Check for window
          : mockToken,
        expired: false,
        created: new Date(),
        expires: new Date(Date.now() + 86400000 * expiresDays)
      };
      
      setTokens(prev => [newToken, ...prev]);
      setTokenValue(newToken.value);
      toast.success("Token generated successfully");
      setIsLoading(false);
    }, 1000);
  };
  
  const handleRevokeToken = (tokenId: string) => {
    setTokens(prev => 
      prev.map(token => 
        token.id === tokenId ? { ...token, expired: true } : token
      )
    );
    toast.success("Token revoked successfully");
  };

  const handleClearResults = () => {
    setResults([]);
    toast.info("Test results cleared");
  };

  return (
    <div className="container py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Authentication Tester</h1>
        <Button variant="outline" onClick={handleClearResults} disabled={results.length === 0}>
          Clear Test Results
        </Button>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid grid-cols-2">
          <TabsTrigger value="token-tester">Token Tester</TabsTrigger>
          <TabsTrigger value="token-manager">Token Manager</TabsTrigger>
        </TabsList>
        
        <TabsContent value="token-tester">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Key className="h-5 w-5 mr-2" />
                  Test Authentication Token
                </CardTitle>
                <CardDescription>
                  Test API endpoints using different authentication methods
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="token-type">Token Type</Label>
                  <Select value={tokenType} onValueChange={setTokenType}>
                    <SelectTrigger id="token-type"> {/* Added id */}
                      <SelectValue placeholder="Select token type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basic">Basic Auth</SelectItem>
                      <SelectItem value="bearer">Bearer Token</SelectItem>
                      <SelectItem value="jwt">JWT Token</SelectItem>
                      <SelectItem value="oauth2">OAuth 2.0</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {tokenType === 'basic' ? (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="username">Username</Label>
                      <Input
                        id="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Enter username"
                      />
                    </div>
                    <div>
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter password"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <Label htmlFor="token-value">Token Value</Label>
                    <Input
                      id="token-value"
                      value={tokenValue}
                      onChange={(e) => setTokenValue(e.target.value)}
                      placeholder="Enter token value"
                    />
                  </div>
                )}

                <Separator />

                <div>
                  <Label htmlFor="endpoint">API Endpoint</Label>
                  <Input
                    id="endpoint"
                    value={endpoint}
                    onChange={(e) => setEndpoint(e.target.value)}
                    placeholder="https://api.example.com/auth"
                  />
                </div>

                <div>
                  <Label htmlFor="method">HTTP Method</Label>
                  <Select value={method} onValueChange={setMethod}>
                    <SelectTrigger id="method"> {/* Added id */}
                      <SelectValue placeholder="Select HTTP method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GET">GET</SelectItem>
                      <SelectItem value="POST">POST</SelectItem>
                      <SelectItem value="PUT">PUT</SelectItem>
                      <SelectItem value="DELETE">DELETE</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex space-x-2">
                  <Button
                    className="flex-1"
                    onClick={handleTestToken}
                    disabled={isLoading || (!tokenValue && tokenType !== 'basic') || (tokenType === 'basic' && (!username || !password))}
                  >
                    {isLoading && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
                    Test Authentication
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleGenerateToken}
                    disabled={isLoading || (tokenType === 'basic' && (!username || !password))}
                  >
                    Generate Token
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="h-5 w-5 mr-2" />
                  Test Results
                </CardTitle>
                <CardDescription>
                  Results from your authentication tests
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[400px]">
                  {results.length > 0 ? (
                    <div className="divide-y">
                      {results.map((result) => (
                        <div key={result.id} className="p-4 hover:bg-muted/20">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <span className="text-sm text-muted-foreground">
                                {result.timestamp.toLocaleString()}
                              </span>
                              <div className="font-medium">
                                {result.method} {result.endpoint}
                              </div>
                            </div>
                            <Badge variant={result.status === "success" ? "outline" : "destructive"}>
                              {result.status === "success" ? (
                                <Check className="h-3 w-3 mr-1" />
                              ) : (
                                <X className="h-3 w-3 mr-1" />
                              )}
                              {result.status.toUpperCase()}
                            </Badge>
                          </div>
                          <p className="text-sm">{result.message}</p>
                          <div className="text-xs text-muted-foreground mt-1">
                            Response time: {result.responseTime}ms
                          </div>
                          {result.headers && (
                            <div className="mt-2 text-xs bg-muted p-2 rounded">
                              <div className="font-medium mb-1">Headers:</div>
                              {Object.entries(result.headers).map(([key, value]) => (
                                <div key={key} className="flex">
                                  <span className="font-medium mr-1">{key}:</span> {value}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-muted-foreground">
                      No test results yet. Run a test to see results here.
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="token-manager">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Lock className="h-5 w-5 mr-2" />
                Authentication Tokens
              </CardTitle>
              <CardDescription>
                Manage your authentication tokens
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                {tokens.length > 0 ? (
                  <div className="divide-y">
                    {tokens.map((token) => (
                      <div key={token.id} className="p-4 hover:bg-muted/20">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="flex items-center">
                              <Badge className="mr-2" variant={token.expired ? "outline" : "default"}>
                                {token.type.toUpperCase()}
                              </Badge>
                              {token.expired ? (
                                <UserX className="h-4 w-4 text-destructive mr-1" />
                              ) : (
                                <UserCheck className="h-4 w-4 text-green-500 mr-1" />
                              )}
                              <span className={`${token.expired ? "text-muted-foreground" : ""}`}>
                                {token.expired ? "Expired" : "Active"}
                              </span>
                            </div>
                            <div className="mt-1 text-xs text-muted-foreground">
                              Created: {token.created.toLocaleString()}
                            </div>
                            {token.expires && (
                              <div className="text-xs text-muted-foreground">
                                Expires: {token.expires.toLocaleString()}
                              </div>
                            )}
                          </div>
                          <div className="flex">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setTokenValue(token.value)}
                            >
                              Use
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleRevokeToken(token.id)}
                              disabled={token.expired}
                            >
                              Revoke
                            </Button>
                          </div>
                        </div>
                        <div className="font-mono text-xs bg-muted p-2 rounded truncate">
                          {token.value}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-muted-foreground">
                    No tokens available. Generate a token to see it here.
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AuthTesterPage;