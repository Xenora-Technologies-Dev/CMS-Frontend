import { getToken } from './auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

export type ReportFormat = 'json' | 'pdf' | 'xlsx';

export interface ReportDateRange {
  dateFrom: string;
  dateTo: string;
}

export interface TherapyReportSummary {
  totalBooked: number;
  completed: number;
  cancelled: number;
  pendingConfirmation: number;
  scheduled: number;
  noShow: number;
}

export interface TherapyReportTherapistRow {
  therapistName: string;
  completed: number;
  cancelled: number;
  pendingConfirmation: number;
  scheduled: number;
  noShow: number;
  total: number;
}

export interface TherapyReportData {
  dateFrom: string;
  dateTo: string;
  therapists: TherapyReportTherapistRow[];
  summary: TherapyReportSummary;
}

export interface ConsultationReportRow {
  date: string;
  time: string;
  patient: string;
  mrn: string;
  doctor: string;
  room: string;
  mode: string;
  status: string;
  remarks: string;
}

export interface ConsultationReportData {
  dateFrom: string;
  dateTo: string;
  rows: ConsultationReportRow[];
}

function buildReportQuery(range: ReportDateRange, format: ReportFormat): string {
  const qs = new URLSearchParams({
    dateFrom: range.dateFrom,
    dateTo: range.dateTo,
    format,
  });
  return qs.toString();
}

async function fetchReport(
  path: string,
  range: ReportDateRange,
  format: ReportFormat,
): Promise<Response> {
  const token = getToken();
  const response = await fetch(`${API_URL}${path}?${buildReportQuery(range, format)}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) {
    let message = 'Failed to fetch report';
    try {
      const payload = (await response.json()) as { error?: { message?: string } };
      message = payload.error?.message ?? message;
    } catch {
      // use default
    }
    throw new Error(message);
  }
  return response;
}

export async function fetchTherapyReport(range: ReportDateRange): Promise<TherapyReportData> {
  const response = await fetchReport('/reports/therapy', range, 'json');
  const payload = (await response.json()) as { data: TherapyReportData };
  return payload.data;
}

export async function fetchConsultationReport(
  range: ReportDateRange,
): Promise<ConsultationReportData> {
  const response = await fetchReport('/reports/consultation', range, 'json');
  const payload = (await response.json()) as { data: ConsultationReportData };
  return payload.data;
}

async function downloadReportFile(
  path: string,
  range: ReportDateRange,
  format: 'pdf' | 'xlsx',
  defaultFilename: string,
): Promise<void> {
  const response = await fetchReport(path, range, format);
  const blob = await response.blob();
  const disposition = response.headers.get('Content-Disposition');
  const filenameMatch = disposition?.match(/filename="([^"]+)"/);
  const filename = filenameMatch?.[1] ?? defaultFilename;
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export function downloadTherapyReportCsv(range: ReportDateRange): Promise<void> {
  return downloadReportFile(
    '/reports/therapy',
    range,
    'xlsx',
    `therapy-report-${range.dateFrom.slice(0, 10)}.csv`,
  );
}

export function downloadTherapyReportPdf(range: ReportDateRange): Promise<void> {
  return downloadReportFile(
    '/reports/therapy',
    range,
    'pdf',
    `therapy-report-${range.dateFrom.slice(0, 10)}.pdf`,
  );
}

export function downloadConsultationReportCsv(range: ReportDateRange): Promise<void> {
  return downloadReportFile(
    '/reports/consultation',
    range,
    'xlsx',
    `consultation-report-${range.dateFrom.slice(0, 10)}.csv`,
  );
}

export function downloadConsultationReportPdf(range: ReportDateRange): Promise<void> {
  return downloadReportFile(
    '/reports/consultation',
    range,
    'pdf',
    `consultation-report-${range.dateFrom.slice(0, 10)}.pdf`,
  );
}
