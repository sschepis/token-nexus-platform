import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useAppDispatch } from "@/store/hooks";
import { loginStart, loginSuccess, loginFailed } from "@/store/slices/authSlice";
import { fetchUserOrganizations, setCurrentOrgById, fetchOrgsSuccess } from "@/store/slices/orgSlice";
import { apiService } from "@/services/api";
import { toast } from "@/hooks/use-toast";
import Parse from "parse";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

const LoginPage = () => {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Auto-login for testing purposes
  useEffect(() => {
    const autoLogin = async () => {
      // Check if we should auto-login (for development/testing)
      const shouldAutoLogin = process.env.NODE_ENV === 'development' &&
                             process.env.NEXT_PUBLIC_AUTO_LOGIN === 'true';
      
      if (shouldAutoLogin) {
        const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'admin@nomyx.io';
        const adminPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'admin123';
        
        console.log('Auto-login enabled for testing - logging in as admin');
        await handleLoginInternal(adminEmail, adminPassword);
      }
    };

    autoLogin();
  }, []);

  const handleLoginInternal = async (loginEmail: string, loginPassword: string) => {
    if (!loginEmail || !loginPassword) {
      toast({
        title: "Missing fields",
        description: "Please enter both email and password.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsLoading(true);
      dispatch(loginStart());
      
      const authResponse = await apiService.login({ email: loginEmail, password: loginPassword });
      
      // Explicitly set the session token for Parse SDK immediately after successful login
      // This is critical to ensure subsequent API calls are authenticated.
      await Parse.User.become(authResponse.token);

      // Ensure authResponse includes user, token, orgId, permissions, and isAdmin
      dispatch(loginSuccess({
        user: authResponse.user,
        token: authResponse.token,
        orgId: authResponse.orgId,
        permissions: authResponse.permissions,
        isAdmin: authResponse.isAdmin,
        organizations: authResponse.organizations
      }));
      
      // Use organization data from login response instead of making additional API call
      if (authResponse.organizations && authResponse.organizations.length > 0) {
        // Set organizations in the org slice
        const organizations = authResponse.organizations;
        const currentOrganization = organizations.find(org => org.isCurrentOrg) || organizations[0];
        
        // Dispatch organization data to the org slice
        dispatch(fetchOrgsSuccess(organizations));
        
        // Set current organization
        if (currentOrganization) {
          dispatch(setCurrentOrgById(currentOrganization.id));
        }
      } else {
        console.warn('No organizations returned from login response');
      }
      
      toast({
        title: "Login successful",
        description: "Welcome back to Token Nexus Platform.",
      });
      
      router.push("/dashboard");
    } catch (error) {
      dispatch(loginFailed("Invalid email or password."));
      toast({
        title: "Login failed",
        description: "Invalid email or password.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleLoginInternal(email, password);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-primary mb-2">Token Nexus Platform</h1>
          <p className="text-muted-foreground">Sign in to your account</p>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Login</CardTitle>
            <CardDescription>Enter your credentials to access the platform</CardDescription>
          </CardHeader>
          <form onSubmit={handleLogin}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <a href="#" className="text-sm text-primary hover:underline">
                    Forgot password?
                  </a>
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remember"
                  checked={remember}
                  onCheckedChange={(checked) => setRemember(checked as boolean)}
                />
                <Label htmlFor="remember" className="text-sm font-normal">
                  Remember me
                </Label>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col">
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign in"
                )}
              </Button>
              <div className="mt-4 text-center text-sm">
                Don't have an account?{" "}
                <a href="#" className="text-primary hover:underline">
                  Request access
                </a>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;