import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import { authAPI, requestsAPI, pushAPI } from './services/api';
import { translations } from './i18n/translations';
import { useNotifications } from './hooks/useNotifications';

// Import pages
import CreateRequestPage from './pages/CreateRequest';
import MyRequestsListPage from './pages/MyRequests';
import AdminPage from './pages/Admin';
import DashboardPage from './pages/Dashboard';
import SystemsPage from './pages/Systems';
import RequestDetailPage from './pages/RequestDetail';
import MyApprovalsPage from './pages/MyApprovals';
import GlobalSearch from './components/GlobalSearch';
import MemoryGame from './components/MemoryGame';
import { YellowCheckIcon } from './components/Icons';
import { TourProvider, useTour } from './components/InteractiveTour';

// Language Context
const LanguageContext = createContext(null);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
};

// Language Provider
function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    const saved = localStorage.getItem('language');
    return saved || 'ru'; // Русский по умолчанию
  });

  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  const t = (key) => {
    return translations[language]?.[key] || translations['ru']?.[key] || key;
  };

  const toggleLanguage = () => {
    setLanguage(prev => {
      if (prev === 'ru') return 'en';
      if (prev === 'en') return 'tj';
      return 'ru';
    });
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

// Theme Context
const ThemeContext = createContext(null);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};

// Theme Provider
function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const isDark = theme === 'dark';

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

// Theme Toggle Button
function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();
  const { t } = useLanguage();

  return (
    <button
      onClick={toggleTheme}
      className="relative p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-all duration-300 overflow-hidden group"
      title={isDark ? t('switchToLight') : t('switchToDark')}
    >
      <div className={`transform transition-all duration-500 ${isDark ? 'rotate-0 scale-100' : 'rotate-90 scale-0'} absolute inset-0 flex items-center justify-center`}>
        <svg className="w-5 h-5 text-yellow-300 drop-shadow-[0_0_8px_rgba(253,224,71,0.5)]" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
        </svg>
      </div>
      <div className={`transform transition-all duration-500 ${!isDark ? 'rotate-0 scale-100' : '-rotate-90 scale-0'}`}>
        <svg className="w-5 h-5 text-white/90" fill="currentColor" viewBox="0 0 20 20">
          <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
        </svg>
      </div>
    </button>
  );
}

// Language Toggle Button with Dropdown
function LanguageToggle({ variant = 'header' }) {
  const { language, setLanguage, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = React.useRef(null);

  const languages = [
    { code: 'RU' },
    { code: 'EN' },
    { code: 'TJ' },
  ];

  const currentLang = languages.find(l => l.code.toLowerCase() === language) || languages[0];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (code) => {
    setLanguage(code);
    setIsOpen(false);
  };

  if (variant === 'header') {
    return (
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-all duration-300 text-sm font-medium flex items-center gap-1"
          title={t('language')}
        >
          <span>{currentLang.code}</span>
          <svg className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {isOpen && (
          <div className="absolute right-0 mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleSelect(lang.code.toLowerCase())}
                className={`w-full px-4 py-2 text-left text-sm flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                  language === lang.code.toLowerCase() ? 'bg-primary/10 text-primary dark:bg-primary/20' : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                <span>{lang.code}</span>
                {language === lang.code.toLowerCase() && (
                  <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Login page variant
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-all duration-300 text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1"
        title={t('language')}
      >
        <span>{currentLang.code}</span>
        <svg className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div className="absolute right-0 mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleSelect(lang.code.toLowerCase())}
              className={`w-full px-4 py-2 text-left text-sm flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                language === lang.code.toLowerCase() ? 'bg-primary/10 text-primary dark:bg-primary/20' : 'text-gray-700 dark:text-gray-300'
              }`}
            >
              <span>{lang.code}</span>
              {language === lang.code.toLowerCase() && (
                <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Auth Context
const AuthContext = React.createContext(null);

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

// Auth Provider
function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();

  useEffect(() => {
    // Try to get user info - will use httpOnly cookie or localStorage token
    authAPI.getMe()
      .then(res => setUser(res.data))
      .catch(() => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (username, password, userData = null) => {
    if (userData) {
      // Direct set user (used after 2FA verification)
      setUser(userData);
    } else {
      // Legacy login flow (not used with 2FA)
      const response = await authAPI.login(username, password);
      localStorage.setItem('access_token', response.data.access_token);
      localStorage.setItem('refresh_token', response.data.refresh_token);
      const userRes = await authAPI.getMe();
      setUser(userRes.data);
    }
  };

  const logout = async () => {
    try {
      // Call logout endpoint to clear httpOnly cookies
      await authAPI.logout();
    } catch (e) {
      // Ignore errors - still clear local state
    }
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-xl dark:text-gray-100">{t('loading')}</div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// Protected Route
function ProtectedRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" />;
}

// Admin Route - only for superusers and demo users
function AdminRoute({ children }) {
  const { user } = useAuth();
  if (!user?.is_superuser && !user?.is_demo) {
    return <Navigate to="/" />;
  }
  return children;
}

// Friendly Login Background with Brand Colors
function LoginBackground() {
  const { t } = useLanguage();

  return (
    <div className="absolute inset-0 overflow-hidden bg-gradient-to-br from-primary via-primary to-[#1a3d7a]">
      {/* Soft animated blobs with brand colors */}
      <div className="absolute top-0 -left-4 w-72 h-72 bg-secondary rounded-full mix-blend-soft-light filter blur-xl opacity-60 animate-blob"></div>
      <div className="absolute top-0 -right-4 w-72 h-72 bg-[#F9BF3F] rounded-full mix-blend-soft-light filter blur-xl opacity-50 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-8 left-20 w-72 h-72 bg-secondary rounded-full mix-blend-soft-light filter blur-xl opacity-40 animate-blob animation-delay-4000"></div>
      <div className="absolute bottom-20 right-20 w-72 h-72 bg-[#2a4a8a] rounded-full mix-blend-soft-light filter blur-xl opacity-50 animate-blob animation-delay-3000"></div>

      {/* Main illustration */}
      <div className="absolute inset-0 flex items-center justify-center">
        <svg viewBox="0 0 500 500" className="w-full max-w-lg opacity-90" style={{filter: 'drop-shadow(0 25px 50px rgba(0,0,0,0.3))'}}>
          <defs>
            <linearGradient id="cardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95"/>
              <stop offset="100%" stopColor="#f0f0f0" stopOpacity="0.9"/>
            </linearGradient>
            <linearGradient id="avatarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#16306C"/>
              <stop offset="100%" stopColor="#1a3d7a"/>
            </linearGradient>
            <linearGradient id="badgeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F9BF3F"/>
              <stop offset="100%" stopColor="#e5a520"/>
            </linearGradient>
            <filter id="softShadow">
              <feDropShadow dx="0" dy="10" stdDeviation="20" floodColor="#000" floodOpacity="0.2"/>
            </filter>
          </defs>

          {/* ID Card */}
          <g filter="url(#softShadow)">
            <rect x="100" y="120" width="300" height="200" rx="20" fill="url(#cardGrad)"/>
            <rect x="100" y="120" width="300" height="50" rx="20" fill="url(#avatarGrad)"/>
            <rect x="100" y="150" width="300" height="20" fill="url(#avatarGrad)"/>

            {/* Avatar */}
            <circle cx="180" cy="230" r="45" fill="url(#avatarGrad)">
              <animate attributeName="r" values="45;47;45" dur="2s" repeatCount="indefinite"/>
            </circle>
            <circle cx="180" cy="215" r="18" fill="#fff"/>
            <ellipse cx="180" cy="255" rx="28" ry="18" fill="#fff"/>

            {/* Card lines */}
            <rect x="240" y="200" width="140" height="12" rx="6" fill="#e0e0e0"/>
            <rect x="240" y="225" width="100" height="10" rx="5" fill="#e8e8e8"/>
            <rect x="240" y="248" width="120" height="10" rx="5" fill="#e8e8e8"/>

            {/* Checkmark badge */}
            <g transform="translate(350, 100)">
              <circle cx="30" cy="30" r="28" fill="url(#badgeGrad)">
                <animate attributeName="r" values="28;30;28" dur="1.5s" repeatCount="indefinite"/>
              </circle>
              <path d="M18 30 L26 38 L42 22" stroke="#16306C" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            </g>
          </g>

          {/* Floating elements */}
          <g opacity="0.9">
            {/* Key */}
            <g transform="translate(60, 300)">
              <circle cx="20" cy="20" r="15" fill="none" stroke="#F9BF3F" strokeWidth="6">
                <animateTransform attributeName="transform" type="translate" values="0,0; 0,-10; 0,0" dur="3s" repeatCount="indefinite"/>
              </circle>
              <rect x="32" y="15" width="35" height="10" rx="3" fill="#F9BF3F">
                <animateTransform attributeName="transform" type="translate" values="0,0; 0,-10; 0,0" dur="3s" repeatCount="indefinite"/>
              </rect>
              <rect x="55" y="25" width="8" height="12" rx="2" fill="#F9BF3F">
                <animateTransform attributeName="transform" type="translate" values="0,0; 0,-10; 0,0" dur="3s" repeatCount="indefinite"/>
              </rect>
            </g>

            {/* Lock */}
            <g transform="translate(380, 340)">
              <rect x="10" y="30" width="50" height="40" rx="8" fill="#F9BF3F">
                <animateTransform attributeName="transform" type="translate" values="0,0; 0,8; 0,0" dur="2.5s" repeatCount="indefinite"/>
              </rect>
              <path d="M18 30 L18 18 C18 5 52 5 52 18 L52 30" fill="none" stroke="#F9BF3F" strokeWidth="8" strokeLinecap="round">
                <animateTransform attributeName="transform" type="translate" values="0,0; 0,8; 0,0" dur="2.5s" repeatCount="indefinite"/>
              </path>
              <circle cx="35" cy="50" r="6" fill="#16306C">
                <animateTransform attributeName="transform" type="translate" values="0,0; 0,8; 0,0" dur="2.5s" repeatCount="indefinite"/>
              </circle>
            </g>

            {/* Stars */}
            <path d="M80 180 L85 195 L100 195 L88 205 L93 220 L80 210 L67 220 L72 205 L60 195 L75 195 Z" fill="#F9BF3F" opacity="0.9">
              <animate attributeName="opacity" values="0.9;0.5;0.9" dur="2s" repeatCount="indefinite"/>
            </path>
            <path d="M420 250 L423 260 L433 260 L425 267 L428 277 L420 270 L412 277 L415 267 L407 260 L417 260 Z" fill="#F9BF3F" opacity="0.8">
              <animate attributeName="opacity" values="0.8;0.4;0.8" dur="2.5s" repeatCount="indefinite"/>
            </path>
          </g>

          {/* Dots decoration */}
          <g fill="#fff" opacity="0.4">
            <circle cx="450" cy="150" r="4"/>
            <circle cx="465" cy="180" r="3"/>
            <circle cx="440" cy="200" r="5"/>
            <circle cx="50" cy="250" r="4"/>
            <circle cx="70" cy="280" r="3"/>
            <circle cx="40" cy="350" r="5"/>
          </g>
        </svg>
      </div>

      {/* Bottom content */}
      <div className="absolute bottom-0 left-0 right-0 p-10 text-white">
        <h2 className="text-4xl font-bold mb-3 drop-shadow-lg">
          {t('welcome')}
        </h2>
        <p className="text-xl opacity-90 max-w-md mb-6">
          {t('unifiedAccessSystem')}
        </p>
        <div className="flex flex-wrap gap-3">
          <span className="bg-secondary text-primary rounded-full px-4 py-2 text-sm font-semibold">
            {t('quickAccess')}
          </span>
          <span className="bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 text-sm font-medium">
            {t('security')}
          </span>
          <span className="bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 text-sm font-medium">
            {t('simplicity')}
          </span>
        </div>
      </div>

      <style>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(20px, -30px) scale(1.1); }
          50% { transform: translate(-20px, 20px) scale(0.9); }
          75% { transform: translate(30px, 10px) scale(1.05); }
        }
        .animate-blob { animation: blob 8s infinite ease-in-out; }
        .animation-delay-2000 { animation-delay: 2s; }
        .animation-delay-3000 { animation-delay: 3s; }
        .animation-delay-4000 { animation-delay: 4s; }
      `}</style>
    </div>
  );
}

// Login Page
function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showGame, setShowGame] = useState(false);

  // 2FA states
  const [step, setStep] = useState('credentials'); // 'credentials' or '2fa'
  const [sessionToken, setSessionToken] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [timeLeft, setTimeLeft] = useState(180);

  const { login } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { t } = useLanguage();
  const navigate = useNavigate();

  // Countdown timer for 2FA
  useEffect(() => {
    let timer;
    if (step === '2fa' && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            setError(t('codeExpired') || 'Code expired. Please try again.');
            setStep('credentials');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [step, timeLeft, t]);

  // Format time as MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCredentialsSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authAPI.login(username, password);

      if (response.data.requires_2fa) {
        // Switch to 2FA step
        setSessionToken(response.data.session_token);
        setTimeLeft(response.data.code_expiry_seconds || 180);
        setStep('2fa');
        setVerificationCode('');
      } else {
        // Direct login (no 2FA)
        localStorage.setItem('access_token', response.data.access_token);
        localStorage.setItem('refresh_token', response.data.refresh_token);
        const userRes = await authAPI.getMe();
        login(null, null, userRes.data);
        navigate('/');
      }
    } catch (err) {
      setError(err.response?.data?.detail || t('loginFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authAPI.verify2fa(sessionToken, verificationCode);
      localStorage.setItem('access_token', response.data.access_token);
      localStorage.setItem('refresh_token', response.data.refresh_token);
      const userRes = await authAPI.getMe();
      login(null, null, userRes.data);
      navigate('/');
    } catch (err) {
      const detail = err.response?.data?.detail;
      let errorMsg;
      if (Array.isArray(detail)) {
        errorMsg = detail[0]?.msg || 'Validation error';
      } else if (typeof detail === 'object') {
        errorMsg = detail?.msg || JSON.stringify(detail);
      } else {
        errorMsg = detail;
      }
      setError(String(errorMsg) || t('invalidCode') || 'Invalid code');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setStep('credentials');
    setError('');
    setVerificationCode('');
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Friendly Animated Background */}
      <div className="hidden lg:flex lg:w-1/2 relative">
        <LoginBackground />
      </div>

      {/* Right side - Login form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gray-50 dark:bg-gray-900 relative">
        {/* Theme and Language toggles in top right */}
        <div className="absolute top-4 right-4 flex space-x-2">
          <LanguageToggle variant="login" />
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-all duration-300"
            title={isDark ? t('switchToLight') : t('switchToDark')}
          >
            {isDark ? (
              <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-gray-700" fill="currentColor" viewBox="0 0 20 20">
                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
              </svg>
            )}
          </button>
        </div>

        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <button
              onClick={() => setShowGame(true)}
              className="inline-flex items-center justify-center w-20 h-20 bg-primary rounded-2xl mb-4 shadow-lg animate-bounce-slow relative overflow-hidden group cursor-pointer hover:shadow-xl transition-shadow"
              title={t('clickForSurprise')}
            >
              <div className="absolute inset-0 bg-secondary/20 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
              <svg className="w-10 h-10 text-secondary relative z-10 transform group-hover:scale-110 transition-transform duration-300" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L4 6v6c0 5.25 3.4 10.2 8 12 4.6-1.8 8-6.75 8-12V6l-8-4zm0 4a3 3 0 110 6 3 3 0 010-6zm0 14c-2.5 0-4.7-1.3-6-3.2.03-2 4-3.1 6-3.1s5.97 1.1 6 3.1c-1.3 1.9-3.5 3.2-6 3.2z"/>
              </svg>
            </button>
            <h1 className="text-3xl font-bold text-primary mb-2">IDM <span className="text-secondary">System</span></h1>
            <p className="text-gray-500 dark:text-gray-400">{t('accessManagementSystem')}</p>
            <style>{`
              @keyframes bounce-slow {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-8px); }
              }
              .animate-bounce-slow { animation: bounce-slow 3s ease-in-out infinite; }
            `}</style>
          </div>

          {/* Memory Game Modal */}
          {showGame && <MemoryGame onClose={() => setShowGame(false)} />}

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-100 dark:border-gray-700">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg flex items-center mb-5">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                </svg>
                {error}
              </div>
            )}

            {step === 'credentials' ? (
              <form onSubmit={handleCredentialsSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('username')}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-primary/50 dark:text-primary/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="input pl-10"
                      placeholder={t('enterUsername')}
                      required
                      autoFocus
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('password')}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-primary/50 dark:text-primary/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="input pl-10"
                      placeholder={t('enterPassword')}
                      required
                    />
                </div>
              </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 text-lg font-semibold text-white bg-primary rounded-xl hover:bg-primary/90 transform hover:scale-[1.02] transition-all shadow-lg disabled:opacity-50"
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {t('signingIn')}
                    </span>
                  ) : t('login')}
                </button>
              </form>
            ) : (
              /* 2FA Code Entry */
              <form onSubmit={handleVerifyCode} className="space-y-5">
                {/* Timer Display */}
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-4">
                    <svg className="w-10 h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
                    {t('enterVerificationCode') || 'Enter Verification Code'}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    {t('codeSentMessage') || 'A verification code has been sent'}
                  </p>

                  {/* Countdown Timer */}
                  <div className="mb-4">
                    <div className={`text-4xl font-mono font-bold ${timeLeft <= 30 ? 'text-red-500 animate-pulse' : 'text-primary'}`}>
                      {formatTime(timeLeft)}
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-3 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-1000 ${timeLeft <= 30 ? 'bg-red-500' : 'bg-primary'}`}
                        style={{ width: `${(timeLeft / 180) * 100}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                      {t('codeExpiresIn') || 'Code expires in'}: {formatTime(timeLeft)}
                    </p>
                  </div>

                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('verificationCode') || 'Verification Code'}
                  </label>
                  <input
                    type="text"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="input text-center text-2xl font-mono tracking-widest"
                    placeholder="000000"
                    maxLength={6}
                    required
                    autoFocus
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || verificationCode.length !== 6}
                  className="w-full py-3.5 text-lg font-semibold text-white bg-primary rounded-xl hover:bg-primary/90 transform hover:scale-[1.02] transition-all shadow-lg disabled:opacity-50"
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {t('verifying') || 'Verifying...'}
                    </span>
                  ) : (t('verify') || 'Verify')}
                </button>

                <button
                  type="button"
                  onClick={handleBack}
                  className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  ← {t('back') || 'Back to login'}
                </button>
              </form>
            )}

            <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-center text-sm text-gray-400 dark:text-gray-500">
                <svg className="w-4 h-4 mr-2 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {t('signInWithDomain')}
              </div>
            </div>
          </div>

          <div className="mt-8 text-center">
            <p className="text-sm text-gray-400 dark:text-gray-500">
              IDM System
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Notification Toggle Button with Web Push
function NotificationToggle() {
  const { t } = useLanguage();
  const [isActive, setIsActive] = useState(false);
  const [isDenied, setIsDenied] = useState(false);
  const [loading, setLoading] = useState(false);

  // Check subscription status on mount
  useEffect(() => {
    checkSubscription();
  }, []);

  const checkSubscription = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsActive(!!subscription);
      setIsDenied(Notification.permission === 'denied');
    } catch (e) {
      console.error('Check subscription error:', e);
    }
  };

  const urlBase64ToUint8Array = (base64String) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const handleClick = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      alert('Ваш браузер не поддерживает push-уведомления');
      return;
    }

    setLoading(true);

    try {
      // Register service worker
      const registration = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      if (isActive) {
        // Unsubscribe
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await subscription.unsubscribe();
          try {
            await pushAPI.unsubscribe(subscription.endpoint);
          } catch (e) {}
        }
        setIsActive(false);
        localStorage.removeItem('push_enabled');
      } else {
        // Request permission and subscribe
        const permission = await Notification.requestPermission();

        if (permission === 'granted') {
          // Get VAPID key from server
          const vapidResponse = await pushAPI.getVapidKey();
          const vapidPublicKey = vapidResponse.data.public_key;

          // Subscribe to push
          const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
          });

          // Send subscription to server
          const subJson = subscription.toJSON();
          await pushAPI.subscribe({
            endpoint: subJson.endpoint,
            keys: subJson.keys
          });

          setIsActive(true);
          setIsDenied(false);
          localStorage.setItem('push_enabled', 'true');

          // Show test notification
          new Notification('Push-уведомления включены', {
            body: 'Вы будете получать уведомления даже при закрытом браузере',
            icon: '/vite.svg'
          });
        } else if (permission === 'denied') {
          setIsDenied(true);
          alert('Уведомления заблокированы.\n\nЧтобы включить:\n1. Нажмите на 🔒 слева от адреса\n2. Найдите "Уведомления"\n3. Выберите "Разрешить"');
        }
      }
    } catch (e) {
      console.error('Push subscription error:', e);
      alert('Ошибка при настройке уведомлений: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`p-2 rounded-lg transition-all duration-300 relative ${
        loading
          ? 'bg-white/10 opacity-50'
          : isActive
            ? 'bg-green-500/20 hover:bg-green-500/30'
            : isDenied
              ? 'bg-red-500/20 opacity-50'
              : 'bg-white/10 hover:bg-white/20'
      }`}
      title={
        loading
          ? 'Загрузка...'
          : isDenied
            ? (t('notificationsDenied') || 'Уведомления заблокированы')
            : isActive
              ? (t('notificationsOn') || 'Push-уведомления включены')
              : (t('notificationsOff') || 'Включить push-уведомления')
      }
    >
      {loading ? (
        <svg className="w-5 h-5 text-white/70 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
        </svg>
      ) : isActive ? (
        <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
        </svg>
      ) : (
        <svg className="w-5 h-5 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      )}
      {isActive && (
        <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-pulse" />
      )}
    </button>
  );
}

// Layout
function Layout({ children }) {
  const { user, logout } = useAuth();
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);
  const { t } = useLanguage();

  // Enable notifications in layout
  useNotifications(true);

  useEffect(() => {
    const fetchPendingApprovals = async () => {
      try {
        const response = await requestsAPI.myApprovals();
        setPendingApprovalsCount(response.data?.length || 0);
      } catch (err) {
        console.error('Error fetching pending approvals:', err);
      }
    };
    fetchPendingApprovals();

    // Also refresh count every 60 seconds
    const interval = setInterval(fetchPendingApprovals, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg transition-colors duration-300">
      {/* Header */}
      <header className="bg-gradient-to-r from-primary to-primary-700 dark:from-gray-800 dark:to-gray-900 text-white shadow-lg dark:shadow-dark-lg dark:border-b dark:border-gray-700">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-8">
              <Link to="/" className="text-2xl font-bold flex items-center space-x-2 group">
                <span className="group-hover:text-secondary transition-colors">IDM</span>
                <span className="text-secondary">System</span>
              </Link>

              <nav className="hidden md:flex space-x-6">
                <Link to="/" className="hover:text-secondary dark:hover:text-secondary transition-colors py-1 border-b-2 border-transparent hover:border-secondary">
                  {t('home')}
                </Link>
                <Link to="/my-requests" data-tour="my-requests" className="hover:text-secondary dark:hover:text-secondary transition-colors py-1 border-b-2 border-transparent hover:border-secondary">
                  {t('myRequests')}
                </Link>
                <Link to="/my-approvals" data-tour="pending-approvals" className="hover:text-secondary dark:hover:text-secondary transition-colors relative flex items-center py-1 border-b-2 border-transparent hover:border-secondary">
                  {t('pendingApprovals')}
                  {pendingApprovalsCount > 0 && (
                    <span className="ml-2 bg-red-500 dark:bg-red-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center animate-pulse shadow-lg">
                      {pendingApprovalsCount}
                    </span>
                  )}
                </Link>
                <Link to="/systems" className="hover:text-secondary dark:hover:text-secondary transition-colors py-1 border-b-2 border-transparent hover:border-secondary">
                  {t('systems')}
                </Link>
                {(user?.is_superuser || user?.is_demo) && (
                  <Link to="/admin" data-tour="admin-link" className="hover:text-secondary dark:hover:text-secondary transition-colors py-1 border-b-2 border-transparent hover:border-secondary">
                    {t('admin')}
                  </Link>
                )}
              </nav>
            </div>

            {/* Global Search */}
            <div className="hidden lg:flex flex-1 justify-center max-w-md mx-4">
              <GlobalSearch />
            </div>

            <div className="flex items-center space-x-3">
              <NotificationToggle />
              <LanguageToggle variant="header" />
              <ThemeToggle />
              <span className="text-sm hidden md:inline opacity-90">{user?.full_name}</span>
              <button onClick={logout} className="btn btn-secondary text-sm shadow-md hover:shadow-lg">
                {t('logout')}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}

// Dashboard
function Dashboard() {
  const { t } = useLanguage();

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-primary dark:text-transparent dark:bg-gradient-to-r dark:from-blue-400 dark:to-cyan-400 dark:bg-clip-text">{t('controlPanel')}</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">{t('controlPanelDesc')}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Link to="/create-request" data-tour="new-request" className="card hover:shadow-lg dark:hover:shadow-dark-lg hover:border-primary/30 dark:hover:border-blue-500/30 hover:-translate-y-1 transition-all duration-300 group">
            <div className="w-10 h-10 rounded-lg bg-primary/10 dark:bg-blue-500/20 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <svg className="w-5 h-5 text-primary dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            </div>
            <h3 className="text-xl font-semibold mb-2 text-gray-800 dark:text-gray-100 group-hover:text-primary dark:group-hover:text-blue-400 transition-colors">{t('newRequest')}</h3>
            <p className="text-gray-600 dark:text-gray-400">{t('requestAccess')}</p>
          </Link>

          <Link to="/my-requests" data-tour="my-requests-card" className="card hover:shadow-lg dark:hover:shadow-dark-lg hover:border-primary/30 dark:hover:border-blue-500/30 hover:-translate-y-1 transition-all duration-300 group">
            <div className="w-10 h-10 rounded-lg bg-secondary/20 dark:bg-secondary/30 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <svg className="w-5 h-5 text-secondary-600 dark:text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
            </div>
            <h3 className="text-xl font-semibold mb-2 text-gray-800 dark:text-gray-100 group-hover:text-primary dark:group-hover:text-blue-400 transition-colors">{t('myRequests')}</h3>
            <p className="text-gray-600 dark:text-gray-400">{t('viewStatuses')}</p>
          </Link>

          <Link to="/my-approvals" className="card hover:shadow-lg dark:hover:shadow-dark-lg hover:border-primary/30 dark:hover:border-blue-500/30 hover:-translate-y-1 transition-all duration-300 group">
            <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-500/20 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <h3 className="text-xl font-semibold mb-2 text-gray-800 dark:text-gray-100 group-hover:text-primary dark:group-hover:text-blue-400 transition-colors">{t('pendingApprovals')}</h3>
            <p className="text-gray-600 dark:text-gray-400">{t('awaitingApproval')}</p>
          </Link>

          <Link to="/systems" className="card hover:shadow-lg dark:hover:shadow-dark-lg hover:border-primary/30 dark:hover:border-blue-500/30 hover:-translate-y-1 transition-all duration-300 group">
            <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-500/20 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
            </div>
            <h3 className="text-xl font-semibold mb-2 text-gray-800 dark:text-gray-100 group-hover:text-primary dark:group-hover:text-blue-400 transition-colors">{t('systems')}</h3>
            <p className="text-gray-600 dark:text-gray-400">{t('availableSystems')}</p>
          </Link>
        </div>

        <div className="card">
          <h2 className="text-2xl font-semibold mb-4 dark:text-gray-100">{t('welcomeIDM')}</h2>
          <ul className="space-y-3 text-gray-700 dark:text-gray-300">
            <li className="flex items-center"><YellowCheckIcon size={20} className="mr-3" />{t('feature1')}</li>
            <li className="flex items-center"><YellowCheckIcon size={20} className="mr-3" />{t('feature2')}</li>
            <li className="flex items-center"><YellowCheckIcon size={20} className="mr-3" />{t('feature3')}</li>
            <li className="flex items-center"><YellowCheckIcon size={20} className="mr-3" />{t('feature4')}</li>
            <li className="flex items-center"><YellowCheckIcon size={20} className="mr-3" />{t('feature5')}</li>
          </ul>
        </div>
      </div>
    </Layout>
  );
}

// Tour Wrapper - wraps routes with TourProvider
function TourWrapper({ children }) {
  const { user } = useAuth();
  return <TourProvider user={user}>{children}</TourProvider>;
}

// Main App
function App() {
  return (
    <BrowserRouter>
      <LanguageProvider>
        <ThemeProvider>
          <AuthProvider>
            <TourWrapper>
            <Routes>
              <Route path="/login" element={<LoginPage />} />

              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/create-request"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <CreateRequestPage />
                    </Layout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/my-requests"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <MyRequestsListPage />
                    </Layout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/requests/:id"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <RequestDetailPage />
                    </Layout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/my-approvals"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <MyApprovalsPage />
                    </Layout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/systems"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <SystemsPage />
                    </Layout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin/dashboard"
                element={
                  <ProtectedRoute>
                    <AdminRoute>
                      <Layout>
                        <DashboardPage />
                      </Layout>
                    </AdminRoute>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <AdminPage />
                    </Layout>
                  </ProtectedRoute>
                }
              />

              {/* Fallback: redirect to home if route not found */}
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
            </TourWrapper>
          </AuthProvider>
        </ThemeProvider>
      </LanguageProvider>
    </BrowserRouter>
  );
}

export default App;
