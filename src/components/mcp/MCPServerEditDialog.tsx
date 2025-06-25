import React, { useState, useEffect } from 'react';
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
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { MCPServer, UpdateMCPServerRequest } from '@/types/MCPServerTypes';
import { mcpServersApi } from '@/services/api/mcpServers';

interface MCPServerEditDialogProps {
  server: MCPServer;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onServerUpdated: () => void;
}

const MCPServerEditDialog: React.FC<MCPServerEditDialogProps> = ({
  server,
  open,
  onOpenChange,
  onServerUpdated,
}) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  // Form state
  const [name, setName] = useState(server.name);
  const [description, setDescription] = useState(server.description || '');
  const [type, setType] = useState<'stdio' | 'sse'>(server.type);
  const [status, setStatus] = useState<'active' | 'inactive'>(server.status === 'active' ? 'active' : 'inactive');
  
  // STDIO configuration
  const [command, setCommand] = useState(server.config.command || '');
  const [args, setArgs] = useState(server.config.args?.join(' ') || '');
  const [environment, setEnvironment] = useState(
    server.config.env ? Object.entries(server.config.env).map(([key, value]) => `${key}=${value}`).join('\n') : ''
  );
  
  // SSE configuration
  const [url, setUrl] = useState(server.config.url || '');
  const [headers, setHeaders] = useState(
    server.config.headers ? Object.entries(server.config.headers).map(([key, value]) => `${key}: ${value}`).join('\n') : ''
  );

  // Reset form when server changes
  useEffect(() => {
    setName(server.name);
    setDescription(server.description || '');
    setType(server.type);
    setStatus(server.status === 'active' ? 'active' : 'inactive');
    setCommand(server.config.command || '');
    setArgs(server.config.args?.join(' ') || '');
    setEnvironment(
      server.config.env ? Object.entries(server.config.env).map(([key, value]) => `${key}=${value}`).join('\n') : ''
    );
    setUrl(server.config.url || '');
    setHeaders(
      server.config.headers ? Object.entries(server.config.headers).map(([key, value]) => `${key}: ${value}`).join('\n') : ''
    );
  }, [server]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Server name is required',
        variant: 'destructive',
      });
      return;
    }

    if (type === 'stdio' && !command.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Command is required for STDIO servers',
        variant: 'destructive',
      });
      return;
    }

    if (type === 'sse' && !url.trim()) {
      toast({
        title: 'Validation Error',
        description: 'URL is required for SSE servers',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      // Parse environment variables
      const envVars: Record<string, string> = {};
      if (environment.trim()) {
        environment.split('\n').forEach(line => {
          const [key, ...valueParts] = line.split('=');
          if (key && valueParts.length > 0) {
            envVars[key.trim()] = valueParts.join('=').trim();
          }
        });
      }

      // Parse headers
      const headerObj: Record<string, string> = {};
      if (headers.trim()) {
        headers.split('\n').forEach(line => {
          const [key, ...valueParts] = line.split(':');
          if (key && valueParts.length > 0) {
            headerObj[key.trim()] = valueParts.join(':').trim();
          }
        });
      }

      const config = type === 'stdio' 
        ? {
            command: command.trim(),
            args: args.trim() ? args.trim().split(/\s+/) : [],
            env: Object.keys(envVars).length > 0 ? envVars : undefined,
          }
        : {
            url: url.trim(),
            headers: Object.keys(headerObj).length > 0 ? headerObj : undefined,
          };

      const updatedServer: UpdateMCPServerRequest = {
        name: name.trim(),
        description: description.trim() || undefined,
        config,
        status,
      };

      const result = await mcpServersApi.updateMCPServer(server.id, updatedServer);

      if (result.success) {
        toast({
          title: 'Success',
          description: 'MCP server updated successfully',
        });
        onServerUpdated();
        onOpenChange(false);
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to update MCP server',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error updating MCP server:', error);
      toast({
        title: 'Error',
        description: 'Failed to update MCP server',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit MCP Server</DialogTitle>
          <DialogDescription>
            Update the configuration for this MCP server.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Name *</Label>
                <Input
                  id="edit-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter server name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-type">Type</Label>
                <Select value={type} onValueChange={(value: 'stdio' | 'sse') => setType(value)}>
                  <SelectTrigger id="edit-type">
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
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter server description"
                rows={2}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="edit-status"
                checked={status === 'active'}
                onCheckedChange={(checked) => setStatus(checked ? 'active' : 'inactive')}
              />
              <Label htmlFor="edit-status">Enable this server</Label>
            </div>
          </div>

          {/* Configuration based on type */}
          {type === 'stdio' ? (
            <div className="space-y-4">
              <h4 className="text-sm font-medium">STDIO Configuration</h4>
              
              <div className="space-y-2">
                <Label htmlFor="edit-command">Command *</Label>
                <Input
                  id="edit-command"
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                  placeholder="e.g., node, python, ./my-server"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-args">Arguments</Label>
                <Input
                  id="edit-args"
                  value={args}
                  onChange={(e) => setArgs(e.target.value)}
                  placeholder="e.g., server.js --port 3000"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-environment">Environment Variables</Label>
                <Textarea
                  id="edit-environment"
                  value={environment}
                  onChange={(e) => setEnvironment(e.target.value)}
                  placeholder="KEY1=value1&#10;KEY2=value2"
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  One variable per line in KEY=value format
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <h4 className="text-sm font-medium">SSE Configuration</h4>
              
              <div className="space-y-2">
                <Label htmlFor="edit-url">URL *</Label>
                <Input
                  id="edit-url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://api.example.com/mcp"
                  type="url"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-headers">Headers</Label>
                <Textarea
                  id="edit-headers"
                  value={headers}
                  onChange={(e) => setHeaders(e.target.value)}
                  placeholder="Authorization: Bearer token&#10;Content-Type: application/json"
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  One header per line in Key: Value format
                </p>
              </div>
            </div>
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
              {isLoading ? 'Updating...' : 'Update Server'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default MCPServerEditDialog;