import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { Phone, Contact, Loader2 } from 'lucide-react';
import type { RootState } from '../store/store';
import { requestMicPermission } from '../common/Helpers';
import { usePlivo } from '../context/PlivoContext';
import { fetchTalentDetails } from '../services/userActions';
import ContactModal from './ContactModal';
import toast from 'react-hot-toast';

const CallButton: React.FC = () => {
  const { initiateCall } = usePlivo();
  const { isCalling, callPopupOpen } = useSelector((state: RootState) => state.call);
  const [loading, setLoading] = useState<boolean>(false);
  const [showContactLoading, setShowContactLoading] = useState<boolean>(false);
  const [contactModalOpen, setContactModalOpen] = useState<boolean>(false);
  const [contactData, setContactData] = useState<{
    contactNumber?: string;
    email?: string;
    name: string;
  } | null>(null);

  const handleFetchAndCall = async () => {
    if (isCalling || callPopupOpen || showContactLoading) return;
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
        toast.error('Contact details not found.');
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

  const handleShowContact = async () => {
    if (isCalling || callPopupOpen || loading) return;
    setShowContactLoading(true);

    try {
      // 1. Scrape Data from DOM
      const name = document.querySelector('h1')?.innerText || "Unknown";

      // 2. Get LinkedIn URL from current page (remove trailing slash if present)
      const linkedin_url = window.location.href.replace(/\/$/, '');

      // 3. Fetch contact details from API
      const response = await fetchTalentDetails({ linkedin_url });
      const responseData = response.data as any;

      if (responseData?.status !== 'success') {
        toast.error('Contact details not found.');
        return;
      }

      // 4. Show contact modal with available data
      setContactData({
        contactNumber: responseData.data?.contact_number,
        email: responseData.data?.email,
        name,
      });
      setContactModalOpen(true);

    } catch (e) {
      console.error("Failed to fetch contact details", e);
      toast.error('Failed to fetch contact details. Please try again.');
    } finally {
      setShowContactLoading(false);
    }
  };

  const isDisabled = loading || showContactLoading || isCalling || callPopupOpen;

  return (
    <>
      <div
        className="ext-call-buttons-container"
        style={{
          pointerEvents: isDisabled ? 'none' : 'auto',
          cursor: isDisabled ? 'not-allowed' : 'pointer'
        }}
      >
        <button
          className="ext-custom-btn ext-btn-call"
          onClick={handleFetchAndCall}
          disabled={isDisabled}
        >
          {loading ? (
            <>
              <Loader2 size={14} className="ext-spinner" />
              <span>Finding contact info</span>
            </>
          ) : (
            <>
              <Phone size={16} />
              <span>{isCalling ? "In Call" : "Call"}</span>
            </>
          )}
        </button>

        <button
          className="ext-custom-btn ext-btn-contact"
          onClick={handleShowContact}
          disabled={isDisabled}
        >
          {showContactLoading ? (
            <>
              <Loader2 size={14} className="ext-spinner" />
              <span>Finding contact info</span>
            </>
          ) : (
            <>
              <Contact size={16} />
              <span>Show Contact</span>
            </>
          )}
        </button>
      </div>

      {contactData && (
        <ContactModal
          isOpen={contactModalOpen}
          onClose={() => setContactModalOpen(false)}
          contactNumber={contactData.contactNumber}
          email={contactData.email}
          name={contactData.name}
        />
      )}
    </>
  );
};

export default CallButton;
