import { useState, useEffect } from 'react';
import { usersAPI, adminAPI } from '../services/api';
import { PlusIcon } from '../components/Icons';
import { useLanguage } from '../App';

export default function AdminUsers() {
  const { t } = useLanguage();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await usersAPI.list({});
      setUsers(res.data);
    } catch (error) {
      console.error('Error loading users:', error);
      alert('Error loading users');
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-primary dark:text-blue-400">{t('userManagement')}</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">{t('addEditUsers')}</p>
        </div>
        <button
          onClick={() => {
            setEditingUser(null);
            setShowModal(true);
          }}
          className="btn btn-primary flex items-center"
        >
          <PlusIcon size={18} className="mr-2" /> {t('addUser')}
        </button>
      </div>

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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">{t('actions')}</th>
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
                      {user.is_active ? (
                        <span className="badge badge-success">{t('active')}</span>
                      ) : (
                        <span className="badge badge-secondary">{t('inactive')}</span>
                      )}
                    </td>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
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
