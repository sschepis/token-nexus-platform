import React from "react";
import { Button } from "@/components/ui/button";

interface RouteDetailFooterProps {
  isEditing: boolean;
  onSave: () => void;
  onCancel: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const RouteDetailFooter: React.FC<RouteDetailFooterProps> = ({
  isEditing,
  onSave,
  onCancel,
  onEdit,
  onDelete,
}) => {
  return (
    <div className="flex justify-between">
      {isEditing ? (
        <div className="space-x-2">
          <Button onClick={onCancel}>Cancel</Button>
          <Button onClick={onSave}>Save</Button>
        </div>
      ) : (
        <Button onClick={onEdit}>Edit</Button>
      )}
      <Button variant="destructive" onClick={onDelete}>
        Delete
      </Button>
    </div>
  );
};

export default RouteDetailFooter;