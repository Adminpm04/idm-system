import { useState, useEffect } from 'react';
import { adminAPI } from '../services/api';
import { CrossIcon, WarningIcon, PlusIcon, RoleIcon } from '../components/Icons';

export default function AdminRoles() {
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState(null);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    loadRoles();
    loadPermissions();
  }, []);

  const loadRoles = async () => {
    setLoading(true);
    try {
      const res = await adminAPI.roles.list();
      setRoles(res.data);
    } catch (error) {
      console.error('Error loading roles:', error);
      alert('Ошибка загрузки ролей');
    } finally {
      setLoading(false);
    }
  };

  const loadPermissions = async () => {
    try {
      const res = await adminAPI.permissions.list();
      setPermissions(res.data);
    } catch (error) {
      console.error('Error loading permissions:', error);
    }
  };

  const handleDeleteClick = (role) => {
    setRoleToDelete(role);
    setDeleteError('');
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!roleToDelete) return;

    try {
      await adminAPI.roles.delete(roleToDelete.id);
      setShowDeleteConfirm(false);
      setRoleToDelete(null);
      loadRoles();
    } catch (error) {
      setDeleteError(error.response?.data?.detail || 'Ошибка удаления роли');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-primary">Управление ролями</h1>
          <p className="text-gray-600 mt-2">Роли и права доступа в системе</p>
        </div>
        <button
          onClick={() => {
            setEditingRole(null);
            setShowModal(true);
          }}
          className="btn btn-primary flex items-center"
        >
          <PlusIcon size={18} className="mr-2" /> Добавить роль
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">Загрузка...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {roles.map((role) => (
            <div key={role.id} className="card hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center">
                  <RoleIcon size={28} className="mr-3" />
                  <div>
                    <h3 className="text-xl font-bold text-primary">{role.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">{role.description}</p>
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Права доступа ({role.permissions?.length || 0}):
                </p>
                <div className="flex flex-wrap gap-1">
                  {role.permissions?.slice(0, 5).map((perm) => (
                    <span key={perm.id} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      {perm.resource}:{perm.action}
                    </span>
                  ))}
                  {role.permissions?.length > 5 && (
                    <span className="text-xs text-gray-500">
                      +{role.permissions.length - 5} ещё
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-4 border-t flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setEditingRole(role);
                    setShowModal(true);
                  }}
                  className="text-primary hover:text-primary/80 text-sm"
                >
                  Изменить
                </button>
                <button
                  onClick={() => handleDeleteClick(role)}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  Удалить
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <RoleModal
          role={editingRole}
          permissions={permissions}
          onClose={() => {
            setShowModal(false);
            setEditingRole(null);
          }}
          onSave={() => {
            setShowModal(false);
            setEditingRole(null);
            loadRoles();
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && roleToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <WarningIcon size={32} className="mr-3" />
              <h2 className="text-xl font-bold text-gray-900">Удаление роли</h2>
            </div>

            <p className="text-gray-600 mb-4">
              Вы уверены, что хотите удалить роль <strong>"{roleToDelete.name}"</strong>?
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Это действие нельзя отменить. Роль будет удалена вместе со всеми её правами доступа.
            </p>

            {deleteError && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start">
                <CrossIcon size={20} className="mr-2 flex-shrink-0 mt-0.5" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setRoleToDelete(null);
                  setDeleteError('');
                }}
                className="btn btn-secondary"
              >
                Отмена
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="btn bg-red-600 text-white hover:bg-red-700"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RoleModal({ role, permissions, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: role?.name || '',
    description: role?.description || '',
    permission_ids: role?.permissions?.map(p => p.id) || [],
  });

  // Группируем права по ресурсам
  const groupedPermissions = permissions.reduce((acc, perm) => {
    if (!acc[perm.resource]) {
      acc[perm.resource] = [];
    }
    acc[perm.resource].push(perm);
    return acc;
  }, {});

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await adminAPI.roles.create(formData);
      alert(role ? 'Роль обновлена' : 'Роль создана');
      onSave();
    } catch (error) {
      alert('Ошибка: ' + (error.response?.data?.detail || error.message));
    }
  };

  const togglePermission = (permId) => {
    setFormData(prev => ({
      ...prev,
      permission_ids: prev.permission_ids.includes(permId)
        ? prev.permission_ids.filter(id => id !== permId)
        : [...prev.permission_ids, permId]
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 my-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">
            {role ? 'Редактировать роль' : 'Новая роль'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Название роли *</label>
            <input
              type="text"
              required
              className="input"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Описание</label>
            <textarea
              className="input"
              rows="2"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Права доступа</label>
            <div className="max-h-64 overflow-y-auto border rounded p-3 space-y-3">
              {Object.entries(groupedPermissions).map(([resource, perms]) => (
                <div key={resource} className="border-b pb-2">
                  <h4 className="font-medium text-sm text-gray-700 mb-2">{resource}</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {perms.map(perm => (
                      <label key={perm.id} className="flex items-center text-sm">
                        <input
                          type="checkbox"
                          className="mr-2"
                          checked={formData.permission_ids.includes(perm.id)}
                          onChange={() => togglePermission(perm.id)}
                        />
                        <span>{perm.action}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
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
