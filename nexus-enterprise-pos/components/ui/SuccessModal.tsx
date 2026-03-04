import React, { useEffect, useState } from 'react';
import { CheckCircle, X } from 'lucide-react';

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  amount?: string;
  autoCloseDelay?: number; // ms, 0 to disable
}

const SuccessModal: React.FC<SuccessModalProps> = ({
  isOpen,
  onClose,
  title,
  message,
  amount,
  autoCloseDelay = 3000,
}) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [showCheckmark, setShowCheckmark] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
      // Delay checkmark animation
      const checkTimer = setTimeout(() => setShowCheckmark(true), 200);
      
      // Auto close if enabled
      let closeTimer: NodeJS.Timeout;
      if (autoCloseDelay > 0) {
        closeTimer = setTimeout(() => {
          onClose();
        }, autoCloseDelay);
      }
      
      return () => {
        clearTimeout(checkTimer);
        if (closeTimer) clearTimeout(closeTimer);
      };
    } else {
      setIsAnimating(false);
      setShowCheckmark(false);
    }
  }, [isOpen, autoCloseDelay, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className={`relative bg-white dark:bg-neutral-900 rounded-lg p-8 max-w-md w-full mx-4 shadow-xl border border-neutral-200 dark:border-neutral-700 transform transition-all duration-500 ${isAnimating ? 'scale-100 opacity-100' : 'scale-75 opacity-0'}`}>
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-neutral-400 dark:text-slate-400 hover:text-neutral-700 dark:hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        
        {/* Success animation container */}
        <div className="flex flex-col items-center text-center">
          {/* Animated circle with checkmark */}
          <div className="relative w-24 h-24 mb-6">
            {/* Outer glow ring */}
            <div className={`absolute inset-0 rounded-full bg-green-500/20 animate-ping`} style={{ animationDuration: '1.5s' }} />
            
            {/* Main circle */}
            <div className={`absolute inset-0 rounded-full bg-emerald-600 shadow-sm flex items-center justify-center transform transition-all duration-500 ${showCheckmark ? 'scale-100' : 'scale-0'}`}>
              {/* Checkmark SVG with draw animation */}
              <svg 
                className="w-12 h-12 text-white" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="3" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <path 
                  d="M5 13l4 4L19 7" 
                  className={`transition-all duration-500 ${showCheckmark ? 'stroke-dashoffset-0' : ''}`}
                  style={{
                    strokeDasharray: 24,
                    strokeDashoffset: showCheckmark ? 0 : 24,
                    transition: 'stroke-dashoffset 0.5s ease-out 0.3s'
                  }}
                />
              </svg>
            </div>
            
            {/* Sparkle effects */}
            {showCheckmark && (
              <>
                <div className="absolute -top-2 left-1/2 w-2 h-2 bg-green-400 rounded-full animate-sparkle" style={{ animationDelay: '0.5s' }} />
                <div className="absolute top-1/4 -right-2 w-1.5 h-1.5 bg-emerald-400 rounded-full animate-sparkle" style={{ animationDelay: '0.7s' }} />
                <div className="absolute -bottom-1 right-1/4 w-2 h-2 bg-green-300 rounded-full animate-sparkle" style={{ animationDelay: '0.6s' }} />
                <div className="absolute top-1/3 -left-1 w-1.5 h-1.5 bg-emerald-300 rounded-full animate-sparkle" style={{ animationDelay: '0.8s' }} />
              </>
            )}
          </div>
          
          {/* Title */}
          <h2 className={`text-2xl font-bold text-neutral-900 dark:text-white mb-2 transform transition-all duration-500 delay-300 ${showCheckmark ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
            {title}
          </h2>
          
          {/* Message */}
          <p className={`text-neutral-500 dark:text-slate-300 mb-4 transform transition-all duration-500 delay-400 ${showCheckmark ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
            {message}
          </p>
          
          {/* Amount display */}
          {amount && (
            <div className={`bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 rounded-lg px-8 py-4 transform transition-all duration-500 delay-500 ${showCheckmark ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-4 opacity-0 scale-95'}`}>
              <span className="text-emerald-600 dark:text-green-400 text-3xl font-bold font-mono">
                {amount}
              </span>
            </div>
          )}
          
          {/* OK Button */}
          <button
            onClick={onClose}
            className={`mt-6 px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl shadow-sm transform transition-all duration-500 delay-600 hover:scale-105 active:scale-95 ${showCheckmark ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}
          >
            Continue
          </button>
        </div>
      </div>
      
      {/* Add keyframes via style tag */}
      <style>{`
        @keyframes sparkle {
          0%, 100% { transform: scale(0); opacity: 0; }
          50% { transform: scale(1.5); opacity: 1; }
        }
        .animate-sparkle {
          animation: sparkle 1s ease-in-out infinite;
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default SuccessModal;
