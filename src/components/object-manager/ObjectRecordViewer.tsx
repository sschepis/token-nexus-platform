
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
      try {
        const result = await Parse.Cloud.run('fetchObjectsByClassName', {
          className: objectApiName,
          organizationId: null, // Assuming records may or may not be tied to an organization
          searchFilters: {
            // Apply search term here if needed for server-side filtering
            // For now, client-side filtering handles it.
          }
        });
        return result.success ? result.records : [];
      } catch (error) {
        console.error(`Error fetching records for ${objectApiName}:`, error);
        return [];
      }
    }
  });

  const { data: fields = [] } = useQuery({
    queryKey: ["objectFields", objectId],
    queryFn: async () => {
      try {
        const result = await Parse.Cloud.run('getAvailableObjects', {
          organizationId: null // Assuming objects may or may not be tied to an organization
        });
        if (result.success) {
          const targetObject = result.objects.find((obj: any) => obj.apiName === objectApiName);
          return targetObject ? targetObject.fields : [];
        }
        return [];
      } catch (error) {
        console.error(`Error fetching fields for ${objectApiName}:`, error);
        return [];
      }
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
