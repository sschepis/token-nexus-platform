
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { CustomField } from "@/types/object-manager";
import { Separator } from "@/components/ui/separator";

const fieldTypesOptions = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "datetime", label: "Date/Time" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "picklist", label: "Picklist" },
  { value: "multipicklist", label: "Multi-select Picklist" },
  { value: "checkbox", label: "Checkbox" },
  { value: "url", label: "URL" },
  { value: "lookup", label: "Lookup" },
  { value: "textarea", label: "Text Area" },
];

const formSchema = z.object({
  label: z
    .string()
    .min(1, "Label is required")
    .max(40, "Label cannot exceed 40 characters"),
  apiName: z
    .string()
    .min(1, "API Name is required")
    .max(40, "API Name cannot exceed 40 characters")
    .regex(/^[a-zA-Z][a-zA-Z0-9_]*__c$/, "API Name must end with __c and contain only letters, numbers, and underscores"),
  type: z.string().min(1, "Field type is required"),
  required: z.boolean().default(false),
  description: z.string().max(255, "Description cannot exceed 255 characters").optional(),
  defaultValue: z.string().optional(),
  picklistValues: z.string().optional(),
  referenceTo: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface FieldModalProps {
  isOpen: boolean;
  onClose: () => void;
  objectApiName: string;
  field: CustomField | null;
  onSuccess: () => void;
}

const FieldModal: React.FC<FieldModalProps> = ({
  isOpen,
  onClose,
  objectApiName,
  field,
  onSuccess,
}) => {
  const isEditing = !!field;
  const isCustomField = !field || field.apiName !== "Name";
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      label: field?.label || "",
      apiName: field?.apiName || "",
      type: field?.type || "text",
      required: field?.required || false,
      description: field?.description || "",
      defaultValue: field?.defaultValue || "",
      picklistValues: field?.options?.join("\n") || "",
      referenceTo: field?.referenceTo || "",
    },
  });
  
  const selectedFieldType = form.watch("type");
  const isPicklistType = selectedFieldType === "picklist" || selectedFieldType === "multipicklist";
  const isLookupType = selectedFieldType === "lookup";
  
  const fieldMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      // Mock API call
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            id: field?.id || `field-${Date.now()}`,
            ...values,
            options: isPicklistType ? values.picklistValues?.split("\n").filter(v => v.trim() !== "") : undefined,
          });
        }, 500);
      });
    },
    onSuccess: () => {
      toast.success(`Field ${isEditing ? "updated" : "created"} successfully`);
      onSuccess();
      form.reset();
    },
    onError: () => {
      toast.error(`Failed to ${isEditing ? "update" : "create"} field. Please try again.`);
    },
  });
  
  const onSubmit = (values: FormValues) => {
    fieldMutation.mutate(values);
  };
  
  const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const label = e.target.value;
    form.setValue("label", label);
    
    // Auto-generate API name if it's empty or was auto-generated before
    if (isCustomField && (!form.getValues("apiName") || form.getValues("apiName") === `${form.getValues("label").replace(/\s+/g, "_")}__c`)) {
      const apiName = `${label.replace(/\s+/g, "_")}__c`;
      form.setValue("apiName", apiName);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Field" : "Add Field"}</DialogTitle>
          <DialogDescription>
            {isEditing 
              ? `Update properties for the ${field?.label} field.`
              : `Add a new field to the ${objectApiName} object.`}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Field Information Section */}
            <div>
              <h3 className="text-base font-medium mb-2">Field Information</h3>
              <Separator className="my-2" />
              <div className="grid gap-4 py-2">
                <FormField
                  control={form.control}
                  name="label"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Label</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="e.g. Customer Name"
                          onChange={(e) => {
                            field.onChange(e);
                            handleLabelChange(e);
                          }}
                        />
                      </FormControl>
                      <FormDescription>
                        The display name for your field, shown in the UI.
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
                        <Input 
                          {...field} 
                          placeholder="e.g. Customer_Name__c"
                          disabled={!isCustomField}
                        />
                      </FormControl>
                      <FormDescription>
                        {isCustomField 
                          ? "The unique name used in API calls and formulas. Must end with __c."
                          : "API Name for standard fields cannot be changed."}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Field Type</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                        disabled={isEditing} // Can't change type after creation
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a field type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {fieldTypesOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        {isEditing 
                          ? "Field type cannot be changed after creation."
                          : "Select the type of data this field will store."}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="required"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Required</FormLabel>
                        <FormDescription>
                          Make this field required for all records
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
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
                          placeholder="Help text for this field"
                          className="resize-none"
                        />
                      </FormControl>
                      <FormDescription>
                        Help text shown to users for this field.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Type-specific options */}
            {isPicklistType && (
              <div>
                <h3 className="text-base font-medium mb-2">Picklist Values</h3>
                <Separator className="my-2" />
                <FormField
                  control={form.control}
                  name="picklistValues"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Picklist Values</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Enter each value on a new line"
                          className="min-h-[150px]"
                        />
                      </FormControl>
                      <FormDescription>
                        Enter each picklist value on a separate line.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {isLookupType && (
              <div>
                <h3 className="text-base font-medium mb-2">Lookup Configuration</h3>
                <Separator className="my-2" />
                <FormField
                  control={form.control}
                  name="referenceTo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Referenced Object</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="e.g. Customer__c"
                        />
                      </FormControl>
                      <FormDescription>
                        The API name of the object this lookup field references.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

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
                disabled={fieldMutation.isPending}
              >
                {fieldMutation.isPending 
                  ? (isEditing ? "Saving..." : "Creating...") 
                  : (isEditing ? "Save Changes" : "Create Field")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default FieldModal;
