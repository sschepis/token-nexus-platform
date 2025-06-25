import React, { useState } from 'react';
import { useAppSelector } from '@/store/hooks';
import { mcpServersApi } from '@/services/api/mcpServers';
import { CreateMCPServerRequest } from '@/types/MCPServerTypes';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

interface MCPServerCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const MCPServerCreateDialog: React.FC<MCPServerCreateDialogProps> = ({
  open,
  onOpenChange,
  onSuccess,
}) => {
  const { currentOrg } = useAppSelector((state) => state.org);
  const { orgId: authOrgId } = useAppSelector((state) => state.auth);
  const { toast } = useToast();

  const effectiveOrgId = currentOrg?.id || authOrgId;

  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'stdio' as 'stdio' | 'sse',
    command: '',
    args: '',
    url: '',
    headers: '',
    env: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!effectiveOrgId) {
      toast({
        title: 'Error',
        description: 'No organization context available',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.name || !formData.description) {
      toast({
        title: 'Error',
        description: 'Name and description are required',
        variant: 'destructive',
      });
      return;
    }

    if (formData.type === 'stdio' && !formData.command) {
      toast({
        title: 'Error',
        description: 'Command is required for STDIO servers',
        variant: 'destructive',
      });
      return;
    }

    if (formData.type === 'sse' && !formData.url) {
      toast({
        title: 'Error',
        description: 'URL is required for SSE servers',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const config: any = {};

      if (formData.type === 'stdio') {
        config.command = formData.command;
        if (formData.args) {
          config.args = formData.args.split(' ').filter(arg => arg.trim());
        }
        if (formData.env) {
          try {
            config.env = JSON.parse(formData.env);
          } catch (error) {
            toast({
              title: 'Error',
              description: 'Invalid JSON format for environment variables',
              variant: 'destructive',
            });
            return;
          }
        }
      } else if (formData.type === 'sse') {
        config.url = formData.url;
        if (formData.headers) {
          try {
            config.headers = JSON.parse(formData.headers);
          } catch (error) {
            toast({
              title: 'Error',
              description: 'Invalid JSON format for headers',
              variant: 'destructive',
            });
            return;
          }
        }
      }

      const serverData: CreateMCPServerRequest = {
        name: formData.name,
        description: formData.description,
        type: formData.type,
        config,
      };

      const result = await mcpServersApi.createMCPServer(effectiveOrgId, serverData);

      if (result.success) {
        toast({
          title: 'Success',
          description: `MCP server "${formData.name}" created successfully`,
        });
        onSuccess();
        onOpenChange(false);
        // Reset form
        setFormData({
          name: '',
          description: '',
          type: 'stdio',
          command: '',
          args: '',
          url: '',
          headers: '',
          env: '',
        });
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to create MCP server',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create MCP server',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create MCP Server</DialogTitle>
          <DialogDescription>
            Add a new Model Context Protocol server to your organization.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="My MCP Server"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Type *</Label>
              <Select
                value={formData.type}
                onValueChange={(value: 'stdio' | 'sse') => 
                  setFormData({ ...formData, type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="stdio">STDIO</SelectItem>
                  <SelectItem value="sse">SSE</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe what this MCP server does..."
              required
            />
          </div>

          {formData.type === 'stdio' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="command">Command *</Label>
                <Input
                  id="command"
                  value={formData.command}
                  onChange={(e) => setFormData({ ...formData, command: e.target.value })}
                  placeholder="node server.js"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="args">Arguments</Label>
                <Input
                  id="args"
                  value={formData.args}
                  onChange={(e) => setFormData({ ...formData, args: e.target.value })}
                  placeholder="--port 3000 --verbose"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="env">Environment Variables (JSON)</Label>
                <Textarea
                  id="env"
                  value={formData.env}
                  onChange={(e) => setFormData({ ...formData, env: e.target.value })}
                  placeholder='{"API_KEY": "your-key", "DEBUG": "true"}'
                />
              </div>
            </>
          )}

          {formData.type === 'sse' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="url">URL *</Label>
                <Input
                  id="url"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  placeholder="https://api.example.com/mcp"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="headers">Headers (JSON)</Label>
                <Textarea
                  id="headers"
                  value={formData.headers}
                  onChange={(e) => setFormData({ ...formData, headers: e.target.value })}
                  placeholder='{"Authorization": "Bearer token", "Content-Type": "application/json"}'
                />
              </div>
            </>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Server
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default MCPServerCreateDialog;