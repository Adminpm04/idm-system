import { useState, useEffect } from 'react';
import { adminAPI } from '../services/api';
import { useLanguage } from '../App';

export default function AdminAccessRevocation() {
  const { t } = useLanguage();
  const [stats, setStats] = useState(null);
  const [expiring, setExpiring] = useState([]);
  const [expired, setExpired] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [days, setDays] = useState(7);

  useEffect(() => {
    loadData();
  }, [days]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsRes, expiringRes, expiredRes] = await Promise.all([
        adminAPI.accessRevocation.stats(),
        adminAPI.accessRevocation.expiring(days),
        adminAPI.accessRevocation.expired()
      ]);
      setStats(statsRes.data);
      setExpiring(expiringRes.data || []);
      setExpired(expiredRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProcessExpired = async () => {
    if (!confirm(t('confirmProcessExpired') || 'Process all expired accesses and revoke them?')) {
      return;
    }

    setProcessing(true);
    try {
      const res = await adminAPI.accessRevocation.process();
      alert(
        `${t('processComplete') || 'Complete'}!\n` +
        `${t('found') || 'Found'}: ${res.data.total_found}\n` +
        `${t('revoked') || 'Revoked'}: ${res.data.successfully_revoked}\n` +
        `${t('failed') || 'Failed'}: ${res.data.failed}`
      );
      loadData();
    } catch (error) {
      console.error('Error processing:', error);
      alert(t('errorProcessing') || 'Error processing expired accesses');
    } finally {
      setProcessing(false);
    }
  };

  const handleRevokeOne = async (requestId) => {
    if (!confirm(t('confirmRevoke') || 'Revoke this access?')) {
      return;
    }

    try {
      await adminAPI.accessRevocation.revoke(requestId);
      alert(t('accessRevoked') || 'Access revoked successfully');
      loadData();
    } catch (error) {
      console.error('Error revoking:', error);
      alert(error.response?.data?.detail || t('errorRevoking') || 'Error revoking access');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('ru-RU');
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <svg className="animate-spin h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
        </svg>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary dark:text-blue-400">
            {t('accessRevocation') || 'Access Revocation'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {t('accessRevocationDesc') || 'Manage temporary access expirations'}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleProcessExpired}
            disabled={processing || expired.length === 0}
            className="btn btn-danger flex items-center disabled:opacity-50"
          >
            {processing ? (
              <svg className="animate-spin w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
            ) : (
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            {t('processExpired') || 'Process Expired'}
          </button>
          <button onClick={loadData} className="btn btn-secondary">
            {t('refresh')}
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="card bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
            <div className="text-blue-600 dark:text-blue-400 text-sm font-medium">
              {t('activeTemporary') || 'Active Temporary'}
            </div>
            <div className="text-3xl font-bold text-blue-700 dark:text-blue-300 mt-1">
              {stats.active_temporary_accesses}
            </div>
          </div>

          <div className="card bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600">
            <div className="text-gray-600 dark:text-gray-400 text-sm font-medium">
              {t('alreadyExpired') || 'Already Expired'}
            </div>
            <div className="text-3xl font-bold text-gray-700 dark:text-gray-300 mt-1">
              {stats.already_expired}
            </div>
          </div>

          <div className="card bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
            <div className="text-red-600 dark:text-red-400 text-sm font-medium">
              {t('expiringToday') || 'Expiring Today'}
            </div>
            <div className="text-3xl font-bold text-red-700 dark:text-red-300 mt-1">
              {stats.expiring_today}
            </div>
          </div>

          <div className="card bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
            <div className="text-yellow-600 dark:text-yellow-400 text-sm font-medium">
              {t('expiringThisWeek') || 'This Week'}
            </div>
            <div className="text-3xl font-bold text-yellow-700 dark:text-yellow-300 mt-1">
              {stats.expiring_this_week}
            </div>
          </div>

          <div className="card bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800">
            <div className="text-orange-600 dark:text-orange-400 text-sm font-medium">
              {t('expiringThisMonth') || 'This Month'}
            </div>
            <div className="text-3xl font-bold text-orange-700 dark:text-orange-300 mt-1">
              {stats.expiring_this_month}
            </div>
          </div>
        </div>
      )}

      {/* Expired Accesses - Need Action */}
      {expired.length > 0 && (
        <div className="card border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-red-700 dark:text-red-400 flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {t('expiredNeedAction') || 'Expired - Need Action'} ({expired.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-red-200 dark:border-red-800">
                  <th className="px-4 py-2 text-left text-xs font-medium text-red-600 dark:text-red-400 uppercase">
                    {t('request')}
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-red-600 dark:text-red-400 uppercase">
                    {t('user')}
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-red-600 dark:text-red-400 uppercase">
                    {t('system')}
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-red-600 dark:text-red-400 uppercase">
                    {t('validUntil')}
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-red-600 dark:text-red-400 uppercase">
                    {t('overdue') || 'Overdue'}
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-red-600 dark:text-red-400 uppercase">
                    {t('actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-red-100 dark:divide-red-900">
                {expired.map(item => (
                  <tr key={item.id} className="hover:bg-red-100/50 dark:hover:bg-red-900/20">
                    <td className="px-4 py-3">
                      <a href={'/requests/' + item.id} className="text-primary dark:text-blue-400 hover:underline font-medium">
                        {item.request_number}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-gray-900 dark:text-gray-100">
                      {item.target_user_name || '-'}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                      {item.system_name} / {item.access_role_name}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                      {formatDate(item.valid_until)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="badge badge-rejected">
                        {item.days_overdue} {t('days') || 'days'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleRevokeOne(item.id)}
                        className="btn btn-sm btn-danger"
                      >
                        {t('revoke') || 'Revoke'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Expiring Soon */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold dark:text-gray-100 flex items-center">
            <svg className="w-5 h-5 mr-2 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {t('expiringSoon') || 'Expiring Soon'}
          </h2>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 dark:text-gray-400">
              {t('showNext') || 'Show next'}:
            </label>
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="input w-24"
            >
              <option value={7}>7 {t('days') || 'days'}</option>
              <option value={14}>14 {t('days') || 'days'}</option>
              <option value={30}>30 {t('days') || 'days'}</option>
              <option value={60}>60 {t('days') || 'days'}</option>
              <option value={90}>90 {t('days') || 'days'}</option>
            </select>
          </div>
        </div>

        {expiring.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <svg className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {t('noExpiringSoon') || 'No accesses expiring soon'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {t('request')}
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {t('user')}
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {t('system')}
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {t('role')}
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {t('validUntil')}
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {t('remaining') || 'Remaining'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {expiring.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3">
                      <a href={'/requests/' + item.id} className="text-primary dark:text-blue-400 hover:underline font-medium">
                        {item.request_number}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-gray-900 dark:text-gray-100">
                      {item.target_user_name || '-'}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                      {item.system_name}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                      {item.access_role_name}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                      {formatDate(item.valid_until)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${
                        item.days_remaining <= 1 ? 'badge-rejected' :
                        item.days_remaining <= 3 ? 'badge-warning' :
                        item.days_remaining <= 7 ? 'badge-info' :
                        'badge-secondary'
                      }`}>
                        {item.days_remaining} {t('days') || 'days'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="card bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <div className="flex items-start">
          <svg className="w-5 h-5 text-blue-500 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm text-blue-700 dark:text-blue-300">
            <p className="font-medium mb-1">{t('autoRevocationInfo') || 'Automatic Revocation'}</p>
            <p className="text-blue-600 dark:text-blue-400">
              {t('autoRevocationDesc') || 'The system automatically checks for expired accesses every 6 hours and at 1:00 AM daily. Expired accesses are automatically revoked and logged in the audit trail.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
