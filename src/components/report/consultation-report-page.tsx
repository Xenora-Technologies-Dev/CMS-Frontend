'use client';

import { ReportDateRangePanel, getMonthRange, toReportIsoRange } from '@/components/report/report-date-range-panel';
import { ReportLayout } from '@/components/report/report-layout';
import {
  downloadConsultationReportCsv,
  downloadConsultationReportPdf,
  fetchConsultationReport,
  type ConsultationReportData,
} from '@/lib/report-api';
import { useState } from 'react';

const initialRange = getMonthRange();

export function ConsultationReportPage() {
  const [dateFrom, setDateFrom] = useState(initialRange.dateFrom);
  const [dateTo, setDateTo] = useState(initialRange.dateTo);
  const [report, setReport] = useState<ConsultationReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState<'csv' | 'pdf' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadPreview() {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchConsultationReport(toReportIsoRange(dateFrom, dateTo));
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
      await downloadConsultationReportCsv(toReportIsoRange(dateFrom, dateTo));
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
      await downloadConsultationReportPdf(toReportIsoRange(dateFrom, dateTo));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed');
    } finally {
      setDownloading(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Consultation Report</h1>
        <p className="text-sm text-muted-foreground">
          Consultation booking log with date, time, and patient details.
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
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left">
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Time</th>
                  <th className="px-4 py-3 font-medium">Patient</th>
                </tr>
              </thead>
              <tbody>
                {report.rows.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                      No consultations in this range
                    </td>
                  </tr>
                ) : (
                  report.rows.map((row, index) => (
                    <tr key={`${row.patient}-${row.time}-${index}`} className="border-b last:border-0">
                      <td className="px-4 py-3">{row.date}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{row.time}</td>
                      <td className="px-4 py-3 font-medium">{row.patient}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </ReportLayout>
      )}
    </div>
  );
}
