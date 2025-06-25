import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { CreateFormData } from './types';

interface CreateChildOrgDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  formData: CreateFormData;
  onFormDataChange: (data: CreateFormData) => void;
  onSubmit: () => void;
  isProcessing: boolean;
}

export function CreateChildOrgDialog({
  isOpen,
  onOpenChange,
  formData,
  onFormDataChange,
  onSubmit,
  isProcessing
}: CreateChildOrgDialogProps) {
  const updateFormData = (field: keyof CreateFormData, value: string) => {
    onFormDataChange({ ...formData, [field]: value });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Child Organization</DialogTitle>
          <DialogDescription>
            Create a new organization under the parent organization
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div>
            <Label htmlFor="org-name">Organization Name</Label>
            <Input
              id="org-name"
              value={formData.name}
              onChange={(e) => updateFormData('name', e.target.value)}
              placeholder="Acme Corporation"
            />
          </div>
          <div>
            <Label htmlFor="plan-type">Plan Type</Label>
            <Select 
              value={formData.planType} 
              onValueChange={(value) => updateFormData('planType', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select plan type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="starter">Starter</SelectItem>
                <SelectItem value="professional">Professional</SelectItem>
                <SelectItem value="enterprise">Enterprise</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="contact-email">Contact Email</Label>
              <Input
                id="contact-email"
                type="email"
                value={formData.contactEmail}
                onChange={(e) => updateFormData('contactEmail', e.target.value)}
                placeholder="contact@acme.com"
              />
            </div>
            <div>
              <Label htmlFor="contact-phone">Contact Phone</Label>
              <Input
                id="contact-phone"
                value={formData.contactPhone}
                onChange={(e) => updateFormData('contactPhone', e.target.value)}
                placeholder="+1 (555) 123-4567"
              />
            </div>
          </div>
          <div className="space-y-2">
            <h4 className="font-medium">Organization Owner</h4>
            <div>
              <Label htmlFor="owner-email">Owner Email</Label>
              <Input
                id="owner-email"
                type="email"
                value={formData.ownerEmail}
                onChange={(e) => updateFormData('ownerEmail', e.target.value)}
                placeholder="owner@acme.com"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="owner-first">First Name</Label>
                <Input
                  id="owner-first"
                  value={formData.ownerFirstName}
                  onChange={(e) => updateFormData('ownerFirstName', e.target.value)}
                  placeholder="John"
                />
              </div>
              <div>
                <Label htmlFor="owner-last">Last Name</Label>
                <Input
                  id="owner-last"
                  value={formData.ownerLastName}
                  onChange={(e) => updateFormData('ownerLastName', e.target.value)}
                  placeholder="Doe"
                />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="industry">Industry</Label>
              <Input
                id="industry"
                value={formData.industry}
                onChange={(e) => updateFormData('industry', e.target.value)}
                placeholder="Technology"
              />
            </div>
            <div>
              <Label htmlFor="company-size">Company Size</Label>
              <Select 
                value={formData.companySize} 
                onValueChange={(value) => updateFormData('companySize', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select company size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1-10">1-10 employees</SelectItem>
                  <SelectItem value="11-50">11-50 employees</SelectItem>
                  <SelectItem value="51-200">51-200 employees</SelectItem>
                  <SelectItem value="201-500">201-500 employees</SelectItem>
                  <SelectItem value="500+">500+ employees</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={isProcessing}>
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Organization'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}