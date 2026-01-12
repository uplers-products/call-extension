// Microphone Permission Types
export type MicPermissionStatus = 'granted' | 'denied' | 'prompt';

export interface MicPermissionResult {
  status: MicPermissionStatus;
  error?: string;
}

// Call Status Types
export type CallStatus = 
  | 'idle' 
  | 'acquiring' 
  | 'initiating' 
  | 'connecting' 
  | 'calling' 
  | 'connected' 
  | 'ended' 
  | 'failed';

// Talent Data Interface
export interface TalentData {
  name: string;
  photoUrl: string;
  contact_number?: string;
  hr_id?: string;
  talent_id?: string;
  call_source?: 1 | 2;
}

// Call State Interface
export interface CallState {
  isCalling: boolean;
  isMinimized: boolean;
  talentData: TalentData | null;
  callId: string | null;
  atsCallId: string | null;
  callStatus: CallStatus;
  callMessage: string;
  callPopupOpen: boolean;
}

// API Types
export interface ApiResponse<T = unknown> {
  status: number;
  data?: T;
  message?: string;
}

export interface InitiateCallPayload {
  contact_number: string;
  page_url: string;
  is_uplers_connect: boolean;
  call_source: 1 | 2;
}

export interface RecordCallPayload {
  // call_id: string; // not required
  ats_call_id: string;
}

export interface EndCallPayload {
  call_id: string;
}

export interface FetchTalentDetailsPayload {
  linkedin_url: string;
}

export interface InitiateCallResponse {
  ats_call_id: string;
}

// Plivo Context Types
export interface PlivoContextType {
  initiateCall: (talentData: TalentData) => Promise<void>;
  handleEndCall: () => Promise<void>;
  handleMute: () => void;
  handleUnmute: () => void;
  handleCallback: () => void;
  handleClosePopup: () => void;
  isActionLoading: boolean;
  isCallMuted: boolean;
  countdown: number;
}

// Pusher Event Data
export interface PusherCallStatusData {
  status: string;
  message?: string;
  end_call?: boolean;
}
