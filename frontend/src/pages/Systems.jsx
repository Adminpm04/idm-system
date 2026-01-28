import { useState, useEffect } from 'react';
import { systemsAPI } from '../services/api';
import { LinkIcon, SystemIcon } from '../components/Icons';
import { useLanguage } from '../App';

export default function Systems() {
  const { t } = useLanguage();
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
    return <div className="flex justify-center py-12 text-gray-600 dark:text-gray-400">{t('loading')}</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-primary dark:text-blue-400">{t('systemsTitle')}</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">{t('corporateSystems')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {systems.map((system) => (
          <div
            key={system.id}
            className="card hover:shadow-lg transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center">
                <SystemIcon size={32} className="mr-3" />
                <div>
                  <h3 className="text-lg font-semibold text-primary dark:text-blue-400">
                    {system.name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {system.code}
                  </p>
                </div>
              </div>

              {system.is_active ? (
                <span className="badge badge-success">{t('active')}</span>
              ) : (
                <span className="badge badge-secondary">{t('inactive')}</span>
              )}
            </div>

            <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
              {system.description}
            </p>

            {system.url && (
              <a
                href={system.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary dark:text-blue-400 hover:underline text-sm flex items-center"
              >
                <LinkIcon size={18} className="mr-2" />
                {t('openSystem')}
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
