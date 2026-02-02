import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { requestsAPI } from '../services/api';
import { format } from 'date-fns';
import { useLanguage } from '../App';

function MyRequestsListPage() {
  const [requests, setRequests] = useState([]);
  const [decisions, setDecisions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('my-requests');
  const [decisionFilter, setDecisionFilter] = useState('all');
  const { t } = useLanguage();

  useEffect(() => {
    if (activeTab === 'my-requests') {
      loadRequests();
    } else {
      loadDecisions();
    }
  }, [filter, activeTab, decisionFilter]);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const params = filter !== 'all' ? { status_filter: filter } : {};
      const response = await requestsAPI.myRequests(params);
      setRequests(response.data);
    } catch (err) {
      console.error('Error loading requests:', err);
      setError(t('errorLoading'));
    } finally {
      setLoading(false);
    }
  };

  const loadDecisions = async () => {
    setLoading(true);
    try {
      const params = decisionFilter !== 'all' ? { decision_filter: decisionFilter } : {};
      const response = await requestsAPI.myDecisions(params);
      setDecisions(response.data);
    } catch (err) {
      console.error('Error loading decisions:', err);
      setError(t('errorLoading'));
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      draft: 'badge-draft',
      submitted: 'badge-submitted',
      in_review: 'badge-in-review',
      approved: 'badge-approved',
      rejected: 'badge-rejected',
      implemented: 'badge-implemented',
      cancelled: 'badge-draft',
      expired: 'badge-expired',
    };

    const labels = {
      draft: t('statusDraft'),
      submitted: t('statusSubmitted'),
      in_review: t('statusInReview'),
      approved: t('statusApproved'),
      rejected: t('statusRejected'),
      implemented: t('statusImplemented'),
      cancelled: t('statusCancelled'),
      expired: t('statusExpired'),
    };

    return (
      <span className={`badge ${badges[status] || 'badge-draft'}`}>
        {labels[status] || status}
      </span>
    );
  };

  const getDecisionBadge = (decision) => {
    if (decision === 'approved') {
      return <span className="badge badge-approved">{t('statusApproved')}</span>;
    } else if (decision === 'rejected') {
      return <span className="badge badge-rejected">{t('statusRejected')}</span>;
    }
    return null;
  };

  const getTypeLabel = (type) => {
    const labels = {
      new_access: t('newAccessType'),
      modify_access: t('modifyAccessType'),
      revoke_access: t('revokeAccessType'),
      temporary_access: t('temporaryAccessType'),
    };
    return labels[type] || type;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      return format(new Date(dateString), 'dd.MM.yyyy HH:mm');
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-xl text-gray-600 dark:text-gray-400">{t('loading')}</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-primary dark:text-blue-400">{t('myRequests')}</h1>
        <Link to="/create-request" className="btn btn-primary">
          + {t('createRequest')}
        </Link>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="card mb-6">
        <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4">
          <button
            onClick={() => { setActiveTab('my-requests'); setFilter('all'); }}
            className={`px-6 py-3 font-medium transition-colors border-b-2 -mb-px ${
              activeTab === 'my-requests'
                ? 'border-primary text-primary dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {t('myRequests')}
          </button>
          <button
            onClick={() => { setActiveTab('history'); setDecisionFilter('all'); }}
            className={`px-6 py-3 font-medium transition-colors border-b-2 -mb-px ${
              activeTab === 'history'
                ? 'border-primary text-primary dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {t('approvalHistory')}
          </button>
        </div>

        {/* Filters for My Requests tab */}
        {activeTab === 'my-requests' && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {t('all')}
            </button>
            <button
              onClick={() => setFilter('draft')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'draft'
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {t('drafts')}
            </button>
            <button
              onClick={() => setFilter('in_review')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'in_review'
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {t('inReview')}
            </button>
            <button
              onClick={() => setFilter('approved')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'approved'
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {t('approved')}
            </button>
          </div>
        )}

        {/* Filters for History tab */}
        {activeTab === 'history' && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setDecisionFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                decisionFilter === 'all'
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {t('allDecisions')}
            </button>
            <button
              onClick={() => setDecisionFilter('approved')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                decisionFilter === 'approved'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {t('approvedFilter')}
            </button>
            <button
              onClick={() => setDecisionFilter('rejected')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                decisionFilter === 'rejected'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {t('rejectedFilter')}
            </button>
          </div>
        )}
      </div>

      {/* Content for My Requests tab */}
      {activeTab === 'my-requests' && (
        <>
          {requests.length === 0 ? (
            <div className="card text-center py-12">
              <p className="text-gray-600 dark:text-gray-400 text-lg mb-4">{t('noRequestsFound')}</p>
              <Link to="/create-request" className="btn btn-primary inline-block">
                {t('createFirstRequest')}
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map(request => (
                <Link
                  key={request.id}
                  to={`/requests/${request.id}`}
                  className="card hover:shadow-lg transition-shadow block"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-primary dark:text-blue-400">
                          {request.request_number}
                        </h3>
                        {getStatusBadge(request.status)}
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {getTypeLabel(request.request_type)}
                        </span>
                      </div>

                      <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                        <p>
                          <span className="font-medium dark:text-gray-300">{t('system')}:</span>{' '}
                          {request.system_name}
                        </p>
                        <p>
                          <span className="font-medium dark:text-gray-300">{t('role')}:</span>{' '}
                          {request.access_role_name}
                        </p>
                        <p>
                          <span className="font-medium dark:text-gray-300">{t('forUser')}:</span>{' '}
                          {request.target_user_name}
                        </p>
                        {request.is_temporary && (
                          <p className="text-orange-600 dark:text-orange-400">
                            {t('temporaryAccessUntil')} {formatDate(request.valid_until)}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="text-right text-sm text-gray-500 dark:text-gray-400">
                      <p>{t('created')}:</p>
                      <p>{formatDate(request.created_at)}</p>
                      {request.submitted_at && (
                        <>
                          <p className="mt-2">{t('submitted')}:</p>
                          <p>{formatDate(request.submitted_at)}</p>
                        </>
                      )}
                    </div>
                  </div>

                  {request.status === 'in_review' && (
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {t('atApprovalStage')}: <span className="font-medium dark:text-gray-300">{request.current_step}</span>
                      </p>
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )}
        </>
      )}

      {/* Content for History tab */}
      {activeTab === 'history' && (
        <>
          {decisions.length === 0 ? (
            <div className="card text-center py-12">
              <p className="text-gray-600 dark:text-gray-400 text-lg">{t('noApprovalHistory')}</p>
              <p className="text-gray-500 dark:text-gray-500 text-sm mt-2">
                {t('approvalHistoryDesc')}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {decisions.map(decision => (
                <Link
                  key={decision.id}
                  to={`/requests/${decision.id}`}
                  className="card hover:shadow-lg transition-shadow block"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-primary dark:text-blue-400">
                          {decision.request_number}
                        </h3>
                        {getDecisionBadge(decision.my_decision)}
                        {getStatusBadge(decision.status)}
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {getTypeLabel(decision.request_type)}
                        </span>
                      </div>

                      <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                        <p>
                          <span className="font-medium dark:text-gray-300">{t('system')}:</span>{' '}
                          {decision.system_name}
                        </p>
                        <p>
                          <span className="font-medium dark:text-gray-300">{t('role')}:</span>{' '}
                          {decision.access_role_name}
                        </p>
                        <p>
                          <span className="font-medium dark:text-gray-300">{t('forUser')}:</span>{' '}
                          {decision.target_user_name}
                        </p>
                        <p>
                          <span className="font-medium dark:text-gray-300">{t('requester')}:</span>{' '}
                          {decision.requester_name}
                        </p>
                        {decision.my_decision_comment && (
                          <p className="mt-2 italic text-gray-500 dark:text-gray-500">
                            {t('comment')}: {decision.my_decision_comment}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="text-right text-sm text-gray-500 dark:text-gray-400">
                      <p>{t('myDecision')}:</p>
                      <p className="font-medium dark:text-gray-300">{formatDate(decision.my_decision_date)}</p>
                      <p className="mt-2">{t('created')}:</p>
                      <p>{formatDate(decision.created_at)}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default MyRequestsListPage;
