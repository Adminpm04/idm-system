import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLanguage } from '../App';

// Custom debounce hook
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default function AdminADUsers() {
  const { t } = useLanguage();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState(null);
  const [syncStatus, setSyncStatus] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0
  });

  // Debounced search query (300ms delay)
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const isFirstRender = useRef(true);

  const fetchSyncStatus = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('/api/admin/ldap/sync-status', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setSyncStatus(data);
      }
    } catch (error) {
      console.error('Error fetching sync status:', error);
    }
  };

  const searchUsers = async (query = '', page = 1) => {
    setSearching(true);
    try {
      const token = localStorage.getItem('access_token');
      const params = new URLSearchParams({
        query: query,
        page: page.toString(),
        limit: pagination.limit.toString()
      });
      const response = await fetch(`/api/admin/ldap/users?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
        setPagination(prev => ({
          ...prev,
          page: page,
          total: data.total || 0
        }));
      }
    } catch (error) {
      console.error('Error searching AD users:', error);
      setMessage({ type: 'error', text: t('searchFailed') });
    } finally {
      setSearching(false);
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    searchUsers();
    fetchSyncStatus();
  }, []);

  // Auto-search with debounce
  useEffect(() => {
    // Skip first render (initial load is handled above)
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    // Search when debounced query changes
    searchUsers(debouncedSearchQuery, 1);
  }, [debouncedSearchQuery]);

  const handleSearch = (e) => {
    e.preventDefault();
    // Manual search (button click) - immediate search
    searchUsers(searchQuery, 1);
  };

  const handleSyncUser = async (adUser) => {
    setSyncing(true);
    setMessage(null);
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('/api/admin/ldap/sync-user', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username: adUser.sAMAccountName })
      });
      if (response.ok) {
        setMessage({ type: 'success', text: t('userSynced') });
        // Refresh the list
        searchUsers(searchQuery, pagination.page);
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.detail || t('syncFailed') });
      }
    } catch (error) {
      setMessage({ type: 'error', text: t('syncFailed') });
    } finally {
      setSyncing(false);
    }
  };

  const handleSyncAll = async () => {
    if (!confirm(t('confirmSyncAll'))) return;

    setSyncing(true);
    setMessage(null);
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('/api/admin/ldap/sync-all', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setMessage({
          type: 'success',
          text: `${t('syncComplete')}: ${t('adCreated')} ${data.created}, ${t('updated')} ${data.updated}, ${t('disabled')} ${data.disabled}, ${t('managersLinked')} ${data.managers_linked}`
        });
        searchUsers(searchQuery, pagination.page);
        fetchSyncStatus();
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.detail || t('syncFailed') });
      }
    } catch (error) {
      setMessage({ type: 'error', text: t('syncFailed') });
    } finally {
      setSyncing(false);
    }
  };

  const handleLinkManagers = async () => {
    setSyncing(true);
    setMessage(null);
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('/api/admin/ldap/link-managers', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setMessage({
          type: 'success',
          text: `${t('managersLinked')}: ${data.linked}`
        });
        fetchSyncStatus();
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.detail || t('syncFailed') });
      }
    } catch (error) {
      setMessage({ type: 'error', text: t('syncFailed') });
    } finally {
      setSyncing(false);
    }
  };

  const totalPages = Math.ceil(pagination.total / pagination.limit);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {message && (
        <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'}`}>
          {message.text}
        </div>
      )}

      {/* Sync Status */}
      {syncStatus && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-primary">{syncStatus.total_users}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">{t('totalUsers')}</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-blue-500">{syncStatus.ldap_users}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">{t('adUsers')}</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-gray-500">{syncStatus.local_users}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">{t('localUsers')}</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-red-500">{syncStatus.disabled_users}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">{t('disabledUsers')}</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-green-500">{syncStatus.users_with_manager}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">{t('withManager')}</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {syncStatus.last_sync ? new Date(syncStatus.last_sync).toLocaleString() : '-'}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">{t('lastSync')}</div>
          </div>
        </div>
      )}

      {/* Search and Actions */}
      <div className="card">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <form onSubmit={handleSearch} className="flex-1 flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input flex-1"
              placeholder={t('searchADUsers')}
            />
            <button type="submit" className="btn btn-primary" disabled={searching}>
              {searching ? (
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : t('search')}
            </button>
          </form>

          <div className="flex gap-2">
            <button
              onClick={handleLinkManagers}
              disabled={syncing}
              className="btn btn-outline"
              title={t('linkManagersDesc')}
            >
              {t('linkManagers')}
            </button>
            <button
              onClick={handleSyncAll}
              disabled={syncing}
              className="btn btn-secondary"
            >
              {syncing ? t('syncing') : t('syncAllUsers')}
            </button>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('username')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('fullName')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('email')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('department')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('manager')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('status')}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('actions')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {users.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    {t('noADUsersFound')}
                  </td>
                </tr>
              ) : (
                users.map((user, index) => (
                  <tr key={user.sAMAccountName || index} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mr-3">
                          <span className="text-primary font-medium text-sm">
                            {(user.sAMAccountName || '?')[0].toUpperCase()}
                          </span>
                        </div>
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {user.sAMAccountName}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-700 dark:text-gray-300">
                      {user.displayName || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-700 dark:text-gray-300">
                      {user.mail || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-700 dark:text-gray-300">
                      {user.department || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-700 dark:text-gray-300 text-sm">
                      {user.manager ? (
                        <span title={user.manager}>
                          {user.manager.match(/CN=([^,]+)/)?.[1] || '-'}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        {user.isDisabled && (
                          <span className="badge badge-rejected">{t('adDisabled')}</span>
                        )}
                        {user.synced ? (
                          <span className="badge badge-success">{t('synced')}</span>
                        ) : (
                          <span className="badge badge-secondary">{t('notSynced')}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => setSelectedUser(user)}
                        className="text-primary hover:text-primary/80 mr-3"
                        title={t('viewDetails')}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                      {!user.synced && (
                        <button
                          onClick={() => handleSyncUser(user)}
                          className="text-green-600 hover:text-green-700"
                          title={t('syncUser')}
                          disabled={syncing}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {t('showing')} {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} {t('of')} {pagination.total}
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => searchUsers(searchQuery, pagination.page - 1)}
                disabled={pagination.page <= 1 || searching}
                className="btn btn-sm btn-outline"
              >
                {t('previous')}
              </button>
              <button
                onClick={() => searchUsers(searchQuery, pagination.page + 1)}
                disabled={pagination.page >= totalPages || searching}
                className="btn btn-sm btn-outline"
              >
                {t('next')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* User Details Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h3 className="text-xl font-semibold dark:text-gray-100">{t('userDetails')}</h3>
              <button
                onClick={() => setSelectedUser(null)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-center space-x-4 mb-6">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-primary font-bold text-2xl">
                    {(selectedUser.sAMAccountName || '?')[0].toUpperCase()}
                  </span>
                </div>
                <div>
                  <h4 className="text-xl font-semibold dark:text-gray-100">
                    {selectedUser.displayName || selectedUser.sAMAccountName}
                  </h4>
                  <p className="text-gray-500 dark:text-gray-400">@{selectedUser.sAMAccountName}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t('email')}</p>
                  <p className="font-medium dark:text-gray-200">{selectedUser.mail || '-'}</p>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t('department')}</p>
                  <p className="font-medium dark:text-gray-200">{selectedUser.department || '-'}</p>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t('position')}</p>
                  <p className="font-medium dark:text-gray-200">{selectedUser.title || '-'}</p>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t('phone')}</p>
                  <p className="font-medium dark:text-gray-200">{selectedUser.telephoneNumber || '-'}</p>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t('manager')}</p>
                  <p className="font-medium dark:text-gray-200">
                    {selectedUser.manager ? selectedUser.manager.match(/CN=([^,]+)/)?.[1] || '-' : '-'}
                  </p>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t('accountStatus')}</p>
                  <p className="font-medium">
                    {selectedUser.isDisabled ? (
                      <span className="text-red-500">{t('adDisabled')}</span>
                    ) : (
                      <span className="text-green-500">{t('active')}</span>
                    )}
                  </p>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg md:col-span-2">
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t('distinguishedName')}</p>
                  <p className="font-medium dark:text-gray-200 text-sm break-all">{selectedUser.distinguishedName || '-'}</p>
                </div>
              </div>

              {selectedUser.memberOf && selectedUser.memberOf.length > 0 && (
                <div className="mt-4">
                  <h5 className="font-medium mb-2 dark:text-gray-100">{t('groups')}</h5>
                  <div className="flex flex-wrap gap-2">
                    {selectedUser.memberOf.map((group, i) => {
                      // Extract CN from DN
                      const cn = group.match(/CN=([^,]+)/)?.[1] || group;
                      return (
                        <span key={i} className="badge badge-secondary text-xs">
                          {cn}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                {!selectedUser.synced && (
                  <button
                    onClick={() => {
                      handleSyncUser(selectedUser);
                      setSelectedUser(null);
                    }}
                    className="btn btn-primary"
                    disabled={syncing}
                  >
                    {t('syncToIDM')}
                  </button>
                )}
                <button
                  onClick={() => setSelectedUser(null)}
                  className="btn btn-outline"
                >
                  {t('close')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
