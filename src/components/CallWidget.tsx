import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../store/store';
import { toggleMinimize } from '../store/callSlice';
import { usePlivo } from '../context/PlivoContext';
import { Mic, MicOff, PhoneOff, Minimize2, Maximize2, X, Phone } from 'lucide-react';

// Helper function to format call status for display
const formatCallStatus = (status: string): string => {
    const statusMap: Record<string, string> = {
        'idle': 'Idle',
        'acquiring': 'Acquiring details',
        'initiating': 'Initiating Call',
        'connecting': 'Connecting',
        'calling': 'Calling',
        'connected': 'Connected',
        'ended': 'Call Ended',
        'failed': 'Call Failed',
    };
    return statusMap[status] || status;
};

// Helper: Format Time (00:00)
const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

const CallWidget: React.FC = () => {
    const dispatch = useDispatch();
    const { 
        isCalling, 
        isMinimized, 
        talentData, 
        callPopupOpen,
        callStatus,
        callMessage
    } = useSelector((state: RootState) => state.call);

    const {
        handleEndCall,
        handleMute,
        handleUnmute,
        handleCallback,
        handleClosePopup,
        isCallMuted,
        countdown,
        isActionLoading,
    } = usePlivo();

    const [duration, setDuration] = useState(0);

    // Call duration timer
    useEffect(() => {
        let interval: number;
        if (callStatus === 'connected') {
            interval = window.setInterval(() => {
                setDuration(prev => prev + 1);
            }, 1000);
        } else {
            setDuration(0);
        }
        return () => clearInterval(interval);
    }, [callStatus]);

    // Only render if popup is open
    if (!callPopupOpen) return null;

    const displayStatus = callMessage 
        ? `${formatCallStatus(callStatus)} - ${callMessage}` 
        : formatCallStatus(callStatus);

    const showCallbackButton = callStatus === 'ended' || callStatus === 'failed';

    return (
        <div className={`ext-widget-container ${isMinimized ? 'ext-widget-minimized' : ''}`}>
            {/* Header (Acts as the Minimized View) */}
            <div className="ext-widget-header" onClick={() => countdown <= 0 && dispatch(toggleMinimize())}>

                {/* LEFT SIDE: Info */}
                <div className="ext-header-info">
                    <span className="ext-header-name">
                        {talentData?.name || 'Unknown Candidate'}
                        {talentData?.contact_number && talentData.contact_number !== talentData.name && (
                            <span className="ext-header-phone"> • {talentData.contact_number}</span>
                        )}
                    </span>

                    {/* Show Status/Timer */}
                    <div className="ext-header-status">
                        {countdown > 0 ? (
                            <span>Calling in {countdown} seconds</span>
                        ) : callStatus === 'connected' ? (
                            <>
                                <span className="ext-dot-indicator"></span>
                                {formatTime(duration)}
                            </>
                        ) : (
                            <span>{displayStatus}</span>
                        )}
                    </div>
                </div>

                {/* RIGHT SIDE: Controls */}
                <div className="ext-header-controls">
                    {countdown <= 0 && (isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />)}
                </div>
            </div>

            {/* Body (Hidden if Minimized) */}
            {!isMinimized && (
                <div className="ext-widget-body">
                    <div className="ext-avatar-wrapper">
                        <img
                            src={talentData?.photoUrl || chrome.runtime.getURL('images/placeholder-talent-dp.jpg')}
                            className="ext-avatar"
                            alt="Profile"
                        />
                    </div>

                    <div className="ext-call-meta">
                        {countdown > 0 ? (
                            <span className="ext-status-text">Calling in {countdown} seconds</span>
                        ) : (
                            <>
                                <span className="ext-status-text">{displayStatus}</span>
                                {callStatus === 'connected' && (
                                    <span className="ext-timer-large">{formatTime(duration)}</span>
                                )}
                            </>
                        )}
                    </div>

                    <div className="ext-controls">
                        {isCalling ? (
                            <>
                                <div className="ext-control-item">
                                    <button
                                        className={`ext-icon-btn ${isCallMuted ? 'btn-muted-active' : 'btn-mute'}`}
                                        onClick={isCallMuted ? handleUnmute : handleMute}
                                        disabled={isActionLoading}
                                    >
                                        {isCallMuted ? <MicOff size={20} /> : <Mic size={20} />}
                                    </button>
                                    <span className="ext-control-label">
                                        {isCallMuted ? 'Unmute' : 'Mute'}
                                    </span>
                                </div>

                                <div className="ext-control-item">
                                    <button
                                        className="ext-icon-btn btn-hangup"
                                        onClick={handleEndCall}
                                        disabled={isActionLoading}
                                    >
                                        <PhoneOff size={22} />
                                    </button>
                                    <span className="ext-control-label">End Call</span>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="ext-control-item">
                                    <button
                                        className="ext-icon-btn btn-close"
                                        onClick={handleClosePopup}
                                        disabled={isActionLoading}
                                    >
                                        <X size={20} />
                                    </button>
                                    <span className="ext-control-label">Close</span>
                                </div>

                                {showCallbackButton && (
                                    <div className="ext-control-item">
                                        <button
                                            className="ext-icon-btn btn-callback"
                                            onClick={handleCallback}
                                            disabled={isActionLoading}
                                        >
                                            <Phone size={20} />
                                        </button>
                                        <span className="ext-control-label">Call Back</span>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default CallWidget;