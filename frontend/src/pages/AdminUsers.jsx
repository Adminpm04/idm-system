import { useState, useEffect } from 'react';
import { usersAPI, adminAPI } from '../services/api';
import { PlusIcon } from '../components/Icons';
import { useLanguage, useAuth } from '../App';

// Clock icon for demo users
const ClockIcon = ({ size = 20, className = '' }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12 6 12 12 16 14"></polyline>
  </svg>
);

const CopyIcon = ({ size = 20, className = '' }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
  </svg>
);

export default function AdminUsers() {
  const { t } = useLanguage();
  const { user: currentUser } = useAuth();
  const isDemo = currentUser?.is_demo;
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [demoUsers, setDemoUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [newDemoUser, setNewDemoUser] = useState(null);

  useEffect(() => {
    if (activeTab === 'users') {
      loadUsers();
    } else if (!isDemo) {
      loadDemoUsers();
    }
  }, [activeTab, isDemo]);

  // Auto-refresh demo users every 30 seconds
  useEffect(() => {
    if (activeTab === 'demo') {
      const interval = setInterval(loadDemoUsers, 30000);
      return () => clearInterval(interval);
    }
  }, [activeTab]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await usersAPI.list({});
      let filteredUsers = res.data.filter(u => !u.is_demo);
      // Demo users should not see AD users
      if (isDemo) {
        filteredUsers = filteredUsers.filter(u => u.auth_source !== 'ldap');
      }
      setUsers(filteredUsers);
    } catch (error) {
      console.error('Error loading users:', error);
      alert('Error loading users');
    } finally {
      setLoading(false);
    }
  };

  const loadDemoUsers = async () => {
    setLoading(true);
    try {
      const res = await adminAPI.demoUsers.list();
      setDemoUsers(res.data);
    } catch (error) {
      console.error('Error loading demo users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm(t('confirmDeleteUser'))) return;

    try {
      await usersAPI.delete(id);
      alert(t('userDeleted'));
      loadUsers();
    } catch (error) {
      alert(t('errorDeleting') + ': ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleDeleteDemo = async (id) => {
    if (!confirm(t('confirmDeleteUser'))) return;

    try {
      await adminAPI.demoUsers.delete(id);
      loadDemoUsers();
    } catch (error) {
      alert(t('errorDeleting') + ': ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleExtendDemo = async (id, minutes) => {
    try {
      await adminAPI.demoUsers.extend(id, minutes);
      loadDemoUsers();
    } catch (error) {
      alert(t('error') + ': ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleCleanup = async () => {
    try {
      const res = await adminAPI.demoUsers.cleanup();
      alert(`${t('cleanupDone')}: ${res.data.deactivated}`);
      loadDemoUsers();
    } catch (error) {
      alert(t('error') + ': ' + (error.response?.data?.detail || error.message));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-primary dark:text-blue-400">{t('userManagement')}</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {isDemo ? t('viewOnly') : t('addEditUsers')}
          </p>
        </div>
        {!isDemo && activeTab === 'users' && (
          <button
            onClick={() => {
              setEditingUser(null);
              setShowModal(true);
            }}
            className="btn btn-primary flex items-center"
          >
            <PlusIcon size={18} className="mr-2" /> {t('addUser')}
          </button>
        )}
        {!isDemo && activeTab === 'demo' && (
          <div className="flex space-x-2">
            <button
              onClick={handleCleanup}
              className="btn btn-outline flex items-center"
            >
              {t('cleanupExpired')}
            </button>
            <button
              onClick={() => setShowDemoModal(true)}
              className="btn btn-primary flex items-center"
            >
              <PlusIcon size={18} className="mr-2" /> {t('createDemoUser')}
            </button>
          </div>
        )}
      </div>

      {/* Tabs - hide demo tab for demo users */}
      {!isDemo && (
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('users')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'users'
                  ? 'border-primary text-primary dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              {t('users')}
            </button>
            <button
              onClick={() => setActiveTab('demo')}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                activeTab === 'demo'
                  ? 'border-primary text-primary dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <ClockIcon size={16} className="mr-2" />
              {t('demoAccounts')}
            </button>
          </nav>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <>
          {loading ? (
            <div className="flex justify-center py-12 text-gray-600 dark:text-gray-400">{t('loading')}</div>
          ) : (
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">{t('user')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">{t('email')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">{t('username')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">{t('roles')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">{t('authSource')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">{t('status')}</th>
                      {!isDemo && (
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">{t('actions')}</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {users.map((user) => (
                      <tr key={user.id}>
                        <td className="px-6 py-4 font-medium dark:text-gray-100">{user.full_name}</td>
                        <td className="px-6 py-4 dark:text-gray-300">{user.email}</td>
                        <td className="px-6 py-4 dark:text-gray-300">{user.username}</td>
                        <td className="px-6 py-4 dark:text-gray-300">
                          {user.roles?.map(r => r.name).join(', ') || '-'}
                        </td>
                        <td className="px-6 py-4">
                          {user.auth_source === 'ldap' ? (
                            <span className="badge badge-submitted">AD</span>
                          ) : (
                            <span className="badge badge-secondary">{t('local')}</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {user.is_active ? (
                            <span className="badge badge-success">{t('active')}</span>
                          ) : (
                            <span className="badge badge-rejected">{t('inactive')}</span>
                          )}
                        </td>
                        {!isDemo && (
                          <td className="px-6 py-4 text-right space-x-2">
                            <button
                              onClick={() => {
                                setEditingUser(user);
                                setShowModal(true);
                              }}
                              className="text-primary dark:text-blue-400 hover:text-primary/80 dark:hover:text-blue-300"
                            >
                              {t('edit')}
                            </button>
                            <button
                              onClick={() => handleDelete(user.id)}
                              className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                            >
                              {t('delete')}
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Demo Users Tab */}
      {activeTab === 'demo' && (
        <>
          {loading ? (
            <div className="flex justify-center py-12 text-gray-600 dark:text-gray-400">{t('loading')}</div>
          ) : demoUsers.length === 0 ? (
            <div className="card text-center py-12">
              <ClockIcon size={48} className="mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 dark:text-gray-400">{t('noDemoUsers')}</p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">{t('demoAccountsDesc')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {demoUsers.map((user) => (
                <div
                  key={user.id}
                  className={`card border-2 ${
                    user.is_expired
                      ? 'border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/20'
                      : 'border-green-300 dark:border-green-800 bg-green-50 dark:bg-green-900/20'
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold text-lg dark:text-gray-100">{user.full_name}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">@{user.username}</p>
                    </div>
                    <span className={`badge ${user.is_expired ? 'badge-rejected' : 'badge-success'}`}>
                      {user.is_expired ? t('demoExpired') : t('demoActive')}
                    </span>
                  </div>

                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    <p>{user.email}</p>
                  </div>

                  {!user.is_expired && (
                    <div className="flex items-center text-sm mb-4">
                      <ClockIcon size={16} className="mr-2 text-green-600 dark:text-green-400" />
                      <span className="text-green-700 dark:text-green-300 font-medium">
                        {t('remainingTime')}: {user.remaining_minutes} {t('minutes')}
                      </span>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => handleExtendDemo(user.id, 10)}
                      className="btn btn-outline btn-sm"
                    >
                      +10 {t('minutes')}
                    </button>
                    <button
                      onClick={() => handleExtendDemo(user.id, 30)}
                      className="btn btn-outline btn-sm"
                    >
                      +30 {t('minutes')}
                    </button>
                    <button
                      onClick={() => handleDeleteDemo(user.id)}
                      className="btn btn-sm bg-red-600 text-white hover:bg-red-700"
                    >
                      {t('delete')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {showModal && (
        <UserModal
          user={editingUser}
          onClose={() => {
            setShowModal(false);
            setEditingUser(null);
          }}
          onSave={() => {
            setShowModal(false);
            setEditingUser(null);
            loadUsers();
          }}
        />
      )}

      {showDemoModal && (
        <DemoUserModal
          onClose={() => {
            setShowDemoModal(false);
            setNewDemoUser(null);
          }}
          onCreated={(user) => {
            setNewDemoUser(user);
            loadDemoUsers();
          }}
          newUser={newDemoUser}
        />
      )}
    </div>
  );
}

function UserModal({ user, onClose, onSave }) {
  const { t } = useLanguage();
  const [roles, setRoles] = useState([]);
  const [formData, setFormData] = useState({
    username: user?.username || '',
    email: user?.email || '',
    full_name: user?.full_name || '',
    password: '',
    is_active: user?.is_active ?? true,
    role_ids: user?.roles?.map(r => r.id) || [],
  });

  useEffect(() => {
    loadRoles();
  }, []);

  const loadRoles = async () => {
    try {
      const res = await adminAPI.roles.list();
      setRoles(res.data);
    } catch (error) {
      console.error('Error loading roles:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const submitData = {...formData};

      // If editing and password is empty - don't send it
      if (user && !submitData.password) {
        delete submitData.password;
      }

      if (user) {
        await usersAPI.update(user.id, submitData);
        alert(t('userUpdated'));
      } else {
        await usersAPI.create(submitData);
        alert(t('userCreated'));
      }
      onSave();
    } catch (error) {
      alert(t('error') + ': ' + (error.response?.data?.detail || error.message));
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-2xl font-bold mb-4 dark:text-gray-100">
          {user ? t('editUser') : t('newUser')}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t('username')} *</label>
            <input
              type="text"
              required
              className="input"
              value={formData.username}
              onChange={(e) => setFormData({...formData, username: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t('email')} *</label>
            <input
              type="email"
              required
              className="input"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t('fullName')} *</label>
            <input
              type="text"
              required
              className="input"
              value={formData.full_name}
              onChange={(e) => setFormData({...formData, full_name: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 dark:text-gray-300">
              {t('password')} {!user && '*'}
            </label>
            <input
              type="password"
              required={!user}
              className="input"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              placeholder={user ? t('leaveEmptyPassword') : ''}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t('roles')}</label>
            <div className="space-y-2 max-h-32 overflow-y-auto border dark:border-gray-600 rounded p-2 dark:bg-gray-700">
              {roles.map(role => (
                <label key={role.id} className="flex items-center">
                  <input
                    type="checkbox"
                    className="mr-2"
                    checked={formData.role_ids.includes(role.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData({...formData, role_ids: [...formData.role_ids, role.id]});
                      } else {
                        setFormData({...formData, role_ids: formData.role_ids.filter(id => id !== role.id)});
                      }
                    }}
                  />
                  <span className="text-sm dark:text-gray-300">{role.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                className="mr-2"
                checked={formData.is_active}
                onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
              />
              <span className="text-sm dark:text-gray-300">{t('active')}</span>
            </label>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              {t('cancel')}
            </button>
            <button type="submit" className="btn btn-primary">
              {t('save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DemoUserModal({ onClose, onCreated, newUser }) {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState(180); // 3 minutes in seconds
  const [formData, setFormData] = useState({
    username: '',
    full_name: '',
    email: '',
    password: 'demo123',
    minutes: 10,
  });

  // Countdown timer when credentials are shown
  useEffect(() => {
    let timer;
    if (newUser) {
      setTimeLeft(180); // Reset to 3 minutes
      timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [newUser]);

  // Format time as MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate progress percentage
  const progressPercent = (timeLeft / 180) * 100;

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await adminAPI.demoUsers.create(formData);
      onCreated(res.data);
    } catch (error) {
      alert(t('error') + ': ' + (error.response?.data?.detail || error.message));
    }
  };

  const copyCredentials = () => {
    if (newUser) {
      const text = `${t('username')}: ${newUser.username}\n${t('password')}: ${newUser.password}`;
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
        {!newUser ? (
          <>
            <h2 className="text-2xl font-bold mb-4 dark:text-gray-100 flex items-center">
              <ClockIcon size={24} className="mr-2" />
              {t('createDemoUser')}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t('demoUsername')} *</label>
                <input
                  type="text"
                  required
                  className="input"
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                  placeholder="demo_user"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t('demoFullName')}</label>
                <input
                  type="text"
                  className="input"
                  value={formData.full_name}
                  onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                  placeholder="Demo User"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t('demoEmail')}</label>
                <input
                  type="email"
                  className="input"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="demo@demo.local"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t('demoPassword')}</label>
                <input
                  type="text"
                  className="input"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t('accessDuration')}</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    min="1"
                    max="1440"
                    className="input w-24"
                    value={formData.minutes}
                    onChange={(e) => setFormData({...formData, minutes: parseInt(e.target.value) || 10})}
                  />
                  <span className="text-gray-600 dark:text-gray-400">{t('minutes')}</span>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {[10, 30, 60, 120].map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setFormData({...formData, minutes: m})}
                      className={`px-3 py-1 text-sm rounded ${
                        formData.minutes === m
                          ? 'bg-primary text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {m} {t('minutes')}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button type="button" onClick={onClose} className="btn btn-secondary">
                  {t('cancel')}
                </button>
                <button type="submit" className="btn btn-primary">
                  {t('createDemoUser')}
                </button>
              </div>
            </form>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-bold mb-4 text-green-600 dark:text-green-400 flex items-center">
              <ClockIcon size={24} className="mr-2" />
              {t('demoUserCreated')}
            </h2>

            {/* OTP-style countdown timer */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">{t('codeExpiresIn') || 'Code expires in'}:</span>
                <span className={`text-2xl font-mono font-bold ${timeLeft <= 30 ? 'text-red-500 animate-pulse' : 'text-primary'}`}>
                  {formatTime(timeLeft)}
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ${timeLeft <= 30 ? 'bg-red-500' : 'bg-primary'}`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-4">
              <div className="space-y-2">
                <p className="dark:text-gray-200">
                  <span className="font-medium">{t('username')}:</span> {newUser.username}
                </p>
                <p className="dark:text-gray-200">
                  <span className="font-medium">{t('password')}:</span> {newUser.password}
                </p>
                <p className="dark:text-gray-200">
                  <span className="font-medium">{t('accessDuration')}:</span> {newUser.minutes} {t('minutes')}
                </p>
              </div>
            </div>

            <button
              onClick={copyCredentials}
              className="btn btn-outline w-full flex items-center justify-center mb-4"
            >
              <CopyIcon size={18} className="mr-2" />
              {copied ? t('credentialsCopied') : t('copyCredentials')}
            </button>

            <div className="flex justify-end">
              <button onClick={onClose} className="btn btn-primary">
                {t('close')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
