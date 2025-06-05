import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X, Plus } from 'lucide-react';
import { CreateFunctionRequest, FunctionLanguage, FunctionRuntime } from '@/types/cloud-functions';
import CodeEditor from './CodeEditor';

const createFunctionSchema = z.object({
  name: z.string()
    .min(1, 'Function name is required')
    .max(50, 'Function name must be less than 50 characters')
    .regex(/^[a-zA-Z][a-zA-Z0-9_]*$/, 'Function name must start with a letter and contain only letters, numbers, and underscores'),
  description: z.string()
    .min(1, 'Description is required')
    .max(500, 'Description must be less than 500 characters'),
  language: z.enum(['javascript', 'typescript']),
  runtime: z.enum(['nodejs18.x', 'nodejs20.x']),
  category: z.string().optional(),
});

type CreateFunctionFormData = z.infer<typeof createFunctionSchema>;

interface CreateFunctionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateFunction: (functionData: CreateFunctionRequest) => Promise<void>;
  existingFunctionNames: string[];
}

const defaultCode = {
  javascript: `// Cloud Function Template
Parse.Cloud.define("myFunction", async (request) => {
  const { params, user } = request;
  
  // Your function logic here
  try {
    // Example: Get current user data
    if (!user) {
      throw new Error("User must be authenticated");
    }
    
    return {
      success: true,
      message: "Function executed successfully",
      data: {
        userId: user.id,
        timestamp: new Date().toISOString()
      }
    };
  } catch (error) {
    throw new Error(\`Function execution failed: \${error.message}\`);
  }
});`,
  typescript: `// Cloud Function Template (TypeScript)
interface FunctionRequest {
  params: any;
  user?: Parse.User;
}

interface FunctionResponse {
  success: boolean;
  message: string;
  data?: any;
}

Parse.Cloud.define("myFunction", async (request: FunctionRequest): Promise<FunctionResponse> => {
  const { params, user } = request;
  
  // Your function logic here
  try {
    // Example: Get current user data
    if (!user) {
      throw new Error("User must be authenticated");
    }
    
    return {
      success: true,
      message: "Function executed successfully",
      data: {
        userId: user.id,
        timestamp: new Date().toISOString()
      }
    };
  } catch (error) {
    throw new Error(\`Function execution failed: \${(error as Error).message}\`);
  }
});`
};

const CreateFunctionDialog: React.FC<CreateFunctionDialogProps> = ({
  open,
  onOpenChange,
  onCreateFunction,
  existingFunctionNames
}) => {
  const [code, setCode] = useState(defaultCode.javascript);
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CreateFunctionFormData>({
    resolver: zodResolver(createFunctionSchema),
    defaultValues: {
      name: '',
      description: '',
      language: 'javascript',
      runtime: 'nodejs18.x',
      category: 'custom',
    },
  });

  const watchedLanguage = form.watch('language');

  // Update code template when language changes
  React.useEffect(() => {
    if (watchedLanguage) {
      setCode(defaultCode[watchedLanguage]);
    }
  }, [watchedLanguage]);

  const validateCode = (code: string) => {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!code.trim()) {
      errors.push('Function code cannot be empty');
      return { isValid: false, errors, warnings };
    }

    // Basic Parse Cloud Code validation
    if (!code.includes('Parse.Cloud.define')) {
      errors.push('Function must use Parse.Cloud.define()');
    }

    // Security checks
    if (code.includes('eval(')) {
      errors.push('Use of eval() is not allowed for security reasons');
    }

    if (code.includes('require(') && !code.includes('// @allow-require')) {
      warnings.push('Use of require() should be carefully reviewed');
    }

    // Check for async/await patterns
    if (code.includes('Parse.Cloud.define') && !code.includes('async')) {
      warnings.push('Consider using async function for better error handling');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  };

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleSubmit = async (data: CreateFunctionFormData) => {
    // Check if function name already exists
    if (existingFunctionNames.includes(data.name)) {
      form.setError('name', { message: 'A function with this name already exists' });
      return;
    }

    // Validate code
    const validation = validateCode(code);
    if (!validation.isValid) {
      // Show validation errors
      return;
    }

    setIsSubmitting(true);
    try {
      await onCreateFunction({
        name: data.name,
        description: data.description,
        language: data.language,
        runtime: data.runtime,
        category: data.category,
        code,
        tags,
      });
      
      // Reset form
      form.reset();
      setCode(defaultCode.javascript);
      setTags([]);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to create function:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Cloud Function</DialogTitle>
          <DialogDescription>
            Create a new cloud function for your organization. Functions are executed server-side and can be called from your applications.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Function Name</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="myFunction" 
                        {...field}
                        onChange={(e) => {
                          // Auto-format function name
                          const value = e.target.value.replace(/[^a-zA-Z0-9_]/g, '');
                          field.onChange(value);
                        }}
                      />
                    </FormControl>
                    <FormDescription>
                      Must start with a letter and contain only letters, numbers, and underscores
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <FormControl>
                      <Input placeholder="custom" {...field} />
                    </FormControl>
                    <FormDescription>
                      Organize functions by category (e.g., auth, payments, notifications)
                    </FormDescription>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Describe what this function does..."
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Provide a clear description of the function's purpose and behavior
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="language"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Language</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select language" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="javascript">JavaScript</SelectItem>
                        <SelectItem value="typescript">TypeScript</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Programming language for the function
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="runtime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Runtime</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select runtime" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="nodejs18.x">Node.js 18.x</SelectItem>
                        <SelectItem value="nodejs20.x">Node.js 20.x</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Runtime environment for execution
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Tags</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                    {tag}
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => removeTag(tag)}
                    />
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Add tag..."
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  className="flex-1"
                />
                <Button type="button" variant="outline" size="sm" onClick={addTag}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Add tags to help organize and search your functions
              </p>
            </div>

            {/* Code Editor */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Function Code</label>
              <CodeEditor
                value={code}
                onChange={setCode}
                language={watchedLanguage}
                onValidate={validateCode}
                placeholder="Enter your function code here..."
              />
            </div>

            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create Function'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateFunctionDialog;