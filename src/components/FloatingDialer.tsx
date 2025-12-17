import React, { useState, useRef, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Phone, X, Delete } from 'lucide-react';
import type { RootState } from '../store/store';
import { requestMicPermission } from '../common/Helpers';
import { usePlivo } from '../context/PlivoContext';
import toast, { Toaster } from 'react-hot-toast';

const FloatingDialer: React.FC = () => {
  const { initiateCall } = usePlivo();
  const { isCalling, callPopupOpen } = useSelector((state: RootState) => state.call);
  const [isOpen, setIsOpen] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleDial = (digit: string) => {
    if (phoneNumber.length < 10) {
      setPhoneNumber(prev => prev + digit);
    }
  };

  const handleBackspace = () => {
    setPhoneNumber(prev => prev.slice(0, -1));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 10);
    setPhoneNumber(value);
  };

  const handleCall = async () => {
    if (phoneNumber.length !== 10 || isCalling || callPopupOpen || isLoading) return;

    setIsLoading(true);

    try {
      // Check and request microphone permission first
      const permissionResult = await requestMicPermission();

      if (permissionResult.status !== 'granted') {
        setIsLoading(false);
        toast.error(permissionResult.error || 'Please allow microphone access to make calls.');
        return;
      }

      // Initiate call via Plivo Context
      await initiateCall({
        name: phoneNumber,
        photoUrl: '',
        contact_number: phoneNumber,
      });

      setIsOpen(false);
      setPhoneNumber('');
    } catch (e) {
      console.error("Failed to start call", e);
      toast.error('Failed to start call. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const dialPadButtons = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
  ];

  // Common toast options
  const toastOptions = {
    duration: 4000,
    error: {
      style: {
        background: 'linear-gradient(135deg, #ff4444 0%, #cc0000 100%)',
        color: 'white',
      },
    },
  };

  return (
    <>
      {/* Toast container - renders in different locations based on modal state */}
      {!isOpen && (
        <Toaster
          position="top-right"
          containerStyle={{
            zIndex: 2147483647,
            marginTop: '4rem',
          }}
          toastOptions={toastOptions}
        />
      )}

      {/* Floating CTA Button */}
      <button
        className="ext-floating-dialer-btn"
        onClick={() => setIsOpen(true)}
        disabled={isCalling || callPopupOpen}
        title="Open Dialer"
      >
        <Phone size={20} />
      </button>

      {/* Dialer Modal */}
      {isOpen && (
        <div className="ext-dialer-overlay" onClick={() => setIsOpen(false)}>
          {/* Toast container inside overlay so it appears above the modal */}
          <Toaster
            position="top-center"
            containerStyle={{
              position: 'absolute',
              top: '1rem',
              left: '50%',
              transform: 'translateX(-50%)',
            }}
            toastOptions={toastOptions}
          />
          <div className="ext-dialer-modal" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="ext-dialer-header">
              <span>Direct Dial</span>
              <button className="ext-dialer-close" onClick={() => setIsOpen(false)}>
                <X size={18} />
              </button>
            </div>

            {/* Phone Number Display */}
            <div className="ext-dialer-display">
              <input
                ref={inputRef}
                type="tel"
                value={phoneNumber}
                onChange={handleInputChange}
                placeholder="Enter 10 digit number"
                className="ext-dialer-input"
                maxLength={10}
              />
              {phoneNumber && (
                <button className="ext-dialer-backspace" onClick={handleBackspace}>
                  <Delete size={18} />
                </button>
              )}
            </div>

            {/* Dial Pad */}
            <div className="ext-dialpad">
              {dialPadButtons.map((row, rowIndex) => (
                <div key={rowIndex} className="ext-dialpad-row">
                  {row.map((digit) => (
                    <button
                      key={digit}
                      className="ext-dialpad-btn"
                      onClick={() => handleDial(digit)}
                      disabled={phoneNumber.length >= 10}
                    >
                      {digit}
                    </button>
                  ))}
                </div>
              ))}
              {/* Last row with just 0 */}
              <div className="ext-dialpad-row">
                <button
                  className="ext-dialpad-btn ext-dialpad-zero"
                  onClick={() => handleDial('0')}
                  disabled={phoneNumber.length >= 10}
                >
                  0
                </button>
              </div>
            </div>

            {/* Call Button */}
            <button
              className="ext-dialer-call-btn"
              onClick={handleCall}
              disabled={phoneNumber.length !== 10 || isCalling || callPopupOpen || isLoading}
            >
              <Phone size={20} />
              <span>{isLoading ? 'Checking...' : 'Call'}</span>
            </button>
          </div>
        </div>
      )}

    </>
  );
};

export default FloatingDialer;
