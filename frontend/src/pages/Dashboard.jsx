import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { requestsAPI } from '../services/api';
import { useLanguage } from '../App';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

// Color palette for charts
const COLORS = {
  primary: '#16306C',
  secondary: '#F9BF3F',
  approved: '#22c55e',
  rejected: '#ef4444',
  pending: '#3b82f6',
  implemented: '#8b5cf6',
  draft: '#6b7280',
};

const PIE_COLORS = ['#3b82f6', '#22c55e', '#ef4444', '#8b5cf6', '#6b7280', '#f59e0b'];

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { t, language } = useLanguage();

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const res = await requestsAPI.dashboard();
      setStats(res.data);
      setError(null);
    } catch (err) {
      console.error('Error loading dashboard:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          <p className="font-medium text-gray-900 dark:text-gray-100">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Translate status names
  const translateStatus = (status) => {
    const statusMap = {
      draft: t('statusDraft'),
      submitted: t('statusSubmitted'),
      in_review: t('statusInReview'),
      approved: t('statusApproved'),
      rejected: t('statusRejected'),
      implemented: t('statusImplemented'),
      cancelled: t('statusCancelled'),
    };
    return statusMap[status] || status;
  };

  // Format month names
  const formatMonth = (monthStr) => {
    const [year, month] = monthStr.split('-');
    const months = language === 'ru'
      ? ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек']
      : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[parseInt(month) - 1] + ' ' + year.slice(2);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-2"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-96 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-80 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
            <div className="h-80 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="card bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
          <p className="text-red-600 dark:text-red-400">{t('errorLoading')}: {error}</p>
          <button onClick={loadDashboard} className="btn btn-primary mt-4">{t('refresh')}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary dark:text-transparent dark:bg-gradient-to-r dark:from-blue-400 dark:to-cyan-400 dark:bg-clip-text">
            {t('dashboardTitle')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">{t('dashboardDesc')}</p>
        </div>
        <button onClick={loadDashboard} className="btn btn-outline mt-4 md:mt-0">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {t('refresh')}
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="card bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">{t('totalRequests')}</p>
              <p className="text-3xl font-bold">{stats?.total_requests || 0}</p>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-yellow-500 to-yellow-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-100 text-sm">{t('pendingApprovalCount')}</p>
              <p className="text-3xl font-bold">{stats?.pending_approval || 0}</p>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-green-500 to-green-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">{t('approvedCount')}</p>
              <p className="text-3xl font-bold">{stats?.approved || 0}</p>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-red-500 to-red-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-100 text-sm">{t('rejectedCount')}</p>
              <p className="text-3xl font-bold">{stats?.rejected || 0}</p>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm">{t('implementedCount')}</p>
              <p className="text-3xl font-bold">{stats?.implemented || 0}</p>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
        </div>

        <Link to="/my-approvals" className="card bg-gradient-to-br from-indigo-500 to-indigo-600 text-white hover:shadow-lg transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-indigo-100 text-sm">{t('myPendingApprovals')}</p>
              <p className="text-3xl font-bold">{stats?.my_pending_approvals || 0}</p>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
          </div>
        </Link>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Trend Chart */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4 dark:text-gray-100">{t('monthlyTrend')}</h3>
          {stats?.monthly_trend && stats.monthly_trend.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={stats.monthly_trend.map(item => ({ ...item, month: formatMonth(item.month) }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:opacity-20" />
                <XAxis dataKey="month" tick={{ fill: '#6b7280' }} />
                <YAxis tick={{ fill: '#6b7280' }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="total"
                  name={t('totalRequests')}
                  stroke={COLORS.primary}
                  strokeWidth={2}
                  dot={{ fill: COLORS.primary }}
                />
                <Line
                  type="monotone"
                  dataKey="approved"
                  name={t('approvedCount')}
                  stroke={COLORS.approved}
                  strokeWidth={2}
                  dot={{ fill: COLORS.approved }}
                />
                <Line
                  type="monotone"
                  dataKey="rejected"
                  name={t('rejectedCount')}
                  stroke={COLORS.rejected}
                  strokeWidth={2}
                  dot={{ fill: COLORS.rejected }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
              {t('noDataAvailable')}
            </div>
          )}
        </div>

        {/* Status Distribution Pie Chart */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4 dark:text-gray-100">{t('statusDistribution')}</h3>
          {stats?.status_distribution && stats.status_distribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stats.status_distribution.map(item => ({
                    ...item,
                    name: translateStatus(item.status)
                  }))}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) => `${name} (${percentage.toFixed(0)}%)`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {stats.status_distribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
              {t('noDataAvailable')}
            </div>
          )}
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Requests by System Bar Chart */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4 dark:text-gray-100">{t('requestsBySystem')}</h3>
          {stats?.requests_by_system && stats.requests_by_system.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.requests_by_system} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:opacity-20" />
                <XAxis type="number" tick={{ fill: '#6b7280' }} />
                <YAxis
                  dataKey="system_code"
                  type="category"
                  tick={{ fill: '#6b7280' }}
                  width={80}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="total" name={t('totalRequests')} fill={COLORS.primary} radius={[0, 4, 4, 0]} />
                <Bar dataKey="approved" name={t('approvedCount')} fill={COLORS.approved} radius={[0, 4, 4, 0]} />
                <Bar dataKey="pending" name={t('pendingApprovalCount')} fill={COLORS.pending} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
              {t('noDataAvailable')}
            </div>
          )}
        </div>

        {/* Approval Metrics */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4 dark:text-gray-100">{t('approvalMetrics')}</h3>
          {stats?.approval_metrics ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-sm text-blue-600 dark:text-blue-400">{t('avgApprovalTime')}</p>
                  <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                    {stats.approval_metrics.avg_approval_time_hours.toFixed(1)} {t('hours')}
                  </p>
                </div>
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <p className="text-sm text-green-600 dark:text-green-400">{t('approvedThisMonth')}</p>
                  <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                    {stats.approval_metrics.total_approved_this_month}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400">{t('minApprovalTime')}</p>
                  <p className="text-xl font-semibold text-gray-700 dark:text-gray-300">
                    {stats.approval_metrics.min_approval_time_hours.toFixed(1)} {t('hours')}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400">{t('maxApprovalTime')}</p>
                  <p className="text-xl font-semibold text-gray-700 dark:text-gray-300">
                    {stats.approval_metrics.max_approval_time_hours.toFixed(1)} {t('hours')}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
              {t('noDataAvailable')}
            </div>
          )}
        </div>
      </div>

      {/* Top Requesters Table */}
      {stats?.top_requesters && stats.top_requesters.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold dark:text-gray-100">{t('topRequesters')}</h3>
            <Link to="/my-requests" className="text-sm text-primary dark:text-blue-400 hover:underline">
              {t('viewAllRequests')} &rarr;
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="text-left">#</th>
                  <th className="text-left">{t('fullName')}</th>
                  <th className="text-left">{t('department')}</th>
                  <th className="text-right">{t('totalRequests')}</th>
                </tr>
              </thead>
              <tbody>
                {stats.top_requesters.map((user, index) => (
                  <tr key={user.user_id}>
                    <td className="dark:text-gray-300">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium ${
                        index === 0 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300' :
                        index === 1 ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' :
                        index === 2 ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300' :
                        'bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                      }`}>
                        {index + 1}
                      </span>
                    </td>
                    <td className="font-medium dark:text-gray-200">{user.full_name}</td>
                    <td className="text-gray-600 dark:text-gray-400">{user.department || '-'}</td>
                    <td className="text-right">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-primary/10 text-primary dark:bg-blue-900/30 dark:text-blue-300">
                        {user.total_requests}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link to="/create-request" className="card hover:shadow-lg dark:hover:shadow-dark-lg hover:-translate-y-1 transition-all group">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-lg bg-primary/10 dark:bg-blue-500/20 flex items-center justify-center mr-3 group-hover:scale-110 transition-transform">
              <svg className="w-5 h-5 text-primary dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold dark:text-gray-100">{t('newRequest')}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('requestAccess')}</p>
            </div>
          </div>
        </Link>

        <Link to="/my-requests" className="card hover:shadow-lg dark:hover:shadow-dark-lg hover:-translate-y-1 transition-all group">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-lg bg-secondary/20 dark:bg-secondary/30 flex items-center justify-center mr-3 group-hover:scale-110 transition-transform">
              <svg className="w-5 h-5 text-secondary-600 dark:text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold dark:text-gray-100">{t('myRequests')}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('viewStatuses')}</p>
            </div>
          </div>
        </Link>

        <Link to="/my-approvals" className="card hover:shadow-lg dark:hover:shadow-dark-lg hover:-translate-y-1 transition-all group">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-500/20 flex items-center justify-center mr-3 group-hover:scale-110 transition-transform">
              <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold dark:text-gray-100">{t('pendingApprovals')}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('awaitingApproval')}</p>
            </div>
          </div>
        </Link>

        <Link to="/systems" className="card hover:shadow-lg dark:hover:shadow-dark-lg hover:-translate-y-1 transition-all group">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-500/20 flex items-center justify-center mr-3 group-hover:scale-110 transition-transform">
              <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold dark:text-gray-100">{t('systems')}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('availableSystems')}</p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
