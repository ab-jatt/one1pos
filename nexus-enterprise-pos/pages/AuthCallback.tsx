import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ScanLine } from 'lucide-react';

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const { handleOAuthCallback } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const processCallback = async () => {
      // Get the authorization code from URL
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const errorParam = urlParams.get('error');

      if (errorParam) {
        setError('Authentication failed. Please try again.');
        setTimeout(() => navigate('/login'), 3000);
        return;
      }

      if (!code) {
        setError('No authorization code received.');
        setTimeout(() => navigate('/login'), 3000);
        return;
      }

      try {
        await handleOAuthCallback(code);
        // Redirect to dashboard on success
        navigate('/dashboard');
      } catch (err: any) {
        console.error('OAuth callback error:', err);
        setError(err.message || 'Failed to complete sign in. Redirecting...');
        setTimeout(() => navigate('/login'), 3000);
      }
    };

    processCallback();
  }, [handleOAuthCallback, navigate]);

  return (
    <div className="min-h-screen w-full bg-neutral-50 dark:bg-[#030712] relative flex items-center justify-center overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:40px_40px]"></div>
      
      <div className="relative z-10 text-center">
        {error ? (
          <div className="space-y-4">
            <div className="w-16 h-16 mx-auto bg-red-500/20 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">{error}</h2>
            <p className="text-neutral-500 dark:text-neutral-400">Redirecting to login page...</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="w-16 h-16 mx-auto bg-sky-500/20 rounded-full flex items-center justify-center">
              <ScanLine className="w-8 h-8 text-sky-400 animate-spin" />
            </div>
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">Completing Sign In...</h2>
            <p className="text-neutral-500 dark:text-neutral-400">Please wait while we authenticate your account</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthCallback;
