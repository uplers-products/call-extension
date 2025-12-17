import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Plivo from 'plivo-browser-sdk';
import Pusher from 'pusher-js';
import type { RootState } from '../store/store';
import { 
  openCallPopup,
  startCall, 
  setAtsCallId, 
  setCallStatus, 
  endCall,
  closeCallPopup
} from '../store/callSlice';
import { initiatePlivoCall, endPlivoCall, recordPlivoCall } from '../services/userActions';
import { PUSHER_APP_KEY, PUSHER_APP_CLUSTER, RING_TONE_URL } from '../constant/constant';
import type { TalentData, CallStatus, PlivoContextType, PusherCallStatusData } from '../types/common.types';
import toast from 'react-hot-toast';

const PlivoContext = createContext<PlivoContextType | null>(null);

export const usePlivo = (): PlivoContextType => {
  const context = useContext(PlivoContext);
  if (!context) {
    throw new Error('usePlivo must be used within PlivoProvider');
  }
  return context;
};

export const PlivoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);
  const { talentData, callId, callPopupOpen } = useSelector((state: RootState) => state.call);

  const plivoClientRef = useRef<any>(null);
  const atsCallIdRef = useRef<string>('');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [isActionLoading, setIsActionLoading] = useState(false);
  const [isCallMuted, setIsCallMuted] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Audio helpers
  const startRinging = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.play().catch(console.error);
    }
  }, []);

  const stopRinging = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, []);

  // Reset call state
  const resetCallState = useCallback(() => {
    dispatch(endCall());
    atsCallIdRef.current = '';
    stopRinging();
    setIsCallMuted(false);
  }, [dispatch, stopRinging]);

  // PUSHER SETUP
  useEffect(() => {
    if (!user || !(user as any).enc_id) return;

    const PUSHER_CHANNEL = `recruiter-call-${(user as any).enc_id}`;
    const PUSHER_PROGRESS_EVENT = 'call_status_updated';

    const pusher = new Pusher(PUSHER_APP_KEY, {
      cluster: PUSHER_APP_CLUSTER,
    });

    pusher.connection.bind('error', (err: any) => {
      console.error('Pusher connection error:', err);
    });

    const channel = pusher.subscribe(PUSHER_CHANNEL);

    channel.bind('pusher:subscription_error', (err: any) => {
      console.error('Pusher subscription error:', err);
    });

    channel.bind(PUSHER_PROGRESS_EVENT, (data: PusherCallStatusData) => {
      console.log('Pusher data:', data);
      dispatch(setCallStatus({ 
        status: data.status.toLowerCase().replace(' ', '') as CallStatus, 
        message: data.message 
      }));
      if (data.end_call) {
        resetCallState();
      }
    });

    return () => {
      console.log('Cleaning up Pusher on unmount');
      channel.unbind(PUSHER_PROGRESS_EVENT);
      pusher.unsubscribe(PUSHER_CHANNEL);
      pusher.disconnect();
    };
  }, [user, dispatch, resetCallState]);

  // PLIVO CLEANUP
  useEffect(() => {
    return () => {
      console.log('Cleaning up Plivo client on unmount');
      if (plivoClientRef.current) {
        plivoClientRef.current.client.logout();
        plivoClientRef.current = null;
      }
    };
  }, []);

  // COUNTDOWN TIMER
  useEffect(() => {
    if (countdown > 0) {
      const countdownTimer = setInterval(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
      return () => clearInterval(countdownTimer);
    } else if (countdown === 0 && callPopupOpen && talentData && (user as any)?.plivo_username) {
      if (plivoClientRef.current) {
        performCall();
      } else {
        initializePlivoClient();
      }
    }
  }, [countdown, callPopupOpen, talentData, user]);

  // Initialize Plivo Client
  const initializePlivoClient = async () => {
    if (plivoClientRef.current) {
      console.log('Existing Plivo client found, cleaning up old instance');
      plivoClientRef.current.client.logout();
      plivoClientRef.current = null;
    }

    console.log('Plivo Client Initialization');

    const options = {
      debug: 'DEBUG' as const,
      enableTracking: true,
      username: (user as any).plivo_username,
      password: (user as any).enc_id,
    };

    try {
      const plivoClient = new Plivo(options);
      plivoClientRef.current = plivoClient;

      plivoClient.client.setRingToneBack(true);
      plivoClient.client.setConnectTone(true);

      if (!plivoClient.client?.isLoggedIn) {
        plivoClient.client.login((user as any).plivo_username, (user as any).enc_id);
      }

      // PLIVO EVENT LISTENERS
      const client = plivoClient.client as any;
      
      client.on('onLogin', () => {
        console.log('Plivo - Login successful');
        performCall();
      });

      client.on('onLoginFailed', (error: any) => {
        console.log('Plivo - Login failed:', error);
        dispatch(setCallStatus({ status: 'failed', message: 'Login failed' }));
        stopRinging();
      });

      client.on('onError', (error: any) => {
        console.error('Plivo - Error:', error);
      });

      client.on('onIncomingCall', (callInfo: { callUUID: string }) => {
        console.log('Plivo - Incoming call');
        dispatch(setCallStatus({ status: 'connecting' }));
        stopRinging();
        plivoClient.client.answer(callInfo.callUUID, 'reject');
      });

      client.on('onCalling', () => {
        console.log('Plivo - onCalling');
        dispatch(setCallStatus({ status: 'calling' }));
      });

      client.on('onCallAnswered', (callInfo: { callUUID: string }) => {
        console.log('Plivo - onCallAnswered:', callInfo);
        dispatch(startCall({ callId: callInfo.callUUID }));
        recordCall(callInfo.callUUID);
        stopRinging();
      });

      client.on('onCallTerminated', () => {
        console.log('Plivo - onCallTerminated');
        resetCallState();
        dispatch(setCallStatus({ status: 'ended' }));
      });

    } catch (error) {
      console.error('Error initializing Plivo client:', error);
      dispatch(setCallStatus({ status: 'failed', message: 'Failed to initialize' }));
    }
  };

  // Perform Call API
  const performCall = async () => {
    if (isActionLoading || !talentData) return;
    setIsActionLoading(true);

    console.log('Initiating Call');
    dispatch(setCallStatus({ status: 'initiating', message: '' }));
    startRinging();

    try {
      const payload = {
        contact_number: talentData.contact_number || '',
        hr_id: talentData.hr_id,
        talent_id: talentData.talent_id,
      };

      const res = await initiatePlivoCall(payload);
      
      if (res?.status === 200 && res.data) {
        atsCallIdRef.current = res.data.ats_call_id;
        dispatch(setAtsCallId(res.data.ats_call_id));
        dispatch(setCallStatus({ status: 'connecting' }));
      } else {
        throw new Error(res?.message || 'Failed to initiate call');
      }
    } catch (error) {
      console.error('Error initiating call:', error);
      dispatch(setCallStatus({ status: 'failed', message: 'Call initiation failed' }));
      stopRinging();
      toast.error('Failed to initiate call. Please try again.');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Record Call
  const recordCall = async (callUUID: string) => {
    try {
      const res = await recordPlivoCall({ 
        call_id: callUUID, 
        ats_call_id: atsCallIdRef.current 
      });
      console.log('Initiated recording call:', res);
    } catch (error) {
      console.error('Error recording call:', error);
    }
  };

  // PUBLIC METHODS

  const initiateCall = async (talent: TalentData) => {
    dispatch(openCallPopup(talent));
    setCountdown(5);
  };

  const handleEndCall = async () => {
    if (isActionLoading) return;
    setIsActionLoading(true);

    console.log('Ending Call');
    try {
      const res = await endPlivoCall({ call_id: callId || '' });
      
      if (res?.status === 200) {
        if (plivoClientRef.current?.client) {
          plivoClientRef.current.client.hangup();
        }
        dispatch(setCallStatus({ status: 'ended' }));
        resetCallState();
      }
    } catch (error) {
      console.error('Error ending call:', error);
      toast.error('Failed to end call.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleMute = () => {
    if (plivoClientRef.current?.client) {
      plivoClientRef.current.client.mute();
    }
    setIsCallMuted(true);
  };

  const handleUnmute = () => {
    if (plivoClientRef.current?.client) {
      plivoClientRef.current.client.unmute();
    }
    setIsCallMuted(false);
  };

  const handleCallback = () => {
    setCountdown(5);
    dispatch(setCallStatus({ status: 'acquiring', message: '' }));
  };

  const handleClosePopup = () => {
    if (plivoClientRef.current?.client) {
      plivoClientRef.current.client.hangup();
    }
    dispatch(closeCallPopup());
    stopRinging();
    setIsCallMuted(false);
  };

  const contextValue: PlivoContextType = {
    initiateCall,
    handleEndCall,
    handleMute,
    handleUnmute,
    handleCallback,
    handleClosePopup,
    isActionLoading,
    isCallMuted,
    countdown,
  };

  return (
    <PlivoContext.Provider value={contextValue}>
      {/* Hidden audio element for ringtone */}
      <audio ref={audioRef} src={RING_TONE_URL} loop />
      {children}
    </PlivoContext.Provider>
  );
};

export default PlivoContext;
