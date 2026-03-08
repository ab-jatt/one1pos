import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/login');
  }, [navigate]);

  return (
    <div className="min-h-screen w-full bg-neutral-50 dark:bg-[#030712] relative flex items-center justify-center overflow-hidden">
      <p className="text-neutral-500 dark:text-neutral-400">Redirecting...</p>
    </div>
  );
};

export default AuthCallback;
