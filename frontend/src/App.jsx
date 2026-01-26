import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import { authAPI, requestsAPI } from './services/api';

// Import pages
import CreateRequestPage from './pages/CreateRequest';
import MyRequestsListPage from './pages/MyRequests';
import AdminPage from './pages/Admin';
import DashboardPage from './pages/Dashboard';
import SystemsPage from './pages/Systems';
import RequestDetailPage from './pages/RequestDetail';
import MyApprovalsPage from './pages/MyApprovals';
import GlobalSearch from './components/GlobalSearch';
import { HomeIcon, RequestIcon, PendingIcon, SystemIcon, AdminIcon, PlusIcon, CheckIcon } from './components/Icons';

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

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      authAPI.getMe()
        .then(res => setUser(res.data))
        .catch(() => {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (username, password) => {
    const response = await authAPI.login(username, password);
    localStorage.setItem('access_token', response.data.access_token);
    localStorage.setItem('refresh_token', response.data.refresh_token);
    const userRes = await authAPI.getMe();
    setUser(userRes.data);
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Загрузка...</div>
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

// Friendly Login Background with Brand Colors
function LoginBackground() {
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
          Добро пожаловать!
        </h2>
        <p className="text-xl opacity-90 max-w-md mb-6">
          Единая система управления доступами
        </p>
        <div className="flex flex-wrap gap-3">
          <span className="bg-secondary text-primary rounded-full px-4 py-2 text-sm font-semibold">
            Быстрый доступ
          </span>
          <span className="bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 text-sm font-medium">
            Безопасность
          </span>
          <span className="bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 text-sm font-medium">
            Простота
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
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(username, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.detail || 'Ошибка входа');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Friendly Animated Background */}
      <div className="hidden lg:flex lg:w-1/2 relative">
        <LoginBackground />
      </div>

      {/* Right side - Login form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-primary rounded-2xl mb-4 shadow-lg animate-bounce-slow relative overflow-hidden group">
              <div className="absolute inset-0 bg-secondary/20 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
              <svg className="w-10 h-10 text-secondary relative z-10 transform group-hover:scale-110 transition-transform duration-300" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L4 6v6c0 5.25 3.4 10.2 8 12 4.6-1.8 8-6.75 8-12V6l-8-4zm0 4a3 3 0 110 6 3 3 0 010-6zm0 14c-2.5 0-4.7-1.3-6-3.2.03-2 4-3.1 6-3.1s5.97 1.1 6 3.1c-1.3 1.9-3.5 3.2-6 3.2z"/>
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-primary mb-2">IDM <span className="text-secondary">System</span></h1>
            <p className="text-gray-500">Система управления доступами</p>
            <style>{`
              @keyframes bounce-slow {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-8px); }
              }
              .animate-bounce-slow { animation: bounce-slow 3s ease-in-out infinite; }
            `}</style>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                  </svg>
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Имя пользователя
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-primary/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="input pl-10"
                    placeholder="Введите логин"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Пароль
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-primary/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input pl-10"
                    placeholder="Введите пароль"
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
                    Вход...
                  </span>
                ) : 'Войти в систему'}
              </button>
            </form>

            <div className="mt-6 pt-4 border-t border-gray-100">
              <div className="flex items-center justify-center text-sm text-gray-400">
                <svg className="w-4 h-4 mr-2 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Войдите с учётной записью домена
              </div>
            </div>
          </div>

          <div className="mt-8 text-center">
            <p className="text-sm text-gray-400">
              IDM System
            </p>
            <p className="text-xs text-gray-300 mt-1">
              Oriyonbonk © 2025
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Layout
function Layout({ children }) {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);

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
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-primary text-white shadow-lg">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-8">
              <Link to="/" className="text-2xl font-bold flex items-center space-x-2">
                <span>IDM</span>
                <span className="text-secondary">System</span>
              </Link>

              <nav className="hidden md:flex space-x-6">
                <Link to="/" className="hover:text-secondary transition-colors">
                  Главная
                </Link>
                <Link to="/my-requests" className="hover:text-secondary transition-colors">
                  Мои заявки
                </Link>
                <Link to="/my-approvals" className="hover:text-secondary transition-colors relative flex items-center">
                  На согласовании
                  {pendingApprovalsCount > 0 && (
                    <span className="ml-2 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
                      {pendingApprovalsCount}
                    </span>
                  )}
                </Link>
                <Link to="/systems" className="hover:text-secondary transition-colors">
                  Системы
                </Link>
                {user?.is_superuser && (
                  <Link to="/admin" className="hover:text-secondary transition-colors">
                    Админ
                  </Link>
                )}
              </nav>
            </div>

            {/* Global Search */}
            <div className="hidden lg:flex flex-1 justify-center max-w-md mx-4">
              <GlobalSearch />
            </div>

            <div className="flex items-center space-x-4">
              <span className="text-sm hidden md:inline">{user?.full_name}</span>
              <button onClick={logout} className="btn btn-secondary text-sm">
                Выход
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

// Dashboard (твой кастомный, оставляю как есть)
function Dashboard() {
  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-primary">Панель управления</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Link to="/create-request" className="card hover:shadow-lg transition-shadow group">
            <div className="flex items-center mb-3">
              <PlusIcon size={32} className="mr-3 group-hover:scale-110 transition-transform" />
              <h3 className="text-xl font-semibold">Новая заявка</h3>
            </div>
            <p className="text-gray-600">Запросить доступ к системе</p>
          </Link>

          <Link to="/my-requests" className="card hover:shadow-lg transition-shadow group">
            <div className="flex items-center mb-3">
              <RequestIcon size={32} className="mr-3 group-hover:scale-110 transition-transform" />
              <h3 className="text-xl font-semibold">Мои заявки</h3>
            </div>
            <p className="text-gray-600">Просмотр статусов заявок</p>
          </Link>

          <Link to="/my-approvals" className="card hover:shadow-lg transition-shadow group">
            <div className="flex items-center mb-3">
              <PendingIcon size={32} className="mr-3 group-hover:scale-110 transition-transform" />
              <h3 className="text-xl font-semibold">На согласовании</h3>
            </div>
            <p className="text-gray-600">Заявки, ожидающие утверждения</p>
          </Link>

          <Link to="/systems" className="card hover:shadow-lg transition-shadow group">
            <div className="flex items-center mb-3">
              <SystemIcon size={32} className="mr-3 group-hover:scale-110 transition-transform" />
              <h3 className="text-xl font-semibold">Системы</h3>
            </div>
            <p className="text-gray-600">Доступные системы</p>
          </Link>
        </div>

        <div className="card">
          <h2 className="text-2xl font-semibold mb-4">Добро пожаловать в IDM System</h2>
          <p className="text-gray-700 mb-4">
            Система управления доступами предназначена для централизованного запроса,
            согласования и предоставления доступов к корпоративным системам.
          </p>
          <ul className="space-y-3 text-gray-700">
            <li className="flex items-center"><CheckIcon size={20} className="mr-3" />Полная прозрачность процесса согласования</li>
            <li className="flex items-center"><CheckIcon size={20} className="mr-3" />Автоматическая маршрутизация заявок</li>
            <li className="flex items-center"><CheckIcon size={20} className="mr-3" />Аудит всех действий и решений</li>
            <li className="flex items-center"><CheckIcon size={20} className="mr-3" />Временные доступы с авто-отзывом</li>
            <li className="flex items-center"><CheckIcon size={20} className="mr-3" />Периодическое переутверждение доступов</li>
          </ul>
        </div>
      </div>
    </Layout>
  );
}

// Main App
function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
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
            path="/admin"
            element={
              <ProtectedRoute>
                <Layout>
                  <AdminPage />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* На всякий случай: редирект на главную если route не найден */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

