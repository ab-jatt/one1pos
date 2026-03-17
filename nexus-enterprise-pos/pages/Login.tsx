import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import type { Language } from '../context/LanguageContext';
import { Mail, Lock, Eye, EyeOff, ScanLine, Terminal, Activity, Wifi, Globe } from 'lucide-react';

const Login: React.FC = () => {
  const { loginWithEmail, loginWithGoogle, isLoading, error } = useAuth();
  const { language, setLanguage, t } = useLanguage();

  // Add custom scrollbar styles
  React.useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .signin-scroll::-webkit-scrollbar {
        width: 6px;
      }
      .signin-scroll::-webkit-scrollbar-track {
        background: rgba(115, 115, 115, 0.2);
        border-radius: 10px;
      }
      .signin-scroll::-webkit-scrollbar-thumb {
        background: #0ea5e9;
        border-radius: 10px;
      }
      .signin-scroll::-webkit-scrollbar-thumb:hover {
        background: #38bdf8;
      }
      .signup-scroll::-webkit-scrollbar {
        width: 6px;
      }
      .signup-scroll::-webkit-scrollbar-track {
        background: rgba(115, 115, 115, 0.2);
        border-radius: 10px;
      }
      .signup-scroll::-webkit-scrollbar-thumb {
        background: #525252;
        border-radius: 10px;
      }
      .signup-scroll::-webkit-scrollbar-thumb:hover {
        background: #737373;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);
  
  // Active tab state (sign-in only now)
  
  // Sign In State
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [showSignInPassword, setShowSignInPassword] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  
  const [terminalLines, setTerminalLines] = useState<string[]>([]);
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const languageRef = useRef<HTMLDivElement>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);

  // Close language dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (languageRef.current && !languageRef.current.contains(e.target as Node)) {
        setShowLanguageMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Simulate terminal boot sequence
  useEffect(() => {
    const lines = [
        t('initializingCore'),
        t('loadingSecurityProtocols'),
        t('establishingSecureUplink'),
        t('verifyingBiometric'),
        t('systemReady')
    ];
    let currentIndex = 0;
    setTerminalLines([]);
    const interval = setInterval(() => {
        if (currentIndex < lines.length) {
            setTerminalLines(prev => [...prev, lines[currentIndex]]);
            currentIndex++;
        } else {
            clearInterval(interval);
        }
    }, 800);
    return () => clearInterval(interval);
  }, [language, t]);

  const handleLanguageChange = (newLanguage: Language) => {
    setLanguage(newLanguage);
    setShowLanguageMenu(false);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);
    
    if (signInEmail && signInPassword) {
      try {
        await loginWithEmail(signInEmail, signInPassword);
        setAuthSuccess(t('successSignIn'));
      } catch (err: any) {
        setAuthError(err.message || t('failedSignIn'));
      }
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthError(null);
    setAuthSuccess(null);
    setIsGoogleLoading(true);
    try {
      await loginWithGoogle();
      setAuthSuccess(t('successSignIn'));
    } catch (err: any) {
      setAuthError(err.message || t('failedSignIn'));
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-neutral-50 dark:bg-neutral-950 relative flex items-center justify-center overflow-x-hidden font-sans selection:bg-sky-500/30 py-8">
      {/* Language Selector - Top Right */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20">
        <div className="relative" ref={languageRef}>
          <button
            onClick={() => setShowLanguageMenu(!showLanguageMenu)}
            className={`flex items-center gap-2 px-3 py-2 sm:px-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-neutral-900 dark:text-white text-sm font-bold uppercase tracking-wider hover:border-sky-500 transition-all ${showLanguageMenu ? 'border-sky-500 ring-2 ring-sky-500/20' : ''}`}
          >
            <Globe className="w-4 h-4" />
            {language.toUpperCase()}
          </button>
          
          {showLanguageMenu && (
            <div className="absolute right-0 mt-2 w-44 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg shadow-xl overflow-hidden z-30 animate-dropdown-open">
              <div className="py-1">
              {(['en', 'es', 'ru', 'de', 'ur', 'ar'] as const).map((lang) => (
                <button
                  key={lang}
                  onClick={() => handleLanguageChange(lang)}
                  className={`w-full px-4 py-2.5 text-left text-sm font-bold tracking-wider transition-all duration-150 flex items-center justify-between ${
                    language === lang
                      ? 'bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300'
                      : 'text-neutral-500 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  <span>
                  {lang === 'en' && '🇬🇧 English'}
                  {lang === 'es' && '🇪🇸 Español'}
                  {lang === 'ru' && '🇷🇺 Русский'}
                  {lang === 'de' && '🇩🇪 Deutsch'}
                  {lang === 'ur' && '🇵🇰 اردو'}
                  {lang === 'ar' && '🇸🇦 العربية'}
                  </span>
                </button>
              ))}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Subtle Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
      </div>

      {/* Main Glass Card */}
      <div className="relative z-10 w-full max-w-5xl mx-4 flex flex-col lg:flex-row rounded-lg overflow-hidden shadow-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
        
        {/* Left Side - Info Panel */}
        <div className="lg:w-[45%] w-full p-5 sm:p-6 lg:p-8 flex flex-col justify-between bg-neutral-900 dark:bg-neutral-950 lg:border-r border-neutral-200 dark:border-neutral-800">
          {/* Logo */}
          <div>
            <div className="flex flex-col items-center gap-2 mb-2 lg:mb-4 group cursor-pointer">
              <img src="/brand/dark_logo.png" alt="one1pos" className="h-16 sm:h-20 md:h-24 lg:h-28 xl:h-32 w-auto max-w-full" />
              <span className="text-[10px] uppercase tracking-[0.3em] text-neutral-400 font-bold text-center">
                {t('enterpriseEdition')}
              </span>
            </div>

            {/* Secure Access Title - Hidden on mobile */}
            <div className="mb-3 hidden lg:block">
              <h2 className="text-2xl font-bold text-white mb-1">{t('secureAccess')}</h2>
              <h3 className="text-xl font-bold text-sky-500">{t('gateway')}</h3>
            </div>

            <p className="text-neutral-400 text-sm leading-relaxed mb-4 hidden lg:block">
              {t('authRequired')}
            </p>

            {/* Terminal Boot Sequence - Hidden on mobile */}
            <div className="bg-neutral-950 rounded-xl border border-neutral-800 p-3 font-mono text-xs hidden lg:block">
              {terminalLines.map((line, index) => (
                <div key={index} className="flex items-center gap-2 text-neutral-400">
                  <span className="text-sky-500">&gt;</span>
                  <span className={index === terminalLines.length - 1 ? 'text-emerald-400' : ''}>{line}</span>
                </div>
              ))}
              <div className="flex items-center gap-2 text-sky-400 mt-1">
                <span>&gt;</span>
                <span className="animate-pulse">▌</span>
              </div>
            </div>
          </div>

          {/* Footer Status - Hidden on mobile */}
          <div className="hidden lg:flex items-center gap-4 text-xs font-mono text-neutral-500 mt-4">
            <div className="flex items-center gap-2">
              <Wifi className="w-3 h-3 text-emerald-500" />
              <span>{t('encryptedConnection')}</span>
            </div>
            <div className="flex items-center gap-2">
              <Activity className="w-3 h-3 text-sky-500" />
              <span>{t('version')}</span>
            </div>
          </div>
        </div>

        {/* Right Side - Form Panel */}
        <div className="lg:w-[55%] w-full relative flex flex-col p-5 sm:p-6 lg:p-8 bg-neutral-50 dark:bg-neutral-950/50">
           {/* Decorative Lines */}
           <div className="absolute top-0 left-8 w-px h-full bg-neutral-200 dark:bg-neutral-800"></div>
           <div className="absolute top-8 left-0 w-full h-px bg-neutral-200 dark:bg-neutral-800"></div>
           
           {/* Subtle Background Elements */}
           <div className="absolute right-0 top-0 w-64 h-64 bg-sky-500/5 blur-3xl rounded-full"></div>
           <div className="absolute left-0 bottom-0 w-64 h-64 bg-neutral-500/5 blur-3xl rounded-full"></div>

           <div className="relative z-10 max-w-md mx-auto w-full my-auto">

              <div>
                {/* Error/Success Messages */}
                {(authError || authSuccess) && (
                  <div className={`mb-4 p-3 rounded-lg border text-sm ${authError ? 'bg-red-50 dark:bg-red-950/50 border-red-300 dark:border-red-500/50 text-red-600 dark:text-red-300' : 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-500/50 text-emerald-600 dark:text-emerald-300'}`}>
                    {authError || authSuccess}
                  </div>
                )}
                
                {/* Sign In Form */}
                <div className="signin-scroll pr-2" style={{
                  scrollbarWidth: 'thin',
                  scrollbarColor: '#0891b2 rgba(15, 23, 42, 0.5)'
                }}>
                  <div className="text-center mb-5">
                    <h2 className="text-xl font-bold text-neutral-900 dark:text-white mb-1 leading-tight">
                      {t('welcomeBack')}
                    </h2>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
                      {t('signInSubtitle')}
                    </p>
                  </div>

                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div className="space-y-2 group">
                      <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider ml-1 group-focus-within:text-sky-400 transition-colors">{t('emailIdentity')}</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <Mail className="h-5 w-5 text-neutral-400 dark:text-neutral-500 group-focus-within:text-sky-400 transition-colors" />
                        </div>
                        <input
                          type="email"
                          required
                          value={signInEmail}
                          onChange={(e) => setSignInEmail(e.target.value)}
                          className="block w-full pl-11 pr-4 py-3 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-600 focus:outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/50 transition-all shadow-inner"
                          placeholder={t('emailPlaceholder')}
                        />
                      </div>
                    </div>

                    <div className="space-y-2 group">
                      <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider ml-1 group-focus-within:text-sky-400 transition-colors">{t('accessKey')}</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <Lock className="h-5 w-5 text-neutral-400 dark:text-neutral-500 group-focus-within:text-sky-400 transition-colors" />
                        </div>
                        <input
                          type={showSignInPassword ? "text" : "password"}
                          required
                          value={signInPassword}
                          onChange={(e) => setSignInPassword(e.target.value)}
                          className="block w-full pl-11 pr-12 py-3 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-600 focus:outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/50 transition-all shadow-inner"
                          placeholder={t('passwordPlaceholder')}
                        />
                        <button
                          type="button"
                          onClick={() => setShowSignInPassword(!showSignInPassword)}
                          className="absolute inset-y-0 right-0 pr-4 flex items-center text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                        >
                          {showSignInPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs mt-2">
                      <label className="flex items-center text-neutral-500 dark:text-neutral-400 cursor-pointer hover:text-neutral-700 dark:hover:text-neutral-300 group">
                        <div className="relative mr-2">
                          <input type="checkbox" className="peer sr-only" />
                          <div className="w-4 h-4 border border-neutral-300 dark:border-neutral-600 rounded bg-white dark:bg-neutral-900 peer-checked:bg-sky-600 peer-checked:border-sky-500 transition-all"></div>
                        </div>
                        {t('rememberSession')}
                      </label>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full relative group overflow-hidden py-3 rounded-xl bg-sky-600 text-white font-bold shadow-sm hover:bg-sky-500 transition-all transform active:scale-[0.98] mt-2"
                    >
                      <span className="relative z-10 flex items-center justify-center gap-2 uppercase tracking-widest text-sm">
                        {isLoading ? <ScanLine className="w-5 h-5 animate-spin" /> : <Terminal className="w-5 h-5" />}
                        {isLoading ? t('authenticating') : t('signIn')}
                      </span>
                    </button>
                  </form>

                  {/* Divider + Google Sign-In */}
                  <div className="mt-3">
                    <div className="relative my-2">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-neutral-200 dark:border-neutral-800"></div>
                      </div>
                      <div className="relative flex justify-center">
                        <span className="px-3 bg-neutral-50 dark:bg-neutral-950/50 text-neutral-400 text-xs font-bold uppercase tracking-wider">
                          {t('or')}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleGoogleSignIn}
                      disabled={isGoogleLoading || isLoading}
                      className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-xl text-neutral-700 dark:text-neutral-200 font-semibold text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-600 transition-all shadow-sm active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isGoogleLoading ? (
                        <ScanLine className="w-5 h-5 animate-spin text-neutral-500" />
                      ) : (
                        <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                      )}
                      <span>{isGoogleLoading ? t('authenticating') : t('signInWithGoogle')}</span>
                    </button>
                  </div>
                </div>

              </div>
           </div>
        </div>
      </div>
      
      <div className="absolute bottom-4 sm:bottom-6 text-center w-full z-10 px-4">
        <p className="text-neutral-600 text-[9px] sm:text-[10px] font-mono tracking-[0.15em] sm:tracking-[0.2em] uppercase opacity-70 hover:opacity-100 transition-opacity px-2">
          {t('copyright')}
        </p>
      </div>
    </div>
  );
};

export default Login;
