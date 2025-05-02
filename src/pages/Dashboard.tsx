
import React, { useEffect, useState } from "react";
import { useAppSelector } from "@/store/hooks";
import { mockApis } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import AppLayout from "@/components/layout/AppLayout";
import { ChevronUp, ChevronDown, DollarSign, Users, RefreshCcw, Clock } from "lucide-react";
import { Token } from "@/store/slices/tokenSlice";

const Dashboard = () => {
  const { user } = useAppSelector((state) => state.auth);
  const { currentOrg } = useAppSelector((state) => state.org);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await mockApis.getTokens();
        setTokens(response.data.tokens);
      } catch (error) {
        console.error("Failed to fetch tokens:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Calculate metrics
  const totalTokens = tokens.length;
  const confirmedTokens = tokens.filter(token => token.status === 'confirmed').length;
  const pendingTokens = tokens.filter(token => token.status === 'pending').length;
  const totalSupply = tokens.reduce((sum, token) => sum + token.supply, 0);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome back, {user?.firstName}</h1>
          <p className="text-muted-foreground mt-2">
            Here's an overview of your {currentOrg?.name} organization
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Tokens</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{isLoading ? '...' : totalTokens}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {confirmedTokens} confirmed, {pendingTokens} pending
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Supply</CardTitle>
              <RefreshCcw className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{isLoading ? '...' : totalSupply.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Across {totalTokens} assets
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">3</div>
              <div className="flex items-center text-xs text-green-500 mt-1">
                <ChevronUp className="h-3 w-3" />
                <span>12% from last month</span>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">12</div>
              <div className="flex items-center text-xs text-red-500 mt-1">
                <ChevronDown className="h-3 w-3" />
                <span>3% from last week</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="col-span-2">
            <CardHeader>
              <CardTitle>Recent Tokens</CardTitle>
              <CardDescription>
                Latest tokens created in your organization
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="animate-pulse space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-10 bg-muted rounded"></div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {tokens.slice(0, 5).map((token) => (
                    <div key={token.id} className="flex items-center gap-4 py-2">
                      <div className="rounded-full w-10 h-10 bg-primary/10 flex items-center justify-center">
                        <span className="font-semibold text-primary">{token.symbol?.[0] || token.name[0]}</span>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium">{token.name}</h4>
                        <p className="text-sm text-muted-foreground">{token.symbol} • {token.blockchain}</p>
                      </div>
                      <div className={`px-2 py-1 rounded-full text-xs ${
                        token.status === 'confirmed' ? 'bg-green-100 text-green-800' : 
                        token.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                        'bg-red-100 text-red-800'
                      }`}>
                        {token.status.charAt(0).toUpperCase() + token.status.slice(1)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {!isLoading && tokens.length === 0 && (
                <div className="text-center py-6">
                  <p className="text-muted-foreground">No tokens created yet.</p>
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common tasks you can perform</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3">
                <a 
                  href="/tokens/create"
                  className="flex items-center gap-2 p-3 rounded-lg hover:bg-secondary transition-colors"
                >
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <DollarSign className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium text-sm">Create Token</h4>
                    <p className="text-xs text-muted-foreground">Mint a new token asset</p>
                  </div>
                </a>
                
                <a 
                  href="/users/invite"
                  className="flex items-center gap-2 p-3 rounded-lg hover:bg-secondary transition-colors"
                >
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium text-sm">Invite User</h4>
                    <p className="text-xs text-muted-foreground">Add members to your org</p>
                  </div>
                </a>
                
                <a 
                  href="/settings"
                  className="flex items-center gap-2 p-3 rounded-lg hover:bg-secondary transition-colors"
                >
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <RefreshCcw className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium text-sm">Manage Settings</h4>
                    <p className="text-xs text-muted-foreground">Configure your organization</p>
                  </div>
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
