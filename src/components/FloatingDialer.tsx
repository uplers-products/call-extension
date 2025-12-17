import React, { useState, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Phone, X, Delete } from 'lucide-react';
import { startCall } from '../store/callSlice';
import type { RootState } from '../store/store';

const FloatingDialer: React.FC = () => {
  const dispatch = useDispatch();
  const isCalling = useSelector((state: RootState) => state.call.isCalling);
  const [isOpen, setIsOpen] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
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

  const handleCall = () => {
    if (phoneNumber.length !== 10 || isCalling) return;

    dispatch(startCall({
      name: phoneNumber,
      photoUrl: '',
      contact_number: phoneNumber,
    }));

    setIsOpen(false);
    setPhoneNumber('');
  };

  const dialPadButtons = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
  ];

  return (
    <>
      {/* Floating CTA Button */}
      <button
        className="ext-floating-dialer-btn"
        onClick={() => setIsOpen(true)}
        disabled={isCalling}
        title="Open Dialer"
      >
        <Phone size={20} />
      </button>

      {/* Dialer Modal */}
      {isOpen && (
        <div className="ext-dialer-overlay" onClick={() => setIsOpen(false)}>
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
              disabled={phoneNumber.length !== 10 || isCalling}
            >
              <Phone size={20} />
              <span>Call</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default FloatingDialer;
