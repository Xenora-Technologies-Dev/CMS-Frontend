'use client';

import { ReportDateRangePanel, getMonthRange, toReportIsoRange } from '@/components/report/report-date-range-panel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  downloadTherapyReportCsv,
  downloadTherapyReportPdf,
  fetchTherapyReport,
  type TherapyReportData,
} from '@/lib/report-api';
import { useState } from 'react';

const initialRange = getMonthRange();

export function TherapyReportPage() {
  const [dateFrom, setDateFrom] = useState(initialRange.dateFrom);
  const [dateTo, setDateTo] = useState(initialRange.dateTo);
  const [report, setReport] = useState<TherapyReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState<'csv' | 'pdf' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadPreview() {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchTherapyReport(toReportIsoRange(dateFrom, dateTo));
      setReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load report');
      setReport(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleDownloadCsv() {
    setDownloading('csv');
    setError(null);
    try {
      await downloadTherapyReportCsv(toReportIsoRange(dateFrom, dateTo));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed');
    } finally {
      setDownloading(null);
    }
  }

  async function handleDownloadPdf() {
    setDownloading('pdf');
    setError(null);
    try {
      await downloadTherapyReportPdf(toReportIsoRange(dateFrom, dateTo));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed');
    } finally {
      setDownloading(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Therapy Report</h1>
        <p className="text-sm text-muted-foreground">
          Therapy booking statistics by therapist for a date range.
        </p>
      </div>

      <ReportDateRangePanel
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        onThisMonth={() => {
          const range = getMonthRange();
          setDateFrom(range.dateFrom);
          setDateTo(range.dateTo);
        }}
        onPreview={() => void loadPreview()}
        onDownloadCsv={() => void handleDownloadCsv()}
        onDownloadPdf={() => void handleDownloadPdf()}
        loading={loading}
        downloading={downloading}
      />

      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {report && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ['Total booked', report.summary.totalBooked],
              ['Completed', report.summary.completed],
              ['Scheduled', report.summary.scheduled],
              ['Pending confirmation', report.summary.pendingConfirmation],
              ['Cancelled', report.summary.cancelled],
              ['No show', report.summary.noShow],
            ].map(([label, value]) => (
              <Card key={label}>
                <CardContent className="pt-6">
                  <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
                  <p className="mt-1 text-2xl font-bold">{value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">By therapist</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left">
                    <th className="px-4 py-3 font-medium">Therapist</th>
                    <th className="px-4 py-3 font-medium">Total</th>
                    <th className="px-4 py-3 font-medium">Completed</th>
                    <th className="px-4 py-3 font-medium">Scheduled</th>
                    <th className="px-4 py-3 font-medium">Pending</th>
                    <th className="px-4 py-3 font-medium">Cancelled</th>
                  </tr>
                </thead>
                <tbody>
                  {report.therapists.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                        No therapy bookings in this range
                      </td>
                    </tr>
                  ) : (
                    report.therapists.map((row) => (
                      <tr key={row.therapistName} className="border-b last:border-0">
                        <td className="px-4 py-3 font-medium">{row.therapistName}</td>
                        <td className="px-4 py-3">{row.total}</td>
                        <td className="px-4 py-3">{row.completed}</td>
                        <td className="px-4 py-3">{row.scheduled}</td>
                        <td className="px-4 py-3">{row.pendingConfirmation}</td>
                        <td className="px-4 py-3">{row.cancelled}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
