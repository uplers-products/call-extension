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

    // console.log('[Plivo] Pusher setup', 'user:', user, 'PUSHER_APP_KEY:', PUSHER_APP_KEY, 'PUSHER_APP_CLUSTER:', PUSHER_APP_CLUSTER);

    const PUSHER_CHANNEL = `recruiter-call-${(user as any).enc_id}`;
    const PUSHER_PROGRESS_EVENT = 'call_status_updated';

    const pusher = new Pusher(PUSHER_APP_KEY, {
      cluster: PUSHER_APP_CLUSTER,
    });

    pusher.connection.bind('error', (err: any) => {
      console.error('[Plivo] PUSHER connection error:', err);
    });

    const channel = pusher.subscribe(PUSHER_CHANNEL);

    channel.bind('pusher:subscription_error', (err: any) => {
      console.error('[Plivo] PUSHER subscription error:', err);
    });

    channel.bind(PUSHER_PROGRESS_EVENT, (data: PusherCallStatusData) => {
      console.log('[Plivo] PUSHER call status update:', data);

      dispatch(setCallStatus({
        status: data.status.toLowerCase().replace(' ', '') as CallStatus,
        message: data.message
      }));

      if (data.end_call) { resetCallState(); }
    });

    return () => {
      console.log('[Plivo] Cleaning up PUSHER on unmount');

      channel.unbind(PUSHER_PROGRESS_EVENT);
      pusher.unsubscribe(PUSHER_CHANNEL);
      pusher.disconnect();
    };
  }, [user, dispatch, resetCallState]);

  // PLIVO CLEANUP
  useEffect(() => {
    return () => {
      console.log('[Plivo] Cleaning up client on unmount');
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
      console.log('[Plivo] Existing client found, cleaning up old instance');
      plivoClientRef.current.client.logout();
      plivoClientRef.current = null;
    }

    const options: any = {
      debug: 'OFF',
      enableTracking: true,
      permOnClick: true, // Request mic permission on user action for better browser support
      audioConstraints: { audio: true }, // Ensure audio is enabled
      enableQualityTracking: 'ALL',
      username: (user as any).plivo_username,
      password: (user as any).enc_id,
    };

    console.log('[Plivo] initializePlivoClient:', options);

    try {
      const plivoClient = new Plivo(options);
      plivoClientRef.current = plivoClient;

      plivoClient.client.setRingToneBack(true);
      plivoClient.client.setConnectTone(true);

      // PLIVO EVENT LISTENERS
      const client = plivoClient.client as any;

      // PLIVO LOGIN
      if (!plivoClient.client?.isLoggedIn) {
        plivoClient.client.login((user as any).plivo_username, (user as any).enc_id);
      }

      // Media permission events
      client.on('onMediaPermission', (permissionInfo: any) => {
        console.log('[Plivo] onMediaPermission:', permissionInfo);

        if (permissionInfo && !permissionInfo.status) {
          console.error('[Plivo] Media permission was denied by browser');
          toast.error('Please allow microphone access to make calls.');
        }
      });

      client.on('onLogin', async () => {
        console.log('[Plivo] onLogin');

        // Initialize audio devices after successful login
        try {
          const audioDevices = plivoClient.client.audio;
          if (audioDevices) {
            // Reveal audio devices first to ensure they are available
            await audioDevices.revealAudioDevices('input');
            await audioDevices.revealAudioDevices('output');

            // Get available microphone devices
            const micDevices = await audioDevices.availableDevices('audioinput');
            console.log('[Plivo] Available microphone devices:', micDevices);
            
            // Set the default microphone if available
            if (micDevices && micDevices.length > 0) {
              const defaultMic = micDevices[0] as MediaDeviceInfo;
              audioDevices.microphoneDevices.set(defaultMic.deviceId);
              console.log('[Plivo] Microphone set to:', defaultMic.label || defaultMic.deviceId);
            }

            // Get available speaker devices
            const speakerDevices = await audioDevices.availableDevices('audiooutput');
            console.log('[Plivo] Available speaker devices:', speakerDevices);
            
            // Set the default speaker if available
            if (speakerDevices && speakerDevices.length > 0) {
              const defaultSpeaker = speakerDevices[0] as MediaDeviceInfo;
              audioDevices.speakerDevices.set(defaultSpeaker.deviceId);
              console.log('[Plivo] Speaker set to:', defaultSpeaker.label || defaultSpeaker.deviceId);
            }
          }
        } catch (audioError) {
          console.error('[Plivo] Error setting up audio devices:', audioError);
        }

        performCall();
      });

      client.on('onLoginFailed', (error: any) => {
        console.error('[Plivo] onLoginFailed:', error);

        dispatch(setCallStatus({ status: 'failed', message: 'Login failed' }));
        stopRinging();
      });

      client.on('onError', (error: any) => {
        console.error('[Plivo] onError:', error);
      });

      client.on('onIncomingCall', (callInfo: { callUUID: string }) => {
        console.log('[Plivo] onIncomingCall:', callInfo);

        dispatch(setCallStatus({ status: 'connecting' }));
        stopRinging();

        plivoClient.client.answer(callInfo.callUUID, 'reject');
      });

      client.on('onCalling', () => {
        console.log('[Plivo] onCalling');

        // Ensure microphone is unmuted when call starts
        try {
          if (plivoClient.client) {
            plivoClient.client.unmute();
            console.log('[Plivo] Microphone unmuted on calling');
          }
        } catch (unmuteError) {
          console.error('[Plivo] Error unmuting on calling:', unmuteError);
        }

        dispatch(setCallStatus({ status: 'calling' }));
        setIsCallMuted(false);
      });

      client.on('onCallAnswered', async (callInfo: { callUUID: string }) => {
        console.log('[Plivo] onCallAnswered:', callInfo);

        // Ensure microphone is unmuted when call is answered
        try {
          if (plivoClient.client) {
            plivoClient.client.unmute();
            console.log('[Plivo] Microphone unmuted on call answer');
          }
        } catch (unmuteError) {
          console.error('[Plivo] Error unmuting microphone:', unmuteError);
        }

        dispatch(startCall({ callId: callInfo.callUUID }));
        recordCall(callInfo.callUUID);
        stopRinging();
        setIsCallMuted(false);
      });

      client.on('onCallTerminated', (callInfo: any) => {
        console.log('[Plivo] onCallTerminated:', callInfo);

        resetCallState();
        dispatch(setCallStatus({ status: 'ended' }));
      });

      client.on('onCallFailed', (error: any) => {
        console.error('[Plivo] onCallFailed:', error);

        dispatch(setCallStatus({ status: 'failed', message: 'Call failed' }));
        stopRinging();
      });

      // Listen for audio device changes
      client.on('onAudioDeviceChange', async (deviceInfo: any) => {
        console.log('[Plivo] onAudioDeviceChange:', deviceInfo);
        
        // Re-initialize microphone if device changes
        try {
          const audioDevices = plivoClient.client.audio;
          if (audioDevices) {
            const micDevices = await audioDevices.availableDevices('audioinput');
            if (micDevices && micDevices.length > 0) {
              const defaultMic = micDevices[0] as MediaDeviceInfo;
              audioDevices.microphoneDevices.set(defaultMic.deviceId);
              console.log('[Plivo] Microphone re-set after device change');
            }
          }
        } catch (deviceError) {
          console.error('[Plivo] Error handling device change:', deviceError);
        }
      });

      // Listen for connection quality
      client.on('onConnectionChange', (connectionInfo: any) => {
        console.log('[Plivo] onConnectionChange:', connectionInfo);
      });

    } catch (error) {
      console.error('[Plivo] Error initializing client:', error);
      dispatch(setCallStatus({ status: 'failed', message: 'Failed to initialize' }));
    }
  };

  // Perform Call API
  const performCall = async () => {
    if (isActionLoading || !talentData) return;
    setIsActionLoading(true);

    console.log('[Plivo] performCall:', talentData);

    dispatch(setCallStatus({ status: 'initiating', message: '' }));
    startRinging();

    try {
      const payload = {
        contact_number: talentData.contact_number || '',
      };

      const res = await initiatePlivoCall(payload);

      if (res?.status === 200 && res.data) {
        atsCallIdRef.current = res.data.ats_call_id;
        dispatch(setAtsCallId(res.data.ats_call_id));
        dispatch(setCallStatus({ status: 'connecting' }));
      } else {
        throw new Error('[Plivo] Failed to initiate call');
      }
    } catch (error) {
      console.error('[Plivo] Error initiating call:', error);

      dispatch(setCallStatus({ status: 'failed', message: 'Call initiation failed' }));
      stopRinging();
      toast.error('Error initiating call.');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Record Call
  const recordCall = async (callUUID: string) => {
    try {
      const res = await recordPlivoCall({ call_id: callUUID, ats_call_id: atsCallIdRef.current });
      console.log('[Plivo] recordCall:', res);
    } catch (error) {
      console.error('[Plivo] Error recording call:', error);
    }
  };

  // PUBLIC METHODS ---------------------------------------------------
  const initiateCall = async (talent: TalentData) => {
    dispatch(openCallPopup(talent));
    setCountdown(5);
  };

  const handleEndCall = async () => {
    if (isActionLoading) return;
    setIsActionLoading(true);

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
      console.error('[Plivo] Error ending call:', error);
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

  // LOGS ---------------------------------------------------
  // console.log('plivoClientRef:', plivoClientRef.current);



  // CONTEXT VALUE ---------------------------------------------------
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
