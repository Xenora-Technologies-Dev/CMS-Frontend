export type UserRole = 'ADMIN' | 'THERAPIST' | 'DOCTOR';

export type BookingType = 'THERAPY' | 'CONSULTATION';

export type BookingMode = 'WALK_IN' | 'CALL';

export type RoomType = 'THERAPY' | 'CONSULTATION';

export type BookingStatus =
  | 'SCHEDULED'
  | 'CONFIRMED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'RESCHEDULED'
  | 'NO_SHOW'
  | 'PENDING_CONFIRMATION';

export interface AuthUser {
  id: string;
  clinicId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  therapistId?: string | null;
  doctorId?: string | null;
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
  doctorId?: string | null;
  managedPassword?: string | null;
}

export interface UpdateUserPayload {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
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
  whatsappNumber?: string | null;
  email?: string | null;
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
  requiresConsultationHours?: boolean;
  user: TherapistUser;
}

export interface DoctorUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
}

export interface Doctor {
  id: string;
  colorCode?: string | null;
  specialization?: string | null;
  consultationStartTime?: string | null;
  consultationEndTime?: string | null;
  user: DoctorUser;
}

export interface DoctorListItem extends Doctor {
  isActive: boolean;
}

export interface DoctorDetail extends DoctorListItem {
  licenseNumber?: string | null;
  bio?: string | null;
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
  roomType?: RoomType;
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
  isPackageBased?: boolean;
  packageSessions?: number | null;
  packageValidityDays?: number | null;
}

export interface TherapyDetail extends Therapy {
  description?: string | null;
  price?: string | number | null;
  currency?: string | null;
  isActive: boolean;
  packageSessions?: number | null;
  packageValidityDays?: number | null;
  packageDescription?: string | null;
}

export type TreatmentPlanStatus = 'ACTIVE' | 'COMPLETED' | 'EXPIRED' | 'CANCELLED';

export interface TreatmentPlanSession {
  id: string;
  sessionNumber: number;
  completedAt: string;
  booking: {
    id: string;
    startTime: string;
    endTime: string;
    status: BookingStatus;
    therapist: Therapist;
  };
}

export interface TreatmentPlan {
  id: string;
  patientId: string;
  therapyId: string;
  totalSessions: number;
  completedSessions: number;
  remainingSessions: number;
  startDate: string;
  expiryDate: string;
  status: TreatmentPlanStatus;
  createdAt: string;
  updatedAt: string;
  therapy: TherapyDetail;
  patient?: Patient;
  sessions?: TreatmentPlanSession[];
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
  bookingType: BookingType;
  therapistId?: string | null;
  doctorId?: string | null;
  roomId: string;
  therapyId?: string | null;
  bookingMode?: BookingMode | null;
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
  therapist?: Therapist | null;
  doctor?: Doctor | null;
  room: Room;
  therapy?: Therapy | null;
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
  treatmentPlan?: {
    id: string;
    totalSessions: number;
    completedSessions: number;
    remainingSessions: number;
    expiryDate: string;
    status: TreatmentPlanStatus;
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
  doctorId?: string;
  bookingType?: BookingType;
  roomId?: string;
  therapyId?: string;
  status?: BookingStatus;
  statusGroup?: StatusGroupFilter;
  quickFilter?: QuickFilter;
  patientName?: string;
  patientPhone?: string;
  therapistName?: string;
  therapyName?: string;
  dateFrom?: string;
  dateTo?: string;
  sort?: 'default' | 'date_asc' | 'date_desc' | 'created_desc';
  excludeStatuses?: BookingStatus[];
  recentOnly?: boolean;
}

export interface CreateBookingPayload {
  bookingType?: BookingType;
  patientId: string;
  therapistId?: string;
  doctorId?: string;
  roomId: string;
  therapyId?: string;
  bookingMode?: BookingMode;
  durationMinutes?: number;
  patientInsuranceId?: string;
  startTime: string;
  notes?: string;
  overrideScheduleConstraints?: boolean;
  treatmentPlanId?: string;
  createNewPackage?: boolean;
  packageSessions?: number;
  packageValidityDays?: number;
}

export interface PublicHoliday {
  id: string;
  name: string;
  startDateTime: string;
  endDateTime: string;
  isFullDay: boolean;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
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
  doctorId?: string;
  roomId?: string;
}

export interface CancelBookingPayload {
  cancellationReason?: string;
}
