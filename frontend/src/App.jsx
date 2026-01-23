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
    <div className="min-h-screen bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center p-4">
      <div className="card max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">IDM System</h1>
          <p className="text-gray-600">Система управления доступами</p>
          <div className="mt-4 w-32 h-1 bg-secondary mx-auto"></div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Имя пользователя
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="input"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Пароль
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full"
          >
            {loading ? 'Вход...' : 'Войти'}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-600 text-center">
            IDM System v1.0
          </p>
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

