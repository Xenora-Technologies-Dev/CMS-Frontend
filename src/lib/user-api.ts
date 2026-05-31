import { apiRequest } from './api';

export async function resetUserPassword(
  userId: string,
  password: string,
): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>(`/users/${userId}/reset-password`, {
    method: 'POST',
    body: { password },
  });
}
