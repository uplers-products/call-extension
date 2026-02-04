export const UPLERS_BASE_URL: string = 'https://platform.uplers.com';

// API URLs
export const API_URL: string = UPLERS_BASE_URL + '/api/';
export const RA_APP_URL: string = UPLERS_BASE_URL + '/api/app/';

export const API_GET_TALENT_DETAILS: string = API_URL + 'plivio/fetch-contact';
export const API_INITIATE_PLIVO_CALL: string = RA_APP_URL + 'job-candidates/plivio/initiate-call-ra';
export const API_END_PLIVO_CALL: string = RA_APP_URL + 'job-candidates/plivio/end-call-ra';
export const API_RECORD_PLIVO_CALL: string = RA_APP_URL + 'job-candidates/plivio/record-call-ra';

// Pusher Config (from environment variables)
export const PUSHER_APP_KEY: string = import.meta.env.VITE_PUSHER_APP_KEY || '';
export const PUSHER_APP_CLUSTER: string = import.meta.env.VITE_PUSHER_APP_CLUSTER || 'ap2';

// Audio – use extension asset when available, else CDN fallback
export const RING_TONE_URL: string =
  typeof chrome !== 'undefined' && chrome.runtime?.getURL
    ? chrome.runtime.getURL('audio/us-ring.mp3')
    : 'https://cdn.plivo.com/sdk/browser/audio/us-ring.mp3';