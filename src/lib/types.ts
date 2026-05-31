export type UserRole = 'ADMIN' | 'THERAPIST';

export type BookingStatus =
  | 'SCHEDULED'
  | 'CONFIRMED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'RESCHEDULED'
  | 'NO_SHOW';

export interface AuthUser {
  id: string;
  clinicId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  therapistId?: string | null;
}

export interface UserListItem {
  id: string;
  clinicId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  role: UserRole;
  isActive: boolean;
  lastLoginAt?: string | null;
  therapistId?: string | null;
}

export interface CreateAdminPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

export interface LoginResponse {
  user: AuthUser;
  accessToken: string;
  expiresIn: string;
}

export interface PaginatedMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginatedMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  medicalRecordNo: string;
  phone?: string | null;
}

export interface PatientListItem extends Patient {
  email?: string | null;
  isActive: boolean;
  dateOfBirth?: string | null;
  gender?: string | null;
}

export type AuthorizationStatus = 'PENDING' | 'APPROVED' | 'DENIED' | 'EXPIRED';

export interface InsuranceProvider {
  id: string;
  name: string;
  code?: string | null;
}

export interface PatientInsurance {
  id: string;
  policyNumber: string;
  memberId?: string | null;
  groupNumber?: string | null;
  planName?: string | null;
  coveragePercent?: string | null;
  validFrom?: string | null;
  validTo?: string | null;
  isPrimary: boolean;
  authorizationNumber?: string | null;
  authorizationStatus: AuthorizationStatus;
  authorizedUntil?: string | null;
  insuranceProvider: InsuranceProvider;
}

export interface PatientTherapistLink {
  id: string;
  assignedAt: string;
  notes?: string | null;
  therapist: Therapist;
}

export interface PatientProfile extends Patient {
  dateOfBirth?: string | null;
  gender?: string | null;
  email?: string | null;
  alternatePhone?: string | null;
  nationality?: string | null;
  emiratesId?: string | null;
  address?: string | null;
  city?: string | null;
  emirate?: string | null;
  notes?: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  insurances: PatientInsurance[];
  therapistLinks: PatientTherapistLink[];
  _count?: { bookings: number };
}

export interface TherapistUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
}

export interface Therapist {
  id: string;
  colorCode?: string | null;
  specialization?: string | null;
  consultationStartTime?: string | null;
  consultationEndTime?: string | null;
  user: TherapistUser;
}

export interface TherapistListItem extends Therapist {
  isActive: boolean;
}

export interface TherapistDetail extends TherapistListItem {
  licenseNumber?: string | null;
  bio?: string | null;
  availability?: TherapistAvailability[];
}

export interface Room {
  id: string;
  name: string;
  code?: string | null;
  floor?: string | null;
}

export interface RoomDetail extends Room {
  isActive: boolean;
  capacity?: number;
  equipment?: string | null;
  notes?: string | null;
}

export interface Therapy {
  id: string;
  name: string;
  code?: string | null;
  durationMinutes: number;
}

export interface TherapyDetail extends Therapy {
  description?: string | null;
  price?: string | number | null;
  currency?: string | null;
  isActive: boolean;
}

export type DayOfWeek =
  | 'MONDAY'
  | 'TUESDAY'
  | 'WEDNESDAY'
  | 'THURSDAY'
  | 'FRIDAY'
  | 'SATURDAY'
  | 'SUNDAY';

export interface TherapistAvailability {
  id: string;
  therapistId: string;
  dayOfWeek?: DayOfWeek | null;
  specificDate?: string | null;
  startTime: string;
  endTime: string;
  isRecurring: boolean;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  isActive: boolean;
  notes?: string | null;
}

export interface UserSummary {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
}

export interface Booking {
  id: string;
  clinicId: string;
  patientId: string;
  therapistId: string;
  roomId: string;
  therapyId: string;
  patientInsuranceId?: string | null;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  status: BookingStatus;
  notes?: string | null;
  cancellationReason?: string | null;
  cancelledAt?: string | null;
  rescheduledAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  patient: Patient;
  therapist: Therapist;
  room: Room;
  therapy: Therapy;
  patientInsurance?: PatientInsurance | null;
  createdBy?: UserSummary | null;
  updatedBy?: UserSummary | null;
  cancelledBy?: UserSummary | null;
  rescheduledBy?: UserSummary | null;
  rescheduledFrom?: {
    id: string;
    startTime: string;
    endTime: string;
    therapistId: string;
    roomId: string;
    status: BookingStatus;
  } | null;
}

export type AppointmentAuditAction =
  | 'CREATED'
  | 'UPDATED'
  | 'CANCELLED'
  | 'RESCHEDULED'
  | 'COMPLETED'
  | 'RESTORED';

export interface AppointmentAudit {
  id: string;
  bookingId: string;
  action: AppointmentAuditAction;
  performedAt: string;
  oldStartTime?: string | null;
  oldEndTime?: string | null;
  oldTherapistId?: string | null;
  oldRoomId?: string | null;
  newStartTime?: string | null;
  newEndTime?: string | null;
  newTherapistId?: string | null;
  newRoomId?: string | null;
  cancellationReason?: string | null;
  performedBy?: UserSummary | null;
}

export type StatusGroupFilter = 'UPCOMING' | 'COMPLETED' | 'CANCELLED' | 'RESCHEDULED';
export type QuickFilter = 'today' | 'tomorrow' | 'upcoming' | 'completed' | 'cancelled' | 'all';

export interface ListBookingsParams {
  page?: number;
  limit?: number;
  patientId?: string;
  therapistId?: string;
  roomId?: string;
  therapyId?: string;
  status?: BookingStatus;
  statusGroup?: StatusGroupFilter;
  quickFilter?: QuickFilter;
  patientName?: string;
  patientPhone?: string;
  dateFrom?: string;
  dateTo?: string;
  sort?: 'default' | 'date_asc' | 'date_desc';
  excludeStatuses?: BookingStatus[];
}

export interface CreateBookingPayload {
  patientId: string;
  therapistId: string;
  roomId: string;
  therapyId: string;
  patientInsuranceId?: string;
  startTime: string;
  notes?: string;
  overrideScheduleConstraints?: boolean;
}

export interface UpdateBookingPayload {
  patientId?: string;
  therapistId?: string;
  roomId?: string;
  therapyId?: string;
  patientInsuranceId?: string | null;
  notes?: string | null;
}

export interface RescheduleBookingPayload {
  startTime: string;
  therapistId?: string;
  roomId?: string;
}

export interface CancelBookingPayload {
  cancellationReason?: string;
}
