import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { Phone } from 'lucide-react';
import type { RootState } from '../store/store';
import { requestMicPermission } from '../common/Helpers';
import { usePlivo } from '../context/PlivoContext';
import { fetchTalentDetails } from '../services/userActions';
import toast from 'react-hot-toast';

const CallButton: React.FC = () => {
  const { initiateCall } = usePlivo();
  const { isCalling, callPopupOpen } = useSelector((state: RootState) => state.call);
  const [loading, setLoading] = useState<boolean>(false);

  const handleFetchAndCall = async () => {
    if (isCalling || callPopupOpen) return;
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

      // 2. Get LinkedIn URL from current page (remove trailing slash if present)
      const linkedin_url = window.location.href.replace(/\/$/, '');

      // 3. Fetch contact number from API
      const response = await fetchTalentDetails({ linkedin_url });
      const responseData = response.data as any;
      
      if (responseData?.status !== 'success' || !responseData?.data?.contact_number) {
        toast.error('Unable to fetch contact details. Please try again.');
        return;
      }

      const contact_number = responseData.data.contact_number;

      // 4. Initiate Call via Plivo Context
      await initiateCall({
        name,
        photoUrl,
        contact_number,
      });

    } catch (e) {
      console.error("Failed to start call", e);
      toast.error('Failed to start call. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isDisabled = loading || isCalling || callPopupOpen;

  return (
    <button 
        className="ext-custom-btn" 
        onClick={handleFetchAndCall}
        disabled={isDisabled}
    >
        {loading ? (
           <span>Loading...</span>
        ) : (
           <>
             <Phone size={16} fill={isDisabled ? "#ccc" : "currentColor"} />
             <span>{isCalling ? "In Call" : "Call"}</span>
           </>
        )}
    </button>
  );
};

export default CallButton;
