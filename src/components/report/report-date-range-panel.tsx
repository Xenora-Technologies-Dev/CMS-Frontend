'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatDateInput } from '@/lib/utils';
import { CalendarRange, Download, FileText, Loader2 } from 'lucide-react';

interface ReportDateRangePanelProps {
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onThisMonth: () => void;
  onPreview: () => void;
  onDownloadCsv: () => void;
  onDownloadPdf: () => void;
  loading?: boolean;
  downloading?: 'csv' | 'pdf' | null;
}

export function ReportDateRangePanel({
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  onThisMonth,
  onPreview,
  onDownloadCsv,
  onDownloadPdf,
  loading,
  downloading,
}: ReportDateRangePanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarRange className="h-4 w-4" />
          Date range
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="report-from">From</Label>
            <Input
              id="report-from"
              type="date"
              value={dateFrom}
              onChange={(e) => onDateFromChange(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="report-to">To</Label>
            <Input
              id="report-to"
              type="date"
              value={dateTo}
              onChange={(e) => onDateToChange(e.target.value)}
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onThisMonth}>
            This month
          </Button>
          <Button type="button" size="sm" onClick={onPreview} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Preview
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onDownloadCsv}
            disabled={downloading !== null}
          >
            {downloading === 'csv' ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Excel (CSV)
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onDownloadPdf}
            disabled={downloading !== null}
          >
            {downloading === 'pdf' ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileText className="mr-2 h-4 w-4" />
            )}
            PDF
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function getMonthRange(): { dateFrom: string; dateTo: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { dateFrom: formatDateInput(start), dateTo: formatDateInput(end) };
}

export function toReportIsoRange(dateFrom: string, dateTo: string) {
  const from = new Date(dateFrom + 'T00:00:00');
  const to = new Date(dateTo + 'T23:59:59');
  return { dateFrom: from.toISOString(), dateTo: to.toISOString() };
}
