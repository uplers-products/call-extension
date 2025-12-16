import { configureStore } from '@reduxjs/toolkit';
import callReducer from './callSlice';
import authReducer from './authSlice';

const store = configureStore({
  reducer: {
    call: callReducer,
    auth: authReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export default store;