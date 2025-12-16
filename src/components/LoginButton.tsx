import React from 'react';
import { LogIn } from 'lucide-react';
import { UPLERS_BASE_URL } from '../constant/constant';


const LoginButton: React.FC = () => {
  const handleLogin = () => {
    window.open(`${UPLERS_BASE_URL}/app/login`, '_blank');
  };

  return (
    <button className="ext-custom-btn ext-login-btn" onClick={handleLogin}>
      <LogIn size={16} />
      <span>Login with Uplers</span>
    </button>
  );
};

export default LoginButton;
