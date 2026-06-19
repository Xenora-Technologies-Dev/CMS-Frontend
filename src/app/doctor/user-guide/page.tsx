'use client';

import { UserGuideViewer } from '@/components/user-guide/user-guide-viewer';
import { DOCTOR_USER_GUIDE } from '@/content/user-guide-content';

export default function DoctorUserGuidePage() {
  return <UserGuideViewer guide={DOCTOR_USER_GUIDE} />;
}
