'use client';

import { RoomForm } from '@/components/room/room-form';
import { use } from 'react';

interface EditRoomPageProps {
  params: Promise<{ id: string }>;
}

export default function EditRoomPage({ params }: EditRoomPageProps) {
  const { id } = use(params);
  return <RoomForm mode="edit" roomId={id} />;
}
