'use client';

import { ReportDateRangePanel, getMonthRange, toReportIsoRange } from '@/components/report/report-date-range-panel';
import { ReportLayout } from '@/components/report/report-layout';
import { Card, CardContent } from '@/components/ui/card';
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
          Therapy booking statistics and completed session details for a date range.
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
        <ReportLayout meta={report.meta}>
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Summary
              </h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  ['Total booked', report.summary.totalBooked],
                  ['Completed', report.summary.completed],
                  ['Scheduled', report.summary.scheduled],
                  ['Pending confirmation', report.summary.pendingConfirmation],
                  ['Cancelled', report.summary.cancelled],
                  ['No show', report.summary.noShow],
                ].map(([label, value]) => (
                  <Card key={label}>
                    <CardContent className="pt-4">
                      <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
                      <p className="mt-1 text-2xl font-bold">{value}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {report.therapists.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No therapy bookings in this range
              </p>
            ) : (
              report.therapists.map((therapist) => (
                <div key={therapist.therapistName} className="space-y-4 border-t pt-6 first:border-t-0 first:pt-0">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">{therapist.therapistName}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Total {therapist.total} · Completed {therapist.completed} · Scheduled{' '}
                      {therapist.scheduled} · Pending {therapist.pendingConfirmation} · Cancelled{' '}
                      {therapist.cancelled}
                    </p>
                  </div>

                  {therapist.completedBookings.length > 0 && (
                    <div className="overflow-x-auto rounded-md border">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-muted/40 text-left">
                            <th className="px-4 py-3 font-medium">Date</th>
                            <th className="px-4 py-3 font-medium">Time</th>
                            <th className="px-4 py-3 font-medium">Patient</th>
                            <th className="px-4 py-3 font-medium">Therapy</th>
                          </tr>
                        </thead>
                        <tbody>
                          {therapist.completedBookings.map((booking, index) => (
                            <tr
                              key={`${booking.patientName}-${booking.time}-${index}`}
                              className="border-b last:border-0"
                            >
                              <td className="px-4 py-3">{booking.date}</td>
                              <td className="px-4 py-3 whitespace-nowrap">{booking.time}</td>
                              <td className="px-4 py-3 font-medium">{booking.patientName}</td>
                              <td className="px-4 py-3">{booking.therapyName}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </ReportLayout>
      )}
    </div>
  );
}
