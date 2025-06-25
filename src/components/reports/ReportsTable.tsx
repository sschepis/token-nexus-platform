import React from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";

interface Report {
  id: string;
  title: string;
  type: string;
  format: string;
  createdAt: string;
  status: 'completed' | 'generating' | 'failed';
  fileUrl?: string;
}

interface ReportsTableProps {
  reports: Report[];
  isLoading: boolean;
}

const ReportsTable: React.FC<ReportsTableProps> = ({ reports, isLoading }) => {
  if (isLoading) {
    return <div className="text-center py-8">Loading past reports...</div>;
  }

  if (reports.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">No reports generated yet.</div>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Title</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Format</TableHead>
          <TableHead>Generated On</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {reports.map((report) => (
          <TableRow key={report.id}>
            <TableCell className="font-medium">{report.title}</TableCell>
            <TableCell>{report.type}</TableCell>
            <TableCell>{report.format}</TableCell>
            <TableCell>{format(new Date(report.createdAt), 'MMM dd, yyyy HH:mm')}</TableCell>
            <TableCell className="text-right">
              {report.status === 'completed' && report.fileUrl && (
                <Button variant="outline" size="sm" asChild>
                  <a href={report.fileUrl} target="_blank" rel="noopener noreferrer">Download</a>
                </Button>
              )}
              {report.status === 'generating' && (
                <span className="text-muted-foreground">Generating...</span>
              )}
              {report.status === 'failed' && (
                <span className="text-red-500">Failed</span>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default ReportsTable;