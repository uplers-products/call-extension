// Microphone Permission Types
export type MicPermissionStatus = 'granted' | 'denied' | 'prompt';

export interface MicPermissionResult {
  status: MicPermissionStatus;
  error?: string;
}
