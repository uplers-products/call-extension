import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { CallStatus, TalentData, CallState } from '../types/common.types';

// Re-export types for convenience
export type { CallStatus, TalentData, CallState };

const initialState: CallState = {
  isCalling: false,
  isMinimized: false,
  talentData: null,
  callId: null,
  atsCallId: null,
  callStatus: 'idle',
  callMessage: '',
  callPopupOpen: false,
};

const callSlice = createSlice({
  name: 'call',
  initialState,
  reducers: {
    openCallPopup: (state, action: PayloadAction<TalentData>) => {
      state.callPopupOpen = true;
      state.talentData = action.payload;
      state.isMinimized = false;
      state.callStatus = 'acquiring';
      state.callMessage = '';
    },
    startCall: (state, action: PayloadAction<{ callId: string }>) => {
      state.isCalling = true;
      state.callId = action.payload.callId;
      state.callStatus = 'connected';
    },
    setAtsCallId: (state, action: PayloadAction<string>) => {
      state.atsCallId = action.payload;
    },
    setCallStatus: (state, action: PayloadAction<{ status: CallStatus; message?: string }>) => {
      state.callStatus = action.payload.status;
      if (action.payload.message !== undefined) {
        state.callMessage = action.payload.message;
      }
    },
    endCall: (state) => {
      state.isCalling = false;
      state.callId = null;
      state.atsCallId = null;
      state.callStatus = 'ended';
    },
    closeCallPopup: (state) => {
      state.callPopupOpen = false;
      state.isCalling = false;
      state.isMinimized = false;
      state.talentData = null;
      state.callId = null;
      state.atsCallId = null;
      state.callStatus = 'idle';
      state.callMessage = '';
    },
    toggleMinimize: (state) => {
      state.isMinimized = !state.isMinimized;
    },
    setMinimized: (state, action: PayloadAction<boolean>) => {
      state.isMinimized = action.payload;
    }
  }
});

export const { 
  openCallPopup,
  startCall, 
  setAtsCallId,
  setCallStatus,
  endCall, 
  closeCallPopup,
  toggleMinimize,
  setMinimized
} = callSlice.actions;

export default callSlice.reducer;