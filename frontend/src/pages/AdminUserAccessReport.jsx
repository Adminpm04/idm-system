import { useState, useEffect } from 'react';
import { useLanguage } from '../App';
import { systemsAPI } from '../services/api';
import api from '../services/api';

export default function AdminUserAccessReport() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [users, setUsers] = useState([]);
  const [systems, setSystems] = useState([]);
  const [filters, setFilters] = useState({
    system_id: '',
    department: '',
    search: ''
  });
  const [pagination, setPagination] = useState({
    skip: 0,
    limit: 50,
    total: 0
  });
  const [expandedUsers, setExpandedUsers] = useState({});
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadSystems();
    loadSummary();
    loadUserAccess();
  }, []);

  useEffect(() => {
    loadUserAccess();
  }, [filters, pagination.skip]);

  const loadSystems = async () => {
    try {
      const res = await systemsAPI.list({ limit: 1000 });
      setSystems(res.data.items || res.data || []);
    } catch (err) {
      console.error('Error loading systems:', err);
    }
  };

  const loadSummary = async () => {
    try {
      const res = await api.get('/export/user-access/summary');
      setSummary(res.data);
    } catch (err) {
      console.error('Error loading summary:', err);
    }
  };

  const loadUserAccess = async () => {
    setLoading(true);
    try {
      const params = {
        skip: pagination.skip,
        limit: pagination.limit,
        ...(filters.system_id && { system_id: filters.system_id }),
        ...(filters.department && { department: filters.department }),
        ...(filters.search && { search: filters.search }),
      };
      const res = await api.get('/export/user-access', { params });
      setUsers(res.data.users || []);
      setPagination(prev => ({ ...prev, total: res.data.total }));
    } catch (err) {
      console.error('Error loading user access:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = filters.system_id ? { system_id: filters.system_id } : {};
      const res = await api.get('/export/user-access/excel', {
        params,
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `user_access_report_${new Date().toISOString().slice(0,10)}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting:', err);
    } finally {
      setExporting(false);
    }
  };

  const toggleUser = (userId) => {
    setExpandedUsers(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  const getStatusBadge = (status) => {
    const styles = {
      approved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      implemented: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    };
    const labels = {
      approved: t('approved') || 'Approved',
      implemented: t('implemented') || 'Implemented',
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {labels[status] || status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="text-sm text-gray-500 dark:text-gray-400">{t('usersWithAccess') || 'Users with Access'}</div>
            <div className="text-2xl font-bold text-primary dark:text-blue-400">{summary.users_with_access}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="text-sm text-gray-500 dark:text-gray-400">{t('systemsWithAccess') || 'Systems with Access'}</div>
            <div className="text-2xl font-bold text-primary dark:text-blue-400">{summary.systems_with_access}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="text-sm text-gray-500 dark:text-gray-400">{t('totalAccesses') || 'Total Accesses'}</div>
            <div className="text-2xl font-bold text-primary dark:text-blue-400">{summary.total_accesses}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="text-sm text-gray-500 dark:text-gray-400">{t('temporaryAccesses') || 'Temporary Accesses'}</div>
            <div className="text-2xl font-bold text-amber-500">{summary.temporary_accesses}</div>
          </div>
        </div>
      )}

      {/* Charts Row */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* By System */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <h3 className="font-semibold mb-3 text-gray-900 dark:text-white">{t('accessBySystem') || 'Access by System'}</h3>
            <div className="space-y-2">
              {summary.by_system?.map((sys, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 dark:text-gray-300 truncate flex-1">{sys.system_name}</span>
                  <div className="flex items-center gap-2 ml-2">
                    <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full"
                        style={{ width: `${Math.min((sys.count / (summary.total_accesses || 1)) * 100, 100)}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white w-8 text-right">{sys.count}</span>
                  </div>
                </div>
              ))}
              {(!summary.by_system || summary.by_system.length === 0) && (
                <p className="text-gray-500 text-sm">{t('noData') || 'No data'}</p>
              )}
            </div>
          </div>

          {/* By Department */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <h3 className="font-semibold mb-3 text-gray-900 dark:text-white">{t('accessByDepartment') || 'Access by Department'}</h3>
            <div className="space-y-2">
              {summary.by_department?.map((dept, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 dark:text-gray-300 truncate flex-1">{dept.department}</span>
                  <div className="flex items-center gap-2 ml-2">
                    <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full"
                        style={{ width: `${Math.min((dept.count / (summary.total_accesses || 1)) * 100, 100)}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white w-8 text-right">{dept.count}</span>
                  </div>
                </div>
              ))}
              {(!summary.by_department || summary.by_department.length === 0) && (
                <p className="text-gray-500 text-sm">{t('noData') || 'No data'}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('searchUser') || 'Search User'}
            </label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              placeholder={t('searchByName') || 'Search by name, login, email...'}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div className="w-48">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('system') || 'System'}
            </label>
            <select
              value={filters.system_id}
              onChange={(e) => setFilters(prev => ({ ...prev, system_id: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">{t('allSystems') || 'All Systems'}</option>
              {systems.map(sys => (
                <option key={sys.id} value={sys.id}>{sys.name}</option>
              ))}
            </select>
          </div>
          <div className="w-48">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('department') || 'Department'}
            </label>
            <input
              type="text"
              value={filters.department}
              onChange={(e) => setFilters(prev => ({ ...prev, department: e.target.value }))}
              placeholder={t('departmentFilter') || 'Filter by department'}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
          >
            {exporting ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                {t('exporting') || 'Exporting...'}
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {t('exportExcel') || 'Export Excel'}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <svg className="animate-spin h-8 w-8 mx-auto text-primary" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="mt-2 text-gray-500">{t('loading') || 'Loading...'}</p>
          </div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {t('noUsersWithAccess') || 'No users with access found'}
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {users.map(user => (
              <div key={user.user_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                {/* User Header */}
                <div
                  className="p-4 cursor-pointer flex items-center justify-between"
                  onClick={() => toggleUser(user.user_id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
                      <span className="text-primary font-medium">
                        {user.full_name?.charAt(0) || 'U'}
                      </span>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">{user.full_name}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {user.username} | {user.email}
                      </div>
                      {user.department && (
                        <div className="text-xs text-gray-400 dark:text-gray-500">
                          {user.department} {user.position && `• ${user.position}`}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
                      {user.systems.length} {t('systems') || 'systems'}
                    </span>
                    <svg
                      className={`w-5 h-5 text-gray-400 transition-transform ${expandedUsers[user.user_id] ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {/* User Systems (Expanded) */}
                {expandedUsers[user.user_id] && (
                  <div className="px-4 pb-4">
                    <div className="ml-14 bg-gray-50 dark:bg-gray-900 rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-100 dark:bg-gray-800">
                          <tr>
                            <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">{t('system') || 'System'}</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">{t('subsystem') || 'Subsystem'}</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">{t('accessRole') || 'Role'}</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">{t('status') || 'Status'}</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">{t('validUntil') || 'Valid Until'}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                          {user.systems.map((sys, idx) => (
                            <tr key={idx} className="hover:bg-gray-100 dark:hover:bg-gray-800">
                              <td className="px-3 py-2 text-gray-900 dark:text-white">
                                <div>{sys.system_name}</div>
                                <div className="text-xs text-gray-400">{sys.system_code}</div>
                              </td>
                              <td className="px-3 py-2 text-gray-700 dark:text-gray-300">
                                {sys.subsystem_name || '—'}
                              </td>
                              <td className="px-3 py-2 text-gray-700 dark:text-gray-300">
                                <div>{sys.access_role}</div>
                                <div className="text-xs text-gray-400">{sys.access_level}</div>
                              </td>
                              <td className="px-3 py-2">
                                {getStatusBadge(sys.status)}
                                {sys.is_temporary && (
                                  <span className="ml-1 px-2 py-0.5 bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300 rounded-full text-xs">
                                    {t('temporary') || 'Temp'}
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2 text-gray-700 dark:text-gray-300">
                                {sys.valid_until || (sys.is_temporary ? '—' : t('permanent') || 'Permanent')}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination.total > pagination.limit && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              {t('showing') || 'Showing'} {pagination.skip + 1}—{Math.min(pagination.skip + users.length, pagination.total)} {t('of') || 'of'} {pagination.total}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPagination(prev => ({ ...prev, skip: Math.max(0, prev.skip - prev.limit) }))}
                disabled={pagination.skip === 0}
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50"
              >
                {t('previous') || 'Previous'}
              </button>
              <button
                onClick={() => setPagination(prev => ({ ...prev, skip: prev.skip + prev.limit }))}
                disabled={pagination.skip + pagination.limit >= pagination.total}
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50"
              >
                {t('next') || 'Next'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
