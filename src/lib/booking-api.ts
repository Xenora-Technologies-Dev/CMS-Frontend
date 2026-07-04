import { apiRequest, apiRequestPaginated } from './api';
import { dedupeRequest } from './request-cache';
import type {
  AuthUser,
  Booking,
  CancelBookingPayload,
  CreateBookingPayload,
  LoginResponse,
  Patient,
  PatientProfile,
  RescheduleBookingPayload,
  Room,
  Therapist,
  TherapistAvailability,
  Therapy,
  ListBookingsParams,
  AppointmentAudit,
  PaginatedResponse,
  UpdateBookingPayload,
} from './types';
import { endOfDay, startOfDay } from './utils';

export async function login(payload: {
  identifier: string;
  password: string;
}): Promise<LoginResponse> {
  return apiRequest<LoginResponse>('/auth/login', { method: 'POST', body: payload, auth: false });
}

export async function getMe(): Promise<{ user: AuthUser }> {
  return apiRequest<{ user: AuthUser }>('/auth/me');
}

export async function listBookings(params: ListBookingsParams = {}): Promise<PaginatedResponse<Booking>> {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', String(params.page));
  if (params.limit) searchParams.set('limit', String(params.limit));
  if (params.patientId) searchParams.set('patientId', params.patientId);
  if (params.therapistId) searchParams.set('therapistId', params.therapistId);
  if (params.doctorId) searchParams.set('doctorId', params.doctorId);
  if (params.bookingType) searchParams.set('bookingType', params.bookingType);
  if (params.roomId) searchParams.set('roomId', params.roomId);
  if (params.therapyId) searchParams.set('therapyId', params.therapyId);
  if (params.status) searchParams.set('status', params.status);
  if (params.statusGroup) searchParams.set('statusGroup', params.statusGroup);
  if (params.quickFilter) searchParams.set('quickFilter', params.quickFilter);
  if (params.patientName) searchParams.set('patientName', params.patientName);
  if (params.patientPhone) searchParams.set('patientPhone', params.patientPhone);
  if (params.therapistName) searchParams.set('therapistName', params.therapistName);
  if (params.therapyName) searchParams.set('therapyName', params.therapyName);
  if (params.dateFrom) searchParams.set('dateFrom', params.dateFrom);
  if (params.dateTo) searchParams.set('dateTo', params.dateTo);
  if (params.sort) searchParams.set('sort', params.sort);
  if (params.recentOnly) searchParams.set('recentOnly', 'true');
  if (params.excludeStatuses?.length) {
    searchParams.set('excludeStatuses', params.excludeStatuses.join(','));
  }
  const qs = searchParams.toString();
  return apiRequestPaginated<Booking>(`/bookings${qs ? `?${qs}` : ''}`);
}

export async function fetchPendingConfirmationBookings(
  limit = 50,
): Promise<PaginatedResponse<Booking>> {
  return listBookings({
    status: 'PENDING_CONFIRMATION',
    limit,
    sort: 'default',
  });
}

export async function listRecentBookings(
  params: ListBookingsParams = {},
): Promise<PaginatedResponse<Booking>> {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', String(params.page));
  if (params.limit) searchParams.set('limit', String(params.limit));
  if (params.patientName) searchParams.set('patientName', params.patientName);
  if (params.patientPhone) searchParams.set('patientPhone', params.patientPhone);
  if (params.therapistName) searchParams.set('therapistName', params.therapistName);
  if (params.therapyName) searchParams.set('therapyName', params.therapyName);
  if (params.therapistId) searchParams.set('therapistId', params.therapistId);
  if (params.status) searchParams.set('status', params.status);
  if (params.dateFrom) searchParams.set('dateFrom', params.dateFrom);
  if (params.dateTo) searchParams.set('dateTo', params.dateTo);
  const qs = searchParams.toString();
  return apiRequestPaginated<Booking>(`/bookings/recent${qs ? `?${qs}` : ''}`);
}

export async function fetchBookingAudits(id: string): Promise<AppointmentAudit[]> {
  const result = await apiRequest<{ audits: AppointmentAudit[] }>(`/bookings/${id}/audit`);
  return result.audits;
}

export async function restoreBooking(id: string): Promise<{ booking: Booking }> {
  return apiRequest<{ booking: Booking }>(`/bookings/${id}/restore`, { method: 'PATCH' });
}

export async function updateBookingNotes(
  id: string,
  notes: string | null,
): Promise<{ booking: Booking }> {
  return apiRequest<{ booking: Booking }>(`/bookings/${id}/notes`, {
    method: 'PATCH',
    body: { notes },
  });
}

export async function fetchBookingsForDate(
  date: Date,
  limit = 100,
  options?: { bookingType?: 'THERAPY' | 'CONSULTATION'; doctorId?: string },
): Promise<Booking[]> {
  const params = new URLSearchParams({
    dateFrom: startOfDay(date).toISOString(),
    dateTo: endOfDay(date).toISOString(),
    limit: String(limit),
    excludeStatuses: 'RESCHEDULED,CANCELLED,NO_SHOW',
  });
  if (options?.bookingType) params.set('bookingType', options.bookingType);
  if (options?.doctorId) params.set('doctorId', options.doctorId);
  const result = await apiRequestPaginated<Booking>(`/bookings?${params.toString()}`);
  return result.data;
}

export async function fetchBooking(id: string): Promise<{ booking: Booking }> {
  return apiRequest<{ booking: Booking }>(`/bookings/${id}`);
}

export interface BookingComment {
  id: string;
  bookingId: string;
  content: string;
  createdAt: string;
  author: {
    id: string;
    firstName: string;
    lastName: string;
    role: 'ADMIN' | 'THERAPIST' | 'DOCTOR';
  };
}

export async function listBookingComments(
  bookingId: string,
): Promise<{ comments: BookingComment[] }> {
  return apiRequest<{ comments: BookingComment[] }>(`/bookings/${bookingId}/comments`);
}

export async function createBookingComment(
  bookingId: string,
  content: string,
): Promise<{ comment: BookingComment }> {
  return apiRequest<{ comment: BookingComment }>(`/bookings/${bookingId}/comments`, {
    method: 'POST',
    body: { content },
  });
}

export async function fetchBookingsNeedingAttention(therapistId?: string) {
  const qs = therapistId ? `?therapistId=${therapistId}` : '';
  return apiRequest<{ bookings: import('./leave-api').BookingNeedingAttention[] }>(
    `/bookings/needs-attention${qs}`,
  );
}

export async function createBooking(payload: CreateBookingPayload): Promise<{ booking: Booking }> {
  return apiRequest<{ booking: Booking }>('/bookings', { method: 'POST', body: payload });
}

export async function updateBooking(
  id: string,
  payload: UpdateBookingPayload,
): Promise<{ booking: Booking }> {
  return apiRequest<{ booking: Booking }>(`/bookings/${id}`, { method: 'PATCH', body: payload });
}

export async function rescheduleBooking(
  id: string,
  payload: RescheduleBookingPayload,
): Promise<{ booking: Booking }> {
  return apiRequest<{ booking: Booking }>(`/bookings/${id}/reschedule`, {
    method: 'PATCH',
    body: payload,
  });
}

export async function cancelBooking(
  id: string,
  payload: CancelBookingPayload,
): Promise<{ booking: Booking }> {
  return apiRequest<{ booking: Booking }>(`/bookings/${id}/cancel`, {
    method: 'PATCH',
    body: payload,
  });
}

export function buildCancelBookingPayload(input: {
  reason: string;
  cancelPassword?: string;
}): CancelBookingPayload {
  return {
    cancellationReason: input.reason || undefined,
    ...(input.cancelPassword ? { cancelPassword: input.cancelPassword } : {}),
  };
}

export type BookingWhatsAppEventType = 'SCHEDULED' | 'CANCELLED' | 'RESCHEDULED';

export interface BookingWhatsAppResult {
  sent: boolean;
  skipped?: boolean;
  message?: string;
  error?: string;
  recipient?: string;
}

export async function sendBookingWhatsApp(
  bookingId: string,
  payload: { eventType: BookingWhatsAppEventType; previousStartTime?: string },
): Promise<BookingWhatsAppResult> {
  return apiRequest<BookingWhatsAppResult>(`/bookings/${bookingId}/whatsapp`, {
    method: 'POST',
    body: payload,
  });
}

export async function completeBooking(
  id: string,
  notes?: string,
): Promise<{ booking: Booking }> {
  return apiRequest<{ booking: Booking }>(`/bookings/${id}/complete`, {
    method: 'PATCH',
    body: notes !== undefined ? { notes } : {},
  });
}

export async function fetchPatients(limit = 100): Promise<Patient[]> {
  const result = await dedupeRequest(`patients-active-${limit}`, () =>
    apiRequestPaginated<Patient>(`/patients?limit=${limit}&isActive=true&compact=true`),
  );
  return result.data;
}

export async function fetchTherapists(limit = 100): Promise<Therapist[]> {
  const result = await dedupeRequest(`therapists-active-${limit}`, () =>
    apiRequestPaginated<Therapist>(`/therapists?limit=${limit}&isActive=true`),
  );
  return result.data;
}

export async function fetchRooms(limit = 100): Promise<Room[]> {
  const result = await dedupeRequest(`rooms-active-${limit}`, () =>
    apiRequestPaginated<Room>(`/rooms?limit=${limit}&isActive=true`),
  );
  return result.data;
}

export async function fetchTherapies(limit = 100): Promise<Therapy[]> {
  const result = await dedupeRequest(`therapies-active-${limit}`, () =>
    apiRequestPaginated<Therapy>(`/therapies?limit=${limit}&isActive=true`),
  );
  return result.data;
}

export interface TherapySearchResult {
  therapies: Therapy[];
  hasMore: boolean;
  total: number;
}

const THERAPY_SEARCH_PAGE_SIZE = 50;

/** Minimum characters before searching (1 for numeric code queries). */
export function getTherapySearchMinLength(query: string): number {
  const trimmed = query.trim();
  if (/^\d+$/.test(trimmed)) return 1;
  return 2;
}

export interface TherapistSearchResult {
  therapists: Therapist[];
  hasMore: boolean;
  total: number;
}

const THERAPIST_SEARCH_PAGE_SIZE = 50;

export function getTherapistSearchMinLength(query: string): number {
  const trimmed = query.trim();
  if (trimmed.includes('@')) return 3;
  return 2;
}

export async function searchTherapists(
  query: string,
  page = 1,
  limit = THERAPIST_SEARCH_PAGE_SIZE,
): Promise<TherapistSearchResult> {
  const trimmed = query.trim();
  const params = new URLSearchParams({
    limit: String(limit),
    page: String(page),
    isActive: 'true',
  });
  if (trimmed) params.set('search', trimmed);

  const cacheKey = `therapist-search:${trimmed}:${page}:${limit}`;
  const result = await dedupeRequest(cacheKey, () =>
    apiRequestPaginated<Therapist>(`/therapists?${params.toString()}`),
  );

  const { page: currentPage, totalPages, total } = result.meta;
  return {
    therapists: result.data,
    hasMore: currentPage < totalPages,
    total,
  };
}

export async function searchTherapies(
  query: string,
  page = 1,
  limit = THERAPY_SEARCH_PAGE_SIZE,
): Promise<TherapySearchResult> {
  const trimmed = query.trim();
  const params = new URLSearchParams({
    limit: String(limit),
    page: String(page),
    isActive: 'true',
  });
  if (trimmed) params.set('search', trimmed);

  const cacheKey = `therapy-search:${trimmed}:${page}:${limit}`;
  const result = await dedupeRequest(cacheKey, () =>
    apiRequestPaginated<Therapy>(`/therapies?${params.toString()}`),
  );

  const { page: currentPage, totalPages, total } = result.meta;
  return {
    therapies: result.data,
    hasMore: currentPage < totalPages,
    total,
  };
}

export interface PatientSearchResult {
  patients: Patient[];
  hasMore: boolean;
  total: number;
}

const PATIENT_SEARCH_PAGE_SIZE = 50;

/** Minimum characters before searching (1 for numeric phone/MRN queries). */
export function getPatientSearchMinLength(query: string): number {
  const trimmed = query.trim();
  if (/^\d+$/.test(trimmed)) return 1;
  return 2;
}

export async function searchPatients(
  query: string,
  page = 1,
  limit = PATIENT_SEARCH_PAGE_SIZE,
): Promise<PatientSearchResult> {
  const trimmed = query.trim();
  const params = new URLSearchParams({
    limit: String(limit),
    page: String(page),
    isActive: 'true',
    compact: 'true',
  });
  if (trimmed) params.set('search', trimmed);

  const cacheKey = `patient-search:${trimmed}:${page}:${limit}`;
  const result = await dedupeRequest(cacheKey, () =>
    apiRequestPaginated<Patient>(`/patients?${params.toString()}`),
  );

  const { page: currentPage, totalPages, total } = result.meta;
  return {
    patients: result.data,
    hasMore: currentPage < totalPages,
    total,
  };
}

export async function fetchTherapistAvailability(
  therapistId: string,
): Promise<TherapistAvailability[]> {
  const result = await apiRequest<{ availability: TherapistAvailability[] }>(
    `/therapists/${therapistId}/availability`,
  );
  return result.availability;
}

export async function fetchBookingsForDateRange(
  dateFrom: Date,
  dateTo: Date,
  limit = 100,
): Promise<Booking[]> {
  const result = await apiRequestPaginated<Booking>(
    `/bookings?dateFrom=${encodeURIComponent(dateFrom.toISOString())}&dateTo=${encodeURIComponent(dateTo.toISOString())}&limit=${limit}&excludeStatuses=RESCHEDULED,CANCELLED,NO_SHOW`,
  );
  return result.data;
}

export async function fetchPatientProfile(id: string): Promise<{ patient: PatientProfile }> {
  return apiRequest<{ patient: PatientProfile }>(`/patients/${id}`);
}

export async function fetchPatientBookings(
  patientId: string,
  limit = 100,
): Promise<Booking[]> {
  const result = await apiRequestPaginated<Booking>(
    `/bookings?patientId=${encodeURIComponent(patientId)}&limit=${limit}`,
  );
  return result.data;
}
