import type { MicPermissionStatus, MicPermissionResult } from '../types/common.types';

/**
 * Check the current microphone permission status
 */
export const checkMicPermission = async (): Promise<MicPermissionStatus> => {
  try {
    const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
    return result.state as MicPermissionStatus;
  } catch {
    // Fallback for browsers that don't support permissions API for microphone
    return 'prompt';
  }
};

/**
 * Request microphone permission by attempting to access the microphone
 * Returns the permission status after the request
 */
export const requestMicPermission = async (): Promise<MicPermissionResult> => {
  try {
    // First check current status
    const currentStatus = await checkMicPermission();
    
    if (currentStatus === 'granted') {
      return { status: 'granted' };
    }
    
    if (currentStatus === 'denied') {
      return { 
        status: 'denied',
        error: 'Microphone permission was denied. Please allow microphone access in your browser settings.'
      };
    }
    
    // If prompt, request permission by accessing the microphone
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    // Stop all tracks immediately after getting permission
    stream.getTracks().forEach(track => track.stop());
    
    return { status: 'granted' };
  } catch (error) {
    const err = error as Error;
    
    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
      return { 
        status: 'denied',
        error: 'Microphone permission denied. Please allow microphone access to make calls.'
      };
    }
    
    if (err.name === 'NotFoundError') {
      return { 
        status: 'denied',
        error: 'No microphone found. Please connect a microphone to make calls.'
      };
    }
    
    return { 
      status: 'denied',
      error: 'Failed to access microphone. Please check your device settings.'
    };
  }
};
