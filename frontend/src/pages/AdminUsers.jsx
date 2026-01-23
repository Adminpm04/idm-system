import { useState, useEffect } from 'react';
import { usersAPI, adminAPI } from '../services/api';
import { UserIcon, PlusIcon } from '../components/Icons';

export default function AdminUsers() {
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
      alert('Ошибка загрузки пользователей');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Вы уверены что хотите удалить этого пользователя?')) return;
    
    try {
      await usersAPI.delete(id);
      alert('Пользователь удалён');
      loadUsers();
    } catch (error) {
      alert('Ошибка удаления: ' + (error.response?.data?.detail || error.message));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-primary">Управление пользователями</h1>
          <p className="text-gray-600 mt-2">Добавление и редактирование пользователей</p>
        </div>
        <button
          onClick={() => {
            setEditingUser(null);
            setShowModal(true);
          }}
          className="btn btn-primary flex items-center"
        >
          <PlusIcon size={18} className="mr-2" /> Добавить пользователя
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">Загрузка...</div>
      ) : (
        <div className="card">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Пользователь</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Логин</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Роли</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Статус</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Действия</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="px-6 py-4 font-medium">{user.full_name}</td>
                  <td className="px-6 py-4">{user.email}</td>
                  <td className="px-6 py-4">{user.username}</td>
                  <td className="px-6 py-4">
                    {user.roles?.map(r => r.name).join(', ') || '-'}
                  </td>
                  <td className="px-6 py-4">
                    {user.is_active ? (
                      <span className="badge badge-success">Активен</span>
                    ) : (
                      <span className="badge badge-secondary">Неактивен</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button 
                      onClick={() => {
                        setEditingUser(user);
                        setShowModal(true);
                      }}
                      className="text-primary hover:text-primary/80"
                    >
                      Изменить
                    </button>
                    <button 
                      onClick={() => handleDelete(user.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Удалить
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
      
      // Если редактирование и пароль пустой - не отправляем его
      if (user && !submitData.password) {
        delete submitData.password;
      }
      
      if (user) {
        await usersAPI.update(user.id, submitData);
        alert('Пользователь обновлён');
      } else {
        await usersAPI.create(submitData);
        alert('Пользователь создан');
      }
      onSave();
    } catch (error) {
      alert('Ошибка: ' + (error.response?.data?.detail || error.message));
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-2xl font-bold mb-4">
          {user ? 'Редактировать пользователя' : 'Новый пользователь'}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Логин *</label>
            <input
              type="text"
              required
              className="input"
              value={formData.username}
              onChange={(e) => setFormData({...formData, username: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Email *</label>
            <input
              type="email"
              required
              className="input"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Полное имя *</label>
            <input
              type="text"
              required
              className="input"
              value={formData.full_name}
              onChange={(e) => setFormData({...formData, full_name: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Пароль {!user && '*'}
            </label>
            <input
              type="password"
              required={!user}
              className="input"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              placeholder={user ? 'Оставьте пустым для сохранения текущего' : ''}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Роли</label>
            <div className="space-y-2 max-h-32 overflow-y-auto border rounded p-2">
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
                  <span className="text-sm">{role.name}</span>
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
              <span className="text-sm">Активен</span>
            </label>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Отмена
            </button>
            <button type="submit" className="btn btn-primary">
              Сохранить
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
