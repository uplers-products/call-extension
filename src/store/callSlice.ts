import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface TalentData {
  name: string;
  photoUrl: string;
  contact_number?: string;
}

interface CallState {
  isCalling: boolean;
  isMinimized: boolean;
  talentData: TalentData | null;
}

const initialState: CallState = {
  isCalling: false,
  isMinimized: false,
  talentData: null,
};

const callSlice = createSlice({
  name: 'call',
  initialState,
  reducers: {
    startCall: (state, action: PayloadAction<TalentData>) => {
      state.isCalling = true;
      state.talentData = action.payload;
      state.isMinimized = false;
    },
    endCall: (state) => {
      state.isCalling = false;
      state.talentData = null;
    },
    toggleMinimize: (state) => {
      state.isMinimized = !state.isMinimized;
    }
  }
});

export const { startCall, endCall, toggleMinimize } = callSlice.actions;
export default callSlice.reducer;