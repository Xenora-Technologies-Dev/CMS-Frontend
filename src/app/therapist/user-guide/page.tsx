'use client';

import { UserGuideViewer } from '@/components/user-guide/user-guide-viewer';
import { THERAPIST_USER_GUIDE } from '@/content/user-guide-content';

export default function TherapistUserGuidePage() {
  return <UserGuideViewer guide={THERAPIST_USER_GUIDE} />;
}
