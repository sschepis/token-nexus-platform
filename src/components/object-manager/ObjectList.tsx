
import React from "react";
import { 
  Table, 
  TableHeader, 
  TableRow, 
  TableHead, 
  TableBody, 
  TableCell 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { CustomObject } from "@/types/object-manager";
import { format } from "date-fns";
import { Database, Edit, Eye } from "lucide-react";

interface ObjectListProps {
  objects: CustomObject[];
  isLoading: boolean;
  onObjectSelect: (object: CustomObject) => void;
}

const ObjectList: React.FC<ObjectListProps> = ({
  objects,
  isLoading,
  onObjectSelect,
}) => {
  if (isLoading) {
    return <div className="flex justify-center p-8">Loading objects...</div>;
  }

  if (objects.length === 0) {
    return (
      <div className="text-center p-8">
        <Database className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-2 text-lg font-semibold">No custom objects</h3>
        <p className="text-muted-foreground">Create your first custom object to get started.</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[200px]">Label</TableHead>
            <TableHead className="w-[200px]">API Name</TableHead>
            <TableHead className="w-[120px]">Fields</TableHead>
            <TableHead className="w-[180px]">Last Modified</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {objects.map((object) => (
            <TableRow key={object.id}>
              <TableCell className="font-medium">{object.label}</TableCell>
              <TableCell>{object.apiName}</TableCell>
              <TableCell>{object.fields?.length || 0}</TableCell>
              <TableCell>
                {format(new Date(object.updatedAt), "MMM d, yyyy")}
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onObjectSelect(object)}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default ObjectList;
