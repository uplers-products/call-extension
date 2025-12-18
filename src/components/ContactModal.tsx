import React from 'react';
import { X, Phone, Mail } from 'lucide-react';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  contactNumber?: string;
  email?: string;
  name: string;
}

const ContactModal: React.FC<ContactModalProps> = ({
  isOpen,
  onClose,
  contactNumber,
  email,
  name,
}) => {
  if (!isOpen) return null;

  return (
    <div className="ext-contact-overlay" onClick={onClose}>
      <div className="ext-contact-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ext-contact-header">
          <h3>Contact Information</h3>
          <button className="ext-contact-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        
        <div className="ext-contact-body">
          <div className="ext-contact-name">{name}</div>
          
          <div className={`ext-contact-item ${!contactNumber ? 'ext-contact-unavailable' : ''}`}>
            <div className="ext-contact-icon">
              <Phone size={18} />
            </div>
            <div className="ext-contact-details">
              <div className="ext-contact-label">Phone Number</div>
              <div className="ext-contact-value">{contactNumber || 'Not available'}</div>
            </div>
          </div>

          <div className={`ext-contact-item ${!email ? 'ext-contact-unavailable' : ''}`}>
            <div className="ext-contact-icon">
              <Mail size={18} />
            </div>
            <div className="ext-contact-details">
              <div className="ext-contact-label">Email</div>
              <div className="ext-contact-value">{email || 'Not available'}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactModal;
