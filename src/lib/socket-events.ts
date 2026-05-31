/** Socket.IO event names — must match backend `socket/events.ts`. */
export const SocketEvents = {
  CONNECTED: 'connected',
  NOTIFICATION: 'notification',
  BOOKING_UPDATED: 'booking:updated',
  SCHEDULE_UPDATED: 'schedule:updated',
  LEAVE_UPDATED: 'leave:updated',
} as const;

export type SocketEventName = (typeof SocketEvents)[keyof typeof SocketEvents];
