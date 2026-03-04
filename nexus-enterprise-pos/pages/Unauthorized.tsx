import React from 'react';
import { ShieldAlert, ArrowLeft, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Unauthorized: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full p-8 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-center relative overflow-hidden group shadow-sm">
        
        {/* Background Pattern */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 opacity-5 pointer-events-none">
            <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,currentColor_10px,currentColor_20px)] text-neutral-400"></div>
        </div>

        <div className="relative z-10 flex flex-col items-center">
            <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6 border border-red-500/30">
                <ShieldAlert className="w-10 h-10 text-red-500" />
            </div>

            <h1 className="text-3xl font-bold text-neutral-800 dark:text-white mb-2 tracking-tight">ACCESS DENIED</h1>
            <div className="flex items-center gap-2 px-3 py-1 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-full mb-6">
                <Lock className="w-3 h-3 text-red-600 dark:text-red-400" />
                <span className="text-xs font-mono font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">Security Protocol 403</span>
            </div>

            <p className="text-neutral-500 dark:text-neutral-400 mb-8 text-sm">
                Your clearance level is insufficient for this module.<br/>
                This attempt has been logged in the audit trail.
            </p>

            <button 
                onClick={() => navigate('/')}
                className="group flex items-center justify-center gap-2 px-6 py-3 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 rounded-xl transition-all font-bold text-sm uppercase tracking-wide border border-neutral-200 dark:border-neutral-700"
            >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                Return to Base
            </button>
        </div>
      </div>
    </div>
  );
};

export default Unauthorized;