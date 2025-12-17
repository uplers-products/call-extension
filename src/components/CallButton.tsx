import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Phone } from 'lucide-react';
import { startCall } from '../store/callSlice';
import type { RootState } from '../store/store';
import { requestMicPermission } from '../common/Helpers';
import toast from 'react-hot-toast';

const CallButton: React.FC = () => {
  const dispatch = useDispatch();
  const isCalling = useSelector((state: RootState) => state.call.isCalling);
  const [loading, setLoading] = useState<boolean>(false);

  const handleFetchAndCall = async () => {
    if (isCalling) return;
    setLoading(true);

    try {
      // Check and request microphone permission first
      const permissionResult = await requestMicPermission();
      
      if (permissionResult.status !== 'granted') {
        toast.error(permissionResult.error || 'Please allow microphone access to make calls.');
        setLoading(false);
        return;
      }

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
      toast.error('Failed to start call. Please try again.');
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
