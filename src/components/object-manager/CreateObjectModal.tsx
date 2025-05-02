
import React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useMutation } from "@tanstack/react-query";
import { toast } from "@/components/ui/sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const formSchema = z.object({
  label: z
    .string()
    .min(1, "Label is required")
    .max(50, "Label cannot exceed 50 characters"),
  apiName: z
    .string()
    .min(1, "API Name is required")
    .max(40, "API Name cannot exceed 40 characters")
    .regex(/^[a-zA-Z][a-zA-Z0-9_]*__c$/, "API Name must end with __c and contain only letters, numbers, and underscores"),
  description: z.string().max(255, "Description cannot exceed 255 characters").optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface CreateObjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CreateObjectModal: React.FC<CreateObjectModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      label: "",
      apiName: "",
      description: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      // Mock API call for now
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            id: `obj-${Date.now()}`,
            ...values,
            fields: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }, 500);
      });
    },
    onSuccess: () => {
      onSuccess();
      form.reset();
    },
    onError: () => {
      toast.error("Failed to create object. Please try again.");
    },
  });

  const onSubmit = (values: FormValues) => {
    createMutation.mutate(values);
  };

  const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const label = e.target.value;
    form.setValue("label", label);
    
    // Auto-generate API name if it's empty or was auto-generated before
    if (!form.getValues("apiName") || form.getValues("apiName") === `${form.getValues("label").replace(/\s+/g, "_")}__c`) {
      const apiName = `${label.replace(/\s+/g, "_")}__c`;
      form.setValue("apiName", apiName);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Create Custom Object</DialogTitle>
          <DialogDescription>
            Define a new custom object for your organization's data model.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="label"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Label</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="e.g. Customer"
                      onChange={(e) => {
                        field.onChange(e);
                        handleLabelChange(e);
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    The display name for your object, shown in the user interface.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="apiName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>API Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g. Customer__c" />
                  </FormControl>
                  <FormDescription>
                    The unique name used in API calls and formulas. Must end with __c.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Describe the purpose of this object"
                      className="resize-none"
                    />
                  </FormControl>
                  <FormDescription>
                    Help others understand the purpose of this object.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? "Creating..." : "Create Object"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateObjectModal;
