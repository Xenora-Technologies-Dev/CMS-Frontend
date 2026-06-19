import type { UserRole } from '@/lib/types';

export interface UserGuideSection {
  id: string;
  title: string;
  summary?: string;
  steps: string[];
  tips?: string[];
}

export interface UserGuideContent {
  role: UserRole;
  title: string;
  introduction: string;
  sections: UserGuideSection[];
}

export const ADMIN_USER_GUIDE: UserGuideContent = {
  role: 'ADMIN',
  title: 'Admin User Guide',
  introduction:
    'CliniqFlow helps you run the clinic: patients, staff, therapy & consultation bookings, leaves, reports, and user management. Use the sidebar to navigate. This guide walks through everyday tasks.',
  sections: [
    {
      id: 'login',
      title: 'Logging in',
      steps: [
        'Open the CliniqFlow login page provided by your clinic.',
        'Sign in with your email or UAE mobile number (05XXXXXXXX) and password.',
        'You land on the Dashboard with today\'s stats, appointments, and pending confirmations.',
      ],
      tips: ['Use Refresh on the dashboard to reload live data without leaving the page.'],
    },
    {
      id: 'dashboard',
      title: 'Dashboard',
      steps: [
        'Review stat cards: total patients, active therapists, today\'s bookings, pending leave.',
        'Check Today\'s Appointments and Upcoming Bookings (therapy + consultation).',
        'Use Pending Confirmation to confirm completed sessions (tick) or postpone/cancel (cross).',
        'Click View more on pending items to open the full Pending Confirmation page.',
      ],
    },
    {
      id: 'bookings',
      title: 'Creating & managing bookings',
      steps: [
        'Therapy Booking calendar: open Appointments → Therapy Booking. Click a slot or Create Booking.',
        'Search patient, therapist, and therapy using the searchable dropdowns.',
        'Package therapies show session count in the dropdown. Pick date, time, and room.',
        'Consultation Booking: Appointments → Consultation Booking for doctor appointments.',
        'Appointment List: filter by patient, therapist, status, and date range.',
        'Recent Bookings shows bookings created in the last 48 hours.',
      ],
      tips: [
        'Therapists and doctors receive realtime notifications when a booking is created for them.',
      ],
    },
    {
      id: 'patients',
      title: 'Patients',
      steps: [
        'Patients → Patient List: search and open profiles.',
        'Add Patient: register demographics, phone, and insurance.',
        'From a patient profile, view history and create follow-up bookings.',
      ],
    },
    {
      id: 'staff',
      title: 'Therapists, doctors & users',
      steps: [
        'Add therapists/doctors from their respective menus or Users → Add Admin.',
        'Users page: view any account, see login password (admin only), edit names/email/phone, enable/disable.',
        'Passwords are stored when an account is created or reset — visible to all admins.',
        'Edit user details from Users → Edit without opening separate profile forms.',
      ],
    },
    {
      id: 'leaves',
      title: 'Leave management',
      steps: [
        'Leaves → Leave Management: approve/reject therapist leave requests.',
        'Resolve booking conflicts when leave overlaps appointments.',
        'Public Holidays appear on calendars clinic-wide.',
      ],
    },
    {
      id: 'reports',
      title: 'Reports & activity',
      steps: [
        'Reports → Therapy / Consultation Report: export booking statistics.',
        'Activity Log: audit trail of clinic actions.',
        'Clinic Settings: name, location, contact details.',
      ],
    },
  ],
};

export const THERAPIST_USER_GUIDE: UserGuideContent = {
  role: 'THERAPIST',
  title: 'Therapist User Guide',
  introduction:
    'Your portal shows today\'s schedule, upcoming patients, older appointments, leave status, and notifications. Use My Calendar for day-to-day booking work.',
  sections: [
    {
      id: 'login',
      title: 'Logging in',
      steps: [
        'Sign in with email or UAE mobile and password from your clinic admin.',
        'You arrive at My Dashboard with today\'s therapy schedule.',
      ],
    },
    {
      id: 'dashboard',
      title: 'Dashboard',
      steps: [
        'Today\'s Schedule lists patients, therapy, time, and room for today.',
        'Upcoming Patients shows future bookings (next 14 days).',
        'Older Appointments lists past sessions from the last 30 days with status badges.',
        'Leave Status shows approved or pending leave; open Manage to request leave.',
        'Notifications alert you to new bookings and clinic updates.',
      ],
    },
    {
      id: 'calendar',
      title: 'My Calendar',
      steps: [
        'Appointments → My Calendar opens your therapy calendar.',
        'Navigate days with arrows or the date picker (including past dates).',
        'Click a booking for details. Complete, reschedule, or add notes where allowed.',
        'New booking notifications appear in real time when admin schedules you.',
      ],
    },
    {
      id: 'leaves',
      title: 'Leave requests',
      steps: [
        'Leaves → Leave Management: submit leave with reason and dates.',
        'Track approval status on the dashboard or Leave History.',
        'If leave is approved, conflicting bookings may need admin action.',
      ],
    },
  ],
};

export const DOCTOR_USER_GUIDE: UserGuideContent = {
  role: 'DOCTOR',
  title: 'Doctor User Guide',
  introduction:
    'Manage your consultation schedule from the dashboard and calendar. View today, upcoming, and older consultations at a glance.',
  sections: [
    {
      id: 'login',
      title: 'Logging in',
      steps: [
        'Sign in with credentials provided by clinic admin.',
        'Open the Doctor Dashboard for a summary of your consultations.',
      ],
    },
    {
      id: 'dashboard',
      title: 'Dashboard',
      steps: [
        'Today\'s Schedule shows patients and times for today\'s consultations.',
        'Upcoming Consultations lists future appointments.',
        'Older Consultations shows past visits from the last 30 days with completion status.',
        'Use Refresh to update after new bookings are assigned to you.',
      ],
      tips: ['You receive a notification when a new consultation is booked for you.'],
    },
    {
      id: 'calendar',
      title: 'My Calendar',
      steps: [
        'Appointments → My Calendar for the full consultation calendar.',
        'Browse past and future dates to review patient visits.',
        'Open a booking to view patient details and session notes.',
      ],
    },
  ],
};

export function getUserGuideForRole(role: UserRole): UserGuideContent {
  if (role === 'ADMIN') return ADMIN_USER_GUIDE;
  if (role === 'DOCTOR') return DOCTOR_USER_GUIDE;
  return THERAPIST_USER_GUIDE;
}

export const ALL_USER_GUIDES = [ADMIN_USER_GUIDE, THERAPIST_USER_GUIDE, DOCTOR_USER_GUIDE];
