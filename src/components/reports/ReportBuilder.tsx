import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";

interface ReportBuilderProps {
  reportTitle: string;
  setReportTitle: (value: string) => void;
  reportType: 'user_activity' | 'token_usage' | 'security_events' | 'organization_summary';
  setReportType: (value: 'user_activity' | 'token_usage' | 'security_events' | 'organization_summary') => void;
  reportFormat: 'json' | 'csv' | 'pdf';
  setReportFormat: (value: 'json' | 'csv' | 'pdf') => void;
  reportDateRange: DateRange | undefined;
  setReportDateRange: (value: DateRange | undefined) => void;
  onGenerateReport: () => Promise<void>;
  isGeneratingReport: boolean;
  reportError: string | null;
  canWrite: boolean;
}

const ReportBuilder: React.FC<ReportBuilderProps> = ({
  reportTitle,
  setReportTitle,
  reportType,
  setReportType,
  reportFormat,
  setReportFormat,
  reportDateRange,
  setReportDateRange,
  onGenerateReport,
  isGeneratingReport,
  reportError,
  canWrite
}) => {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="reportTitle">Report Title</Label>
          <Input
            id="reportTitle"
            value={reportTitle}
            onChange={(e) => setReportTitle(e.target.value)}
            placeholder="e.g., Monthly Token Activity"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="reportType">Report Type</Label>
          <Select
            value={reportType}
            onValueChange={(value) => setReportType(value as 'user_activity' | 'token_usage' | 'security_events' | 'organization_summary')}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="user_activity">User Activity</SelectItem>
              <SelectItem value="token_usage">Token Usage</SelectItem>
              <SelectItem value="security_events">Security Events</SelectItem>
              <SelectItem value="organization_summary">Organization Summary</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="reportFormat">Format</Label>
          <Select
            value={reportFormat}
            onValueChange={(value) => setReportFormat(value as 'json' | 'csv' | 'pdf')}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select format" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="csv">CSV</SelectItem>
              <SelectItem value="json">JSON</SelectItem>
              <SelectItem value="pdf">PDF</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="reportDateRange">Date Range</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="reportDateRange"
                variant={"outline"}
                className="w-full justify-start text-left font-normal"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {reportDateRange?.from ? (
                  reportDateRange.to ? (
                    <>
                      {format(reportDateRange.from, "LLL dd, y")} -{" "}
                      {format(reportDateRange.to, "LLL dd, y")}
                    </>
                  ) : (
                    format(reportDateRange.from, "LLL dd, y")
                  )
                ) : (
                  <span>Pick a date range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={reportDateRange?.from}
                selected={reportDateRange}
                onSelect={setReportDateRange}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>
      
      {canWrite && (
        <Button onClick={onGenerateReport} className="mt-4" disabled={isGeneratingReport}>
          {isGeneratingReport ? 'Generating...' : 'Generate Report'}
        </Button>
      )}
      
      {reportError && <p className="text-red-500 text-sm mt-2">{reportError}</p>}
    </div>
  );
};

export default ReportBuilder;