import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Phone } from 'lucide-react';
import { startCall } from '../store/callSlice';
import type { RootState } from '../store/store';

const CallButton: React.FC = () => {
  const dispatch = useDispatch();
  const isCalling = useSelector((state: RootState) => state.call.isCalling);
  const [loading, setLoading] = useState(false);

  const handleFetchAndCall = async () => {
    if (isCalling) return;
    setLoading(true);

    try {
      // 1. Scrape Data from DOM
      const name = document.querySelector('h1')?.innerText || "Unknown";
      const photoEl = document.querySelector('.pv-top-card-profile-picture__image--show') as HTMLImageElement;
      const photoUrl = photoEl?.src || "";

      // 2. Simulate API Call to get Number
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 3. Dispatch Start Call
      dispatch(startCall({
        name,
        photoUrl,
        contact_number: '+15550000000'
      }));

    } catch (e) {
      console.error("Failed to start call", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button 
        className="ext-custom-btn" 
        onClick={handleFetchAndCall}
        disabled={loading || isCalling}
    >
        {loading ? (
           <span>Loading...</span>
        ) : (
           <>
             <Phone size={16} fill={isCalling ? "#ccc" : "currentColor"} />
             <span>{isCalling ? "In Call" : "Call"}</span>
           </>
        )}
    </button>
  );
};

export default CallButton;