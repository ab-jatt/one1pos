import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Role } from '../types';
import { Mail, Lock, Key, ArrowRight, Eye, EyeOff, ScanLine, Terminal, Activity, Wifi, Globe, User } from 'lucide-react';

const Login: React.FC = () => {
  const { login, loginWithEmail, signUpWithEmail, loginWithGoogle, resetPassword, isLoading, error } = useAuth();
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
  
  // Active tab state
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');
  
  // Sign In State
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [showSignInPassword, setShowSignInPassword] = useState(false);
  
  // Sign Up State
  const [signUpName, setSignUpName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState('');
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [terminalLines, setTerminalLines] = useState<string[]>([]);
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const languageRef = useRef<HTMLDivElement>(null);
  const [authError, setAuthError] = useState<string | null>(null);

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
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  const [showVerifyEmail, setShowVerifyEmail] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');

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

  const handleLanguageChange = (newLanguage: 'en' | 'es' | 'ru' | 'de') => {
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

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);
    
    if (signUpPassword !== signUpConfirmPassword) {
      setAuthError(t('passwordsNoMatch'));
      return;
    }
    
    if (signUpName && signUpEmail && signUpPassword) {
      try {
        await signUpWithEmail(signUpName, signUpEmail, signUpPassword);
        setAuthSuccess(t('accountCreated'));
      } catch (err: any) {
        setAuthError(err.message || t('failedCreateAccount'));
      }
    }
  };

  const handleResendVerification = async () => {
    setAuthError(null);
    setAuthSuccess(null);
    try {
      setAuthSuccess(t('verificationCodeSent'));
    } catch (err: any) {
      setAuthError(err.message || t('failedSendVerification'));
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);
    
    if (!verificationCode) {
      setAuthError(t('pleaseEnterCode'));
      return;
    }

    try {
      setAuthSuccess(t('emailVerified'));
      setTimeout(() => {
        setShowVerifyEmail(false);
        setActiveTab('signin');
        setVerificationCode('');
      }, 2000);
    } catch (err: any) {
      setAuthError(err.message || t('failedVerify'));
    }
  };

  // If showing email verification screen
  if (showVerifyEmail) {
    return (
      <div className="min-h-screen w-full bg-[#030712] relative flex items-center justify-center overflow-hidden font-sans selection:bg-sky-500/30">
        {/* Background effects */}
        <div className="absolute inset-0 z-0 perspective-1000">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
          <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-sky-600/20 rounded-full blur-[120px] animate-pulse-slow"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-sky-600/20 rounded-full blur-[120px] animate-pulse-slow" style={{ animationDelay: '1s' }}></div>
        </div>

        <div className="relative z-10 w-full max-w-md p-8">
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-8 text-center shadow-xl">
            {/* Email Icon */}
            <div className="mx-auto w-20 h-20 bg-sky-600 rounded-full flex items-center justify-center mb-6 animate-pulse-slow">
              <Mail className="w-10 h-10 text-white" />
            </div>

            <h2 className="text-3xl font-bold text-white mb-4">{t('verifyYourEmail')}</h2>
            <p className="text-neutral-300 mb-2">{t('verificationSentTo')}</p>
            <p className="text-sky-400 font-bold text-lg mb-6">{verificationEmail}</p>

            {(authError || authSuccess) && (
              <div className={`mb-6 p-3 rounded-lg border text-sm ${authError ? 'bg-red-950/50 border-red-500/50 text-red-300' : 'bg-emerald-950/50 border-emerald-500/50 text-emerald-300'}`}>
                {authError || authSuccess}
              </div>
            )}

            <form onSubmit={handleVerifyCode} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider ml-1">{t('verificationCode')}</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Key className="h-5 w-5 text-sky-400" />
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.toUpperCase())}
                    className="block w-full pl-11 pr-4 py-4 bg-neutral-950 border border-neutral-800 rounded-xl text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/50 transition-all shadow-inner text-center text-2xl tracking-widest font-mono"
                    placeholder="000000"
                  />
                </div>
                <p className="text-neutral-400 text-xs text-center mt-2">
                  {t('enterVerificationCode')}
                </p>
              </div>

              <button
                type="submit"
                disabled={isLoading || !verificationCode}
                className="w-full py-4 px-4 bg-sky-600 text-white font-bold rounded-xl hover:bg-sky-500 transition-all transform active:scale-[0.98] disabled:opacity-50 shadow-sm"
              >
                {isLoading ? t('verifying') : t('verifyEmail')}
              </button>
            </form>

            <div className="space-y-3 mt-6">
              <p className="text-neutral-400 text-sm">
                {t('didntReceiveCode')}
              </p>

              <button
                onClick={handleResendVerification}
                disabled={isLoading}
                className="w-full py-3 px-4 bg-neutral-800 text-neutral-300 font-bold rounded-xl hover:bg-neutral-700 transition-all border border-neutral-700 disabled:opacity-50"
              >
                {isLoading ? t('sending') : t('resendVerificationCode')}
              </button>

              <button
                onClick={() => {
                  setShowVerifyEmail(false);
                  setActiveTab('signin');
                  setVerificationCode('');
                }}
                className="w-full py-3 px-4 bg-neutral-800 text-neutral-300 font-bold rounded-xl hover:bg-neutral-700 transition-all border border-neutral-700"
              >
                {t('backToSignIn')}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-neutral-50 dark:bg-neutral-950 relative flex items-center justify-center overflow-hidden font-sans selection:bg-sky-500/30">
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
              {(['en', 'es', 'ru', 'de'] as const).map((lang) => (
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
      <div className="relative z-10 w-full max-w-5xl min-h-[600px] mb-24 sm:mb-20 mx-4 flex flex-col lg:flex-row rounded-lg overflow-hidden shadow-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
        
        {/* Left Side - Info Panel */}
        <div className="lg:w-[45%] w-full p-6 sm:p-8 lg:p-12 flex flex-col justify-between bg-neutral-900 dark:bg-neutral-950 lg:border-r border-neutral-200 dark:border-neutral-800">
          {/* Logo */}
          <div>
            <div className="flex flex-col items-center gap-2 mb-4 lg:mb-8 group cursor-pointer">
              <img src="/brand/dark_logo.png" alt="one1pos" className="h-20 sm:h-28 md:h-36 lg:h-44 xl:h-52 w-auto max-w-full" />
              <span className="text-[10px] uppercase tracking-[0.3em] text-neutral-400 font-bold text-center">
                {t('enterpriseEdition')}
              </span>
            </div>

            {/* Secure Access Title - Hidden on mobile */}
            <div className="mb-6 hidden lg:block">
              <h2 className="text-3xl font-bold text-white mb-1">{t('secureAccess')}</h2>
              <h3 className="text-2xl font-bold text-sky-500">{t('gateway')}</h3>
            </div>

            <p className="text-neutral-400 text-sm leading-relaxed mb-8 hidden lg:block">
              {t('authRequired')}
            </p>

            {/* Terminal Boot Sequence - Hidden on mobile */}
            <div className="bg-neutral-950 rounded-xl border border-neutral-800 p-4 font-mono text-xs hidden lg:block">
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
          <div className="hidden lg:flex items-center gap-4 text-xs font-mono text-neutral-500 mt-8">
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
        <div className="lg:w-[55%] w-full relative flex flex-col justify-center p-6 sm:p-8 lg:p-12 overflow-hidden bg-neutral-50 dark:bg-neutral-950/50">
           {/* Decorative Lines */}
           <div className="absolute top-0 left-8 w-px h-full bg-neutral-200 dark:bg-neutral-800"></div>
           <div className="absolute top-8 left-0 w-full h-px bg-neutral-200 dark:bg-neutral-800"></div>
           
           {/* Subtle Background Elements */}
           <div className="absolute right-0 top-0 w-64 h-64 bg-sky-500/5 blur-3xl rounded-full"></div>
           <div className="absolute left-0 bottom-0 w-64 h-64 bg-neutral-500/5 blur-3xl rounded-full"></div>

           <div className="relative z-10 max-w-md mx-auto w-full">

              {/* Tab Selector */}
              <div className="flex p-1.5 bg-neutral-100 dark:bg-neutral-950 rounded-lg mb-8 border border-neutral-200 dark:border-neutral-800 relative shadow-sm">
                <button
                  onClick={() => {
                    setActiveTab('signin');
                    setAuthError(null);
                    setAuthSuccess(null);
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all relative z-10 ${activeTab === 'signin' ? 'text-white' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}
                >
                  <Mail className="w-4 h-4" /> {t('credentials')}
                </button>
                <button
                  onClick={() => {
                    setActiveTab('signup');
                    setAuthError(null);
                    setAuthSuccess(null);
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all relative z-10 ${activeTab === 'signup' ? 'text-white' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}
                >
                  <Key className="w-4 h-4" /> {t('signUp')}
                </button>
                
                {/* Sliding Background */}
                <div className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] rounded-xl transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1.0)] shadow-sm ${
                  activeTab === 'signin' 
                    ? 'left-1.5 bg-sky-600' 
                    : 'left-[calc(50%+3px)] bg-sky-600'
                }`}></div>
              </div>

              <div className="relative min-h-[540px]">
                {/* Error/Success Messages */}
                {(authError || authSuccess) && (
                  <div className={`mb-4 p-3 rounded-lg border text-sm ${authError ? 'bg-red-50 dark:bg-red-950/50 border-red-300 dark:border-red-500/50 text-red-600 dark:text-red-300' : 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-500/50 text-emerald-600 dark:text-emerald-300'}`}>
                    {authError || authSuccess}
                  </div>
                )}
                
                {/* Sign In Form */}
                <div className={`signin-scroll absolute inset-0 transition-all duration-500 ease-out transform overflow-y-auto pr-2 ${activeTab === 'signin' ? 'opacity-100 translate-x-0 pointer-events-auto' : 'opacity-0 -translate-x-10 pointer-events-none'}`} style={{
                  scrollbarWidth: 'thin',
                  scrollbarColor: '#0891b2 rgba(15, 23, 42, 0.5)'
                }}>
                  <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2 leading-tight">
                      {t('welcomeBack')}
                    </h2>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
                      {t('signInSubtitle')}
                    </p>
                  </div>

                  <form onSubmit={handleSignIn} className="space-y-6">
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
                          className="block w-full pl-11 pr-4 py-4 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-600 focus:outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/50 transition-all shadow-inner"
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
                          className="block w-full pl-11 pr-12 py-4 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-600 focus:outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/50 transition-all shadow-inner"
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
                      <a href="#" className="text-sky-500 hover:text-sky-400 font-bold hover:underline">{t('recoverKey')}</a>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full relative group overflow-hidden py-4 rounded-xl bg-sky-600 text-white font-bold shadow-sm hover:bg-sky-500 transition-all transform active:scale-[0.98] mt-4"
                    >
                      <span className="relative z-10 flex items-center justify-center gap-2 uppercase tracking-widest text-sm">
                        {isLoading ? <ScanLine className="w-5 h-5 animate-spin" /> : <Terminal className="w-5 h-5" />}
                        {isLoading ? t('authenticating') : t('signIn')}
                      </span>
                    </button>
                  </form>

                  {/* Google Sign In */}
                  <div className="mt-4">
                    <div className="relative flex items-center justify-center my-4">
                      <div className="flex-grow border-t border-neutral-200 dark:border-neutral-800"></div>
                      <span className="flex-shrink mx-3 text-xs text-neutral-400 dark:text-neutral-500 uppercase tracking-wider font-bold">{t('or') || 'Or'}</span>
                      <div className="flex-grow border-t border-neutral-200 dark:border-neutral-800"></div>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        setAuthError(null);
                        try { await loginWithGoogle(); } catch (err: any) { setAuthError(err.message); }
                      }}
                      disabled={isLoading}
                      className="w-full py-3.5 px-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-700 dark:text-neutral-200 font-bold hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all flex items-center justify-center gap-3 shadow-sm"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                      {t('signInWithGoogle') || 'Sign in with Google'}
                    </button>
                  </div>

                  {/* Demo Login Section */}
                  <div className="mt-6 pt-6 border-t border-neutral-200 dark:border-neutral-800">
                    <p className="text-xs text-neutral-400 dark:text-neutral-500 text-center mb-3 uppercase tracking-wider font-bold">{t('demoAccess') || 'Quick Demo Access'}</p>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => login(Role.ADMIN)}
                        className="py-2 px-3 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-600 dark:text-neutral-300 text-xs font-bold hover:bg-neutral-200 dark:hover:bg-neutral-700 hover:text-neutral-900 dark:hover:text-white transition-all"
                      >
                        Admin
                      </button>
                      <button
                        type="button"
                        onClick={() => login(Role.MANAGER)}
                        className="py-2 px-3 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-600 dark:text-neutral-300 text-xs font-bold hover:bg-neutral-200 dark:hover:bg-neutral-700 hover:text-neutral-900 dark:hover:text-white transition-all"
                      >
                        Manager
                      </button>
                      <button
                        type="button"
                        onClick={() => login(Role.CASHIER)}
                        className="py-2 px-3 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-600 dark:text-neutral-300 text-xs font-bold hover:bg-neutral-200 dark:hover:bg-neutral-700 hover:text-neutral-900 dark:hover:text-white transition-all"
                      >
                        Cashier
                      </button>
                    </div>
                  </div>
                </div>

                {/* Sign Up Form */}
                <div className={`signup-scroll absolute inset-0 transition-all duration-500 ease-out transform overflow-y-auto pr-2 ${activeTab === 'signup' ? 'opacity-100 translate-x-0 pointer-events-auto' : 'opacity-0 translate-x-10 pointer-events-none'}`} style={{
                  scrollbarWidth: 'thin',
                  scrollbarColor: '#9333ea rgba(15, 23, 42, 0.5)'
                }}>
                  <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2 leading-tight">
                      {t('createAccount')}
                    </h2>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
                      {t('signUpSubtitle')}
                    </p>
                  </div>

                  <form onSubmit={handleSignUp} className="space-y-5">
                    <div className="space-y-2 group">
                      <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider ml-1 group-focus-within:text-sky-400 transition-colors">{t('fullName')}</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <User className="h-5 w-5 text-neutral-400 dark:text-neutral-500 group-focus-within:text-sky-400 transition-colors" />
                        </div>
                        <input
                          type="text"
                          required
                          value={signUpName}
                          onChange={(e) => setSignUpName(e.target.value)}
                          className="block w-full pl-11 pr-4 py-3.5 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-600 focus:outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/50 transition-all shadow-inner"
                          placeholder={t('fullNamePlaceholder')}
                        />
                      </div>
                    </div>

                    <div className="space-y-2 group">
                      <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider ml-1 group-focus-within:text-sky-400 transition-colors">{t('emailAddress')}</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <Mail className="h-5 w-5 text-neutral-400 dark:text-neutral-500 group-focus-within:text-sky-400 transition-colors" />
                        </div>
                        <input
                          type="email"
                          required
                          value={signUpEmail}
                          onChange={(e) => setSignUpEmail(e.target.value)}
                          className="block w-full pl-11 pr-4 py-3.5 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-600 focus:outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/50 transition-all shadow-inner"
                          placeholder={t('emailAddressPlaceholder')}
                        />
                      </div>
                    </div>

                    <div className="space-y-2 group">
                      <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider ml-1 group-focus-within:text-sky-400 transition-colors">{t('password')}</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <Lock className="h-5 w-5 text-neutral-400 dark:text-neutral-500 group-focus-within:text-sky-400 transition-colors" />
                        </div>
                        <input
                          type={showSignUpPassword ? "text" : "password"}
                          required
                          value={signUpPassword}
                          onChange={(e) => setSignUpPassword(e.target.value)}
                          className="block w-full pl-11 pr-12 py-3.5 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-600 focus:outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/50 transition-all shadow-inner"
                          placeholder={t('passwordCreatePlaceholder')}
                        />
                        <button
                          type="button"
                          onClick={() => setShowSignUpPassword(!showSignUpPassword)}
                          className="absolute inset-y-0 right-0 pr-4 flex items-center text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                        >
                          {showSignUpPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2 group">
                      <label className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider ml-1 group-focus-within:text-sky-400 transition-colors">{t('confirmPassword')}</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <Key className="h-5 w-5 text-neutral-400 dark:text-neutral-500 group-focus-within:text-sky-400 transition-colors" />
                        </div>
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          required
                          value={signUpConfirmPassword}
                          onChange={(e) => setSignUpConfirmPassword(e.target.value)}
                          className="block w-full pl-11 pr-12 py-3.5 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-600 focus:outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/50 transition-all shadow-inner"
                          placeholder={t('confirmPasswordPlaceholder')}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute inset-y-0 right-0 pr-4 flex items-center text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                        >
                          {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-start text-xs mt-2">
                      <label className="flex items-start text-neutral-500 dark:text-neutral-400 cursor-pointer hover:text-neutral-700 dark:hover:text-neutral-300 group">
                        <div className="relative mr-2 mt-0.5">
                          <input type="checkbox" required className="peer sr-only" />
                          <div className="w-4 h-4 border border-neutral-300 dark:border-neutral-600 rounded bg-white dark:bg-neutral-900 peer-checked:bg-sky-600 peer-checked:border-sky-500 transition-all"></div>
                        </div>
                        <span>{t('agreeToTerms')} <a href="#" className="text-sky-400 hover:underline">{t('termsOfService')}</a> {t('and')} <a href="#" className="text-sky-400 hover:underline">{t('privacyPolicy')}</a></span>
                      </label>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full relative group overflow-hidden py-4 rounded-xl bg-sky-600 text-white font-bold shadow-sm hover:bg-sky-500 transition-all transform active:scale-[0.98] mt-4"
                    >
                      <span className="relative z-10 flex items-center justify-center gap-2 uppercase tracking-widest text-sm">
                        {isLoading ? <ScanLine className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
                        {isLoading ? t('creatingAccount') : t('createAccount')}
                      </span>
                    </button>
                  </form>
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
