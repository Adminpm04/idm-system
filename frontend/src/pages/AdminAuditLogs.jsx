import { useState, useEffect } from 'react';
import { adminAPI } from '../services/api';
import { useLanguage } from '../App';

export default function AdminAuditLogs() {
  const { t } = useLanguage();
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Filter options
  const [actions, setActions] = useState([]);
  const [users, setUsers] = useState([]);

  // Filters
  const [filters, setFilters] = useState({
    limit: 50,
    offset: 0,
    user_id: '',
    action: '',
    request_id: '',
    date_from: '',
    date_to: '',
    search: ''
  });

  // Show/hide filters panel
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadFilterOptions();
  }, []);

  useEffect(() => {
    loadLogs();
  }, [filters]);

  const loadFilterOptions = async () => {
    try {
      const [actionsRes, usersRes] = await Promise.all([
        adminAPI.auditLogs.actions(),
        adminAPI.auditLogs.users()
      ]);
      setActions(actionsRes.data || []);
      setUsers(usersRes.data || []);
    } catch (error) {
      console.error('Error loading filter options:', error);
    }
  };

  const loadLogs = async () => {
    setLoading(true);
    try {
      // Build params, removing empty values
      const params = {};
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== '' && value !== null && value !== undefined) {
          params[key] = value;
        }
      });

      const res = await adminAPI.auditLogs.list(params);
      // Handle both old format (array) and new format ({logs, total})
      if (Array.isArray(res.data)) {
        setLogs(res.data);
        setTotal(res.data.length);
      } else {
        setLogs(res.data.logs || []);
        setTotal(res.data.total || 0);
      }
    } catch (error) {
      console.error('Error loading audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = {};
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== '' && value !== null && value !== undefined && key !== 'limit' && key !== 'offset') {
          params[key] = value;
        }
      });

      const res = await adminAPI.auditLogs.export(params);

      // Create download link
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting audit logs:', error);
      alert(t('errorExporting') || 'Error exporting');
    } finally {
      setExporting(false);
    }
  };

  const clearFilters = () => {
    setFilters({
      limit: 50,
      offset: 0,
      user_id: '',
      action: '',
      request_id: '',
      date_from: '',
      date_to: '',
      search: ''
    });
  };

  const hasActiveFilters = () => {
    return filters.user_id || filters.action || filters.request_id ||
           filters.date_from || filters.date_to || filters.search;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getActionBadge = (action) => {
    const badges = {
      'created': 'badge-info',
      'updated': 'badge-warning',
      'deleted': 'badge-rejected',
      'approved': 'badge-approved',
      'rejected': 'badge-rejected',
      'commented': 'badge-info',
      'fully_approved': 'badge-approved',
      'submitted': 'badge-submitted',
      'login': 'badge-secondary',
      'logout': 'badge-secondary',
    };
    return badges[action] || 'badge-secondary';
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
      'login': t('actionLogin') || 'Login',
      'logout': t('actionLogout') || 'Logout',
    };
    return texts[action] || action;
  };

  const currentPage = Math.floor(filters.offset / filters.limit) + 1;
  const totalPages = Math.ceil(total / filters.limit);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary dark:text-blue-400">{t('auditLogTitle')}</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">{t('auditHistory')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn ${showFilters ? 'btn-primary' : 'btn-outline'} flex items-center`}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            {t('filters') || 'Filters'}
            {hasActiveFilters() && (
              <span className="ml-2 w-2 h-2 bg-red-500 rounded-full"></span>
            )}
          </button>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="btn btn-outline flex items-center"
          >
            {exporting ? (
              <svg className="animate-spin w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
            ) : (
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            )}
            {t('exportCSV') || 'Export CSV'}
          </button>
          <button onClick={loadLogs} className="btn btn-secondary">
            {t('refresh')}
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="card bg-gray-50 dark:bg-gray-800/50">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('search')}
              </label>
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters({...filters, search: e.target.value, offset: 0})}
                placeholder={t('searchInDetails') || 'Search in details...'}
                className="input"
              />
            </div>

            {/* User Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('user')}
              </label>
              <select
                value={filters.user_id}
                onChange={(e) => setFilters({...filters, user_id: e.target.value, offset: 0})}
                className="input"
              >
                <option value="">{t('all')}</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.full_name} ({user.log_count})
                  </option>
                ))}
              </select>
            </div>

            {/* Action Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('action')}
              </label>
              <select
                value={filters.action}
                onChange={(e) => setFilters({...filters, action: e.target.value, offset: 0})}
                className="input"
              >
                <option value="">{t('all')}</option>
                {actions.map(action => (
                  <option key={action} value={action}>
                    {getActionText(action)}
                  </option>
                ))}
              </select>
            </div>

            {/* Request ID */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('requestId') || 'Request ID'}
              </label>
              <input
                type="number"
                value={filters.request_id}
                onChange={(e) => setFilters({...filters, request_id: e.target.value, offset: 0})}
                placeholder="123"
                className="input"
              />
            </div>

            {/* Date From */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('dateFrom') || 'Date From'}
              </label>
              <input
                type="datetime-local"
                value={filters.date_from}
                onChange={(e) => setFilters({...filters, date_from: e.target.value, offset: 0})}
                className="input"
              />
            </div>

            {/* Date To */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('dateTo') || 'Date To'}
              </label>
              <input
                type="datetime-local"
                value={filters.date_to}
                onChange={(e) => setFilters({...filters, date_to: e.target.value, offset: 0})}
                className="input"
              />
            </div>

            {/* Clear Filters */}
            <div className="flex items-end">
              <button
                onClick={clearFilters}
                disabled={!hasActiveFilters()}
                className="btn btn-ghost text-red-600 dark:text-red-400 disabled:opacity-50"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                {t('clearFilters') || 'Clear Filters'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats Bar */}
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <div className="flex items-center text-gray-600 dark:text-gray-400">
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          {t('totalRecords') || 'Total'}: <span className="font-semibold ml-1">{total}</span>
        </div>
        {hasActiveFilters() && (
          <span className="badge badge-info">
            {t('filtersApplied') || 'Filters applied'}
          </span>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <svg className="animate-spin h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
          </svg>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
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
                    <td colSpan="6" className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">
                      <svg className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      {t('noAuditEntries')}
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-4 py-3 text-sm whitespace-nowrap dark:text-gray-300">
                        {formatDate(log.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-2">
                          <div className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                            {(log.user?.full_name || 'S')[0].toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium dark:text-gray-100 truncate">{log.user?.full_name || 'System'}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{log.user?.email || '-'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={'badge ' + getActionBadge(log.action)}>
                          {getActionText(log.action)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="max-w-md">
                          <p className="text-sm text-gray-900 dark:text-gray-100 line-clamp-2">{log.details}</p>
                          {log.request && (
                            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                              <span className="font-medium">{t('system')}:</span> {log.request.system?.name || '-'}
                              {' | '}
                              <span className="font-medium">{t('forUser')}:</span> {log.request.target_user?.full_name || '-'}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {log.request_id ? (
                          <a href={'/requests/' + log.request_id} className="text-primary dark:text-blue-400 hover:underline font-medium">
                            #{log.request_id}
                          </a>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 font-mono">
                        {log.ip_address || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {logs.length > 0 && (
            <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600 flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {t('showing')} {filters.offset + 1}-{Math.min(filters.offset + logs.length, total)} {t('of')} {total} {t('entries')}
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setFilters({...filters, offset: 0})}
                  disabled={filters.offset === 0}
                  className="btn btn-sm btn-ghost disabled:opacity-50"
                  title={t('firstPage') || 'First'}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={() => setFilters({...filters, offset: Math.max(0, filters.offset - filters.limit)})}
                  disabled={filters.offset === 0}
                  className="btn btn-sm btn-secondary disabled:opacity-50"
                >
                  {t('previous')}
                </button>
                <span className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400">
                  {currentPage} / {totalPages || 1}
                </span>
                <button
                  onClick={() => setFilters({...filters, offset: filters.offset + filters.limit})}
                  disabled={filters.offset + filters.limit >= total}
                  className="btn btn-sm btn-secondary disabled:opacity-50"
                >
                  {t('next')}
                </button>
                <button
                  onClick={() => setFilters({...filters, offset: Math.max(0, (totalPages - 1) * filters.limit)})}
                  disabled={filters.offset + filters.limit >= total}
                  className="btn btn-sm btn-ghost disabled:opacity-50"
                  title={t('lastPage') || 'Last'}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
