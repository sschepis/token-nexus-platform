import React, { useState } from "react";
import { useRouter } from "next/router"; // Changed from react-router-dom
import { useAppDispatch } from "@/store/hooks";
import { loginStart, loginSuccess, loginFailed } from "@/store/slices/authSlice";
import { fetchOrgsSuccess, setCurrentOrgById, fetchUserOrganizations } from "@/store/slices/orgSlice";
import { apiService } from "@/services/api";
import { toast } from "@/hooks/use-toast"; // Assuming this is compatible or will be made compatible
import Parse from "parse";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

const LoginPage = () => {
  const dispatch = useAppDispatch();
  const router = useRouter(); // Changed from useNavigate
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
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
      
      const authResponse = await apiService.login({ email, password });
      
      // Explicitly set the session token for Parse SDK immediately after successful login
      // This is critical to ensure subsequent API calls are authenticated.
      await Parse.User.become(authResponse.token);

      // Ensure authResponse includes user, token, orgId, permissions, and isAdmin
      dispatch(loginSuccess({
        user: authResponse.user,
        token: authResponse.token,
        orgId: authResponse.orgId,
        permissions: authResponse.permissions,
        isAdmin: authResponse.isAdmin
      }));
      
      // Fetch user organizations and current organization details
      const userOrgsResult = await dispatch(fetchUserOrganizations()).unwrap();
      
      // The fetchUserOrganizations already sets the current organization from server
      // If no current organization was set, set the first available one
      if (!userOrgsResult.currentOrganization && userOrgsResult.organizations.length > 0) {
        dispatch(setCurrentOrgById(userOrgsResult.organizations[0].id));
      }
      
      toast({
        title: "Login successful",
        description: "Welcome back to Token Nexus Platform.",
      });
      
      router.push("/dashboard"); // Changed from navigate("/dashboard")
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