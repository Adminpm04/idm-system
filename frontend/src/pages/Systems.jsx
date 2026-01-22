import { useState, useEffect } from 'react';
import { systemsAPI } from '../services/api';

export default function Systems() {
  const [systems, setSystems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSystems();
  }, []);

  const loadSystems = async () => {
    setLoading(true);
    try {
      const res = await systemsAPI.list({ is_active: true });
      setSystems(res.data);
    } catch (error) {
      console.error('Error loading systems:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-12">Загрузка...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-primary">Системы</h1>
        <p className="text-gray-600 mt-2">Доступные корпоративные системы</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {systems.map((system) => (
          <div
            key={system.id}
            className="card hover:shadow-lg transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-primary">
                  {system.name}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {system.code}
                </p>
              </div>

              {system.is_active ? (
                <span className="badge badge-success">Активна</span>
              ) : (
                <span className="badge badge-secondary">Неактивна</span>
              )}
            </div>

            <p className="text-gray-600 text-sm mb-4">
              {system.description}
            </p>

            {system.url && (
              <a
                href={system.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline text-sm flex items-center"
              >
                <span className="mr-1">🔗</span>
                Открыть систему
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

