'use client';

import { UserGuideViewer } from '@/components/user-guide/user-guide-viewer';
import { ADMIN_USER_GUIDE } from '@/content/user-guide-content';

export default function AdminUserGuidePage() {
  return <UserGuideViewer guide={ADMIN_USER_GUIDE} />;
}
