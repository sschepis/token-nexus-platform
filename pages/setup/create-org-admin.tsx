import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Building2, User, CheckCircle } from 'lucide-react';
import { completeInitialSetup } from '@/services/appInitService';

export default function CreateOrgAdmin() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    parentOrgName: '',
    adminUserEmail: '',
    adminUserPassword: '',
    adminUserPasswordConfirm: '',
    adminUserFirstName: '',
    adminUserLastName: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    if (!formData.parentOrgName.trim()) {
      setError('Organization name is required');
      return false;
    }
    
    if (!formData.adminUserEmail.trim()) {
      setError('Administrator email is required');
      return false;
    }
    
    if (!formData.adminUserPassword || formData.adminUserPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return false;
    }
    
    if (formData.adminUserPassword !== formData.adminUserPasswordConfirm) {
      setError('Passwords do not match');
      return false;
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.adminUserEmail)) {
      setError('Please enter a valid email address');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!validateForm()) {
      return;
    }
    
    setIsLoading(true);

    try {
      const result = await completeInitialSetup({
        parentOrgName: formData.parentOrgName,
        adminUserEmail: formData.adminUserEmail,
        adminUserPassword: formData.adminUserPassword,
        adminUserFirstName: formData.adminUserFirstName,
        adminUserLastName: formData.adminUserLastName
      });
      
      if (result.success) {
        setSuccess(true);
        // Redirect to login page after a short delay
        setTimeout(() => {
          router.push('/login?message=' + encodeURIComponent('Platform setup complete! Please log in with your new administrator credentials.'));
        }, 2000);
      } else {
        setError(result.error || 'Setup failed');
      }
    } catch (err) {
      setError('An unexpected error occurred during setup');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Setup Complete!</h2>
              <p className="text-muted-foreground">
                The platform has been successfully configured.
              </p>
              <p className="text-sm text-muted-foreground mt-4">
                Redirecting to login page...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Platform Setup</CardTitle>
          <CardDescription>
            Create Parent Organization & Initial System Administrator
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            {/* Parent Organization Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-lg font-semibold">
                <Building2 className="h-5 w-5" />
                Parent Organization Details
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="parentOrgName">Organization Name *</Label>
                <Input
                  id="parentOrgName"
                  name="parentOrgName"
                  type="text"
                  placeholder="Enter organization name"
                  value={formData.parentOrgName}
                  onChange={handleInputChange}
                  required
                  disabled={isLoading}
                />
              </div>
            </div>
            
            {/* System Administrator Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-lg font-semibold">
                <User className="h-5 w-5" />
                System Administrator Account
              </div>
              
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="adminUserFirstName">First Name</Label>
                  <Input
                    id="adminUserFirstName"
                    name="adminUserFirstName"
                    type="text"
                    placeholder="First name (optional)"
                    value={formData.adminUserFirstName}
                    onChange={handleInputChange}
                    disabled={isLoading}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="adminUserLastName">Last Name</Label>
                  <Input
                    id="adminUserLastName"
                    name="adminUserLastName"
                    type="text"
                    placeholder="Last name (optional)"
                    value={formData.adminUserLastName}
                    onChange={handleInputChange}
                    disabled={isLoading}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="adminUserEmail">Administrator Email *</Label>
                <Input
                  id="adminUserEmail"
                  name="adminUserEmail"
                  type="email"
                  placeholder="admin@example.com"
                  value={formData.adminUserEmail}
                  onChange={handleInputChange}
                  required
                  disabled={isLoading}
                />
              </div>
              
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="adminUserPassword">Administrator Password *</Label>
                  <Input
                    id="adminUserPassword"
                    name="adminUserPassword"
                    type="password"
                    placeholder="Minimum 8 characters"
                    value={formData.adminUserPassword}
                    onChange={handleInputChange}
                    required
                    disabled={isLoading}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="adminUserPasswordConfirm">Confirm Password *</Label>
                  <Input
                    id="adminUserPasswordConfirm"
                    name="adminUserPasswordConfirm"
                    type="password"
                    placeholder="Re-enter password"
                    value={formData.adminUserPasswordConfirm}
                    onChange={handleInputChange}
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>
            </div>
            
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
              size="lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Accounts...
                </>
              ) : (
                'Complete Setup & Create Accounts'
              )}
            </Button>
          </form>
          
          <div className="mt-6 text-center text-sm text-muted-foreground">
            <p>Please provide the following details to finalize platform setup.</p>
            <p className="mt-2">Fields marked with * are required.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}