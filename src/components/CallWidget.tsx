import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../store/store';
import { endCall, toggleMinimize } from '../store/callSlice';
import { Mic, MicOff, PhoneOff, Minimize2, Maximize2, X } from 'lucide-react';

const CallWidget: React.FC = () => {
    const dispatch = useDispatch();
    const { isCalling, isMinimized, talentData } = useSelector((state: RootState) => state.call);

    const [duration, setDuration] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState('Connecting...');

    // Timer & Status Logic
    useEffect(() => {
        let interval: number;
        if (isCalling) {
            // Simulate connection delay for realism
            if (duration === 0) {
                setTimeout(() => setConnectionStatus('Connected'), 1500);
            }

            interval = setInterval(() => {
                setDuration(prev => prev + 1);
            }, 1000);
        } else {
            setDuration(0);
            setConnectionStatus('Connecting...');
        }
        return () => clearInterval(interval);
    }, [isCalling, duration]);

    // Helper: Format Time (00:00)
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    // Only render if calling
    if (!isCalling) return null;

    return (
        <div className={`ext-widget-container ${isMinimized ? 'ext-widget-minimized' : ''}`}>
            {/* Header (Acts as the Minimized View) */}
            <div className="ext-widget-header" onClick={() => dispatch(toggleMinimize())}>

                {/* LEFT SIDE: Info */}
                <div className="ext-header-info">
                    <span className="ext-header-name">
                        {talentData?.name || 'Unknown Candidate'}
                    </span>

                    {/* Show Status/Timer when minimized or always if you prefer */}
                    <div className="ext-header-status">
                        {connectionStatus === 'Connected' ? (
                            <>
                                <span className="ext-dot-indicator"></span>
                                {formatTime(duration)}
                            </>
                        ) : (
                            <span>{connectionStatus}</span>
                        )}
                    </div>
                </div>

                {/* RIGHT SIDE: Controls */}
                <div className="ext-header-controls">
                    {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}

                    {/* CLOSE BUTTON LOGIC:
               Only show the 'X' button if we are NOT in a call.
               Since this widget currently only exists while calling, 
               this X button is effectively hidden to prevent accidental closing.
            */}
                    {!isCalling && (
                        <div
                            onClick={(e) => { e.stopPropagation(); dispatch(endCall()); }}
                            className="ext-close-icon"
                        >
                            <X size={16} />
                        </div>
                    )}
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
                        <span className="ext-status-text">{connectionStatus}</span>
                        <span className="ext-timer-large">{formatTime(duration)}</span>
                    </div>

                    <div className="ext-controls">
                        <button
                            className={`ext-icon-btn ${isMuted ? 'btn-muted-active' : 'btn-mute'}`}
                            onClick={() => setIsMuted(!isMuted)}
                        >
                            {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
                        </button>

                        <button
                            className="ext-icon-btn btn-hangup"
                            onClick={() => dispatch(endCall())}
                        >
                            <PhoneOff size={22} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CallWidget;