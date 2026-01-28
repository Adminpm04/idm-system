import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { requestsAPI } from '../services/api';
import { CheckIcon } from '../components/Icons';
import { useLanguage } from '../App';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const { t } = useLanguage();

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const res = await requestsAPI.statistics();
      setStats(res.data);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-primary dark:text-blue-400">{t('controlPanel')}</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">{t('controlPanelDesc')}</p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link to="/create-request" className="card hover:shadow-lg transition-shadow">
          <h3 className="text-lg font-semibold mb-2 dark:text-gray-100">{t('newRequest')}</h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm">{t('requestAccess')}</p>
        </Link>

        <Link to="/my-requests" className="card hover:shadow-lg transition-shadow">
          <h3 className="text-lg font-semibold mb-2 dark:text-gray-100">{t('myRequests')}</h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm">{t('viewStatuses')}</p>
        </Link>

        <Link to="/my-approvals" className="card hover:shadow-lg transition-shadow">
          <h3 className="text-lg font-semibold mb-2 dark:text-gray-100">{t('pendingApprovals')}</h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm">{t('awaitingApproval')}</p>
        </Link>

        <Link to="/systems" className="card hover:shadow-lg transition-shadow">
          <h3 className="text-lg font-semibold mb-2 dark:text-gray-100">{t('systems')}</h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm">{t('availableSystems')}</p>
        </Link>
      </div>

      {/* Features */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-4 dark:text-gray-100">{t('welcomeIDM')}</h2>
        <div className="space-y-4">
          <div className="flex items-start">
            <CheckIcon size={24} className="mr-3 flex-shrink-0" />
            <div>
              <strong className="dark:text-gray-100">{t('feature1')}</strong>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('feature1Desc')}</p>
            </div>
          </div>
          <div className="flex items-start">
            <CheckIcon size={24} className="mr-3 flex-shrink-0" />
            <div>
              <strong className="dark:text-gray-100">{t('feature2')}</strong>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('feature2Desc')}</p>
            </div>
          </div>
          <div className="flex items-start">
            <CheckIcon size={24} className="mr-3 flex-shrink-0" />
            <div>
              <strong className="dark:text-gray-100">{t('feature3')}</strong>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('feature3Desc')}</p>
            </div>
          </div>
          <div className="flex items-start">
            <CheckIcon size={24} className="mr-3 flex-shrink-0" />
            <div>
              <strong className="dark:text-gray-100">{t('feature4')}</strong>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('feature4Desc')}</p>
            </div>
          </div>
          <div className="flex items-start">
            <CheckIcon size={24} className="mr-3 flex-shrink-0" />
            <div>
              <strong className="dark:text-gray-100">{t('feature5')}</strong>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('feature5Desc')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
