import { useState, useEffect } from 'react';
import { adminAPI } from '../services/api';
import { useLanguage } from '../App';

export default function AdminAuditLogs() {
  const { t } = useLanguage();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    limit: 50,
    offset: 0
  });

  useEffect(() => {
    loadLogs();
  }, [filters]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const res = await adminAPI.auditLogs.list(filters);
      setLogs(res.data);
    } catch (error) {
      console.error('Error loading audit logs:', error);
      alert('Error loading audit logs');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getActionBadge = (action) => {
    const badges = {
      'created': 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200',
      'updated': 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200',
      'deleted': 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200',
      'approved': 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200',
      'rejected': 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200',
      'commented': 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200',
      'fully_approved': 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200',
    };
    return badges[action] || 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
  };

  const getActionText = (action) => {
    const texts = {
      'created': t('actionCreated'),
      'updated': t('actionUpdated'),
      'deleted': t('actionDeleted'),
      'approved': t('actionApproved'),
      'rejected': t('actionRejected'),
      'commented': t('actionCommented'),
      'fully_approved': t('actionFullyApproved'),
      'submitted': t('actionSubmitted'),
    };
    return texts[action] || action;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-primary dark:text-blue-400">{t('auditLogTitle')}</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">{t('auditHistory')}</p>
        </div>
        <button
          onClick={loadLogs}
          className="btn btn-secondary"
        >
          {t('refresh')}
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
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">{t('dateTime')}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">{t('user')}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">{t('action')}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">{t('details')}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">{t('request')}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">{t('ipAddress')}</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                      {t('noAuditEntries')}
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-4 py-3 text-sm whitespace-nowrap dark:text-gray-300">
                        {formatDate(log.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-2">
                          <div className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-bold text-sm">
                            {(log.user?.full_name || 'S')[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium dark:text-gray-100">{log.user?.full_name || 'System'}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{log.user?.email || '-'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={'px-2 py-1 rounded text-xs font-medium ' + getActionBadge(log.action)}>
                          {getActionText(log.action)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="max-w-md">
                          <p className="text-sm text-gray-900 dark:text-gray-100">{log.details}</p>
                          {log.request && (
                            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                              <span className="font-medium">System:</span> {log.request.system?.name || '-'}
                              {' - '}
                              <span className="font-medium">For:</span> {log.request.target_user?.full_name || '-'}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {log.request_id ? (
                          <a href={'/requests/' + log.request_id} className="text-primary dark:text-blue-400 hover:underline font-medium">
                            Request #{log.request_id}
                          </a>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {log.ip_address || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {logs.length > 0 && (
            <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600 flex justify-between items-center">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {t('showing')}: {logs.length} {t('entries')}
              </div>
              <div className="space-x-2">
                <button
                  onClick={() => setFilters({...filters, offset: Math.max(0, filters.offset - filters.limit)})}
                  disabled={filters.offset === 0}
                  className="btn btn-secondary disabled:opacity-50"
                >
                  {t('previous')}
                </button>
                <button
                  onClick={() => setFilters({...filters, offset: filters.offset + filters.limit})}
                  disabled={logs.length < filters.limit}
                  className="btn btn-secondary disabled:opacity-50"
                >
                  {t('next')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
