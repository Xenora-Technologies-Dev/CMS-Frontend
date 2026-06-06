/** Socket.IO event names — must match backend `socket/events.ts`. */
export const SocketEvents = {
  CONNECTED: 'connected',
  NOTIFICATION: 'notification',
  BOOKING_UPDATED: 'booking:updated',
  SCHEDULE_UPDATED: 'schedule:updated',
  LEAVE_UPDATED: 'leave:updated',
  PACKAGE_CREATED: 'package:created',
  PACKAGE_COMPLETED: 'package:completed',
  LEAVE_CONFLICT: 'leave:conflict',
} as const;

export type SocketEventName = (typeof SocketEvents)[keyof typeof SocketEvents];
