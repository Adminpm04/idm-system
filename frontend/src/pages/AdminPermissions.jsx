import { useState, useEffect } from 'react';
import { adminAPI } from '../services/api';

export default function AdminPermissions() {
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPermissions();
  }, []);

  const loadPermissions = async () => {
    setLoading(true);
    try {
      const res = await adminAPI.permissions.list();
      setPermissions(res.data);
    } catch (error) {
      console.error('Error loading permissions:', error);
      alert('Ошибка загрузки прав доступа');
    } finally {
      setLoading(false);
    }
  };

  // Группируем права по ресурсам
  const groupedPermissions = permissions.reduce((acc, perm) => {
    if (!acc[perm.resource]) {
      acc[perm.resource] = [];
    }
    acc[perm.resource].push(perm);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-primary">Права доступа</h1>
        <p className="text-gray-600 mt-2">Список всех прав доступа в системе</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">Загрузка...</div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedPermissions).map(([resource, perms]) => (
            <div key={resource} className="card">
              <h3 className="text-xl font-bold text-primary mb-4 capitalize">{resource}</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {perms.map(perm => (
                  <div key={perm.id} className="flex items-center space-x-2">
                    <span className="text-2xl">•</span>
                    <div>
                      <p className="font-medium">{perm.action}</p>
                      <p className="text-sm text-gray-600">{perm.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
