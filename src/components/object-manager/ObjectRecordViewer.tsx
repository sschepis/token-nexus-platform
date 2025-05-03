
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Table,
  TableHeader,
  TableRow,
  TableHead, 
  TableBody, 
  TableCell 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ArrowLeft, PlusCircle, Edit, Trash2, Search, Filter } from "lucide-react";
import { toast } from "@/components/ui/sonner";

interface ObjectRecordViewerProps {
  objectId: string;
  objectName: string;
  objectApiName: string;
  onBack: () => void;
}

interface RecordType {
  id: string;
  [key: string]: any; 
}

const ObjectRecordViewer: React.FC<ObjectRecordViewerProps> = ({
  objectId,
  objectName,
  objectApiName,
  onBack
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  
  // Fetch records for this object
  const { data: records = [], isLoading } = useQuery({
    queryKey: ["objectRecords", objectId],
    queryFn: async () => {
      // Mock data - in a real app this would fetch from the backend
      if (objectApiName === "Customer__c") {
        return [
          { id: "rec-1", Name: "Acme Corp", Email__c: "contact@acme.com", Phone__c: "555-1234", Status__c: "Active" },
          { id: "rec-2", Name: "Globex Inc", Email__c: "info@globex.com", Phone__c: "555-5678", Status__c: "Active" },
          { id: "rec-3", Name: "Stark Industries", Email__c: "sales@stark.com", Phone__c: "555-9012", Status__c: "Inactive" },
          { id: "rec-4", Name: "Wayne Enterprises", Email__c: "help@wayne.com", Phone__c: "555-3456", Status__c: "Active" },
          { id: "rec-5", Name: "Umbrella Corp", Email__c: "info@umbrella.com", Phone__c: "555-7890", Status__c: "Pending" },
        ];
      } else if (objectApiName === "Project__c") {
        return [
          { id: "rec-6", Name: "Website Redesign", Customer__c: "Acme Corp", StartDate__c: "2023-01-15", EndDate__c: "2023-03-30" },
          { id: "rec-7", Name: "Mobile App Development", Customer__c: "Globex Inc", StartDate__c: "2023-02-01", EndDate__c: "2023-06-30" },
          { id: "rec-8", Name: "Database Migration", Customer__c: "Stark Industries", StartDate__c: "2023-03-10", EndDate__c: null },
        ];
      } else if (objectApiName === "Invoice__c") {
        return [
          { id: "rec-9", Name: "INV-001", Customer__c: "Acme Corp", Amount__c: 5000, Date__c: "2023-01-30", Status__c: "Paid" },
          { id: "rec-10", Name: "INV-002", Customer__c: "Globex Inc", Amount__c: 7500, Date__c: "2023-02-15", Status__c: "Paid" },
          { id: "rec-11", Name: "INV-003", Customer__c: "Stark Industries", Amount__c: 12000, Date__c: "2023-03-01", Status__c: "Pending" },
          { id: "rec-12", Name: "INV-004", Customer__c: "Wayne Enterprises", Amount__c: 3000, Date__c: "2023-03-15", Status__c: "Unpaid" },
        ];
      }
      return [];
    }
  });

  const { data: fields = [] } = useQuery({
    queryKey: ["objectFields", objectId],
    queryFn: async () => {
      // Mock data - in a real app would fetch the object's field definitions
      if (objectApiName === "Customer__c") {
        return [
          { apiName: "Name", label: "Name", type: "text" },
          { apiName: "Email__c", label: "Email", type: "email" },
          { apiName: "Phone__c", label: "Phone", type: "phone" },
          { apiName: "Status__c", label: "Status", type: "picklist" }
        ];
      } else if (objectApiName === "Project__c") {
        return [
          { apiName: "Name", label: "Name", type: "text" },
          { apiName: "Customer__c", label: "Customer", type: "lookup" },
          { apiName: "StartDate__c", label: "Start Date", type: "date" },
          { apiName: "EndDate__c", label: "End Date", type: "date" }
        ];
      } else if (objectApiName === "Invoice__c") {
        return [
          { apiName: "Name", label: "Name", type: "text" },
          { apiName: "Customer__c", label: "Customer", type: "lookup" },
          { apiName: "Amount__c", label: "Amount", type: "number" },
          { apiName: "Date__c", label: "Date", type: "date" },
          { apiName: "Status__c", label: "Status", type: "picklist" }
        ];
      }
      return [];
    }
  });

  // Filter records based on search term
  const filteredRecords = records.filter((record: RecordType) => {
    if (!searchTerm) return true;
    
    // Search across all fields
    return Object.entries(record).some(([key, value]) => {
      if (key === 'id') return false; // Skip id field
      
      // Convert value to string for comparison
      const stringValue = String(value).toLowerCase();
      return stringValue.includes(searchTerm.toLowerCase());
    });
  });

  const handleCreateRecord = () => {
    toast.info(`Creating new ${objectName} record`);
    // In a real app, this would open a form to create a new record
  };

  const handleEditRecord = (id: string) => {
    toast.info(`Editing record ${id}`);
    // In a real app, this would open a form to edit the record
  };

  const handleDeleteRecord = (id: string) => {
    toast.info(`Deleting record ${id}`);
    // In a real app, this would show a confirmation dialog and delete the record
  };

  const renderCellValue = (value: any, fieldType: string) => {
    if (value === null || value === undefined) return "-";
    
    switch (fieldType) {
      case "picklist":
        const statusColors: Record<string, string> = {
          "Active": "bg-green-100 text-green-800",
          "Inactive": "bg-gray-100 text-gray-800",
          "Pending": "bg-amber-100 text-amber-800",
          "Paid": "bg-blue-100 text-blue-800",
          "Unpaid": "bg-red-100 text-red-800",
          "default": "bg-gray-100 text-gray-800"
        };
        return (
          <Badge variant="outline" className={statusColors[value] || statusColors.default}>
            {value}
          </Badge>
        );
      case "date":
        // Format date if it's a valid date
        return value ? new Date(value).toLocaleDateString() : "-";
      case "number":
        // Format number if needed
        return typeof value === "number" ? value.toLocaleString() : value;
      default:
        return value;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center">
            <Button variant="ghost" className="mr-2 p-1" onClick={onBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <CardTitle>{objectName} Records</CardTitle>
          </div>
          <Button onClick={handleCreateRecord}>
            <PlusCircle className="mr-2 h-4 w-4" />
            New Record
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex flex-col sm:flex-row gap-2 justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search records..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline" className="w-full sm:w-auto">
            <Filter className="mr-2 h-4 w-4" />
            Filters
          </Button>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                {fields.map((field) => (
                  <TableHead key={field.apiName}>{field.label}</TableHead>
                ))}
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array(5).fill(0).map((_, index) => (
                  <TableRow key={`skeleton-${index}`}>
                    {fields.map((field, fieldIndex) => (
                      <TableCell key={`skeleton-cell-${fieldIndex}`}>
                        <Skeleton className="h-5 w-full" />
                      </TableCell>
                    ))}
                    <TableCell className="text-right">
                      <Skeleton className="h-9 w-20 ml-auto" />
                    </TableCell>
                  </TableRow>
                ))
              ) : filteredRecords.length > 0 ? (
                filteredRecords.map((record: RecordType) => (
                  <TableRow key={record.id}>
                    {fields.map((field) => (
                      <TableCell key={`${record.id}-${field.apiName}`}>
                        {renderCellValue(record[field.apiName], field.type)}
                      </TableCell>
                    ))}
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mr-1"
                        onClick={() => handleEditRecord(record.id)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDeleteRecord(record.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={fields.length + 1} className="text-center py-8">
                    <div className="flex flex-col items-center">
                      <Search className="h-12 w-12 text-muted-foreground mb-2" />
                      <p className="text-muted-foreground">No records found. Adjust your search or create a new record.</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default ObjectRecordViewer;
