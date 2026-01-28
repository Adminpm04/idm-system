import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { requestsAPI } from '../services/api';
import { PendingIcon } from '../components/Icons';
import { useLanguage } from '../App';

function MyApprovalsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { t } = useLanguage();

  useEffect(() => {
    loadApprovals();
  }, []);

  const loadApprovals = async () => {
    setLoading(true);
    try {
      const response = await requestsAPI.myApprovals();
      setRequests(response.data);
    } catch (err) {
      console.error('Error loading approvals:', err);
      setError(t('errorLoading'));
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('ru-RU');
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
      <h1 className="text-3xl font-bold text-primary dark:text-blue-400 mb-6">
        {t('pendingApprovalsTitle')}
        {requests.length > 0 && (
          <span className="ml-3 text-lg text-gray-600 dark:text-gray-400">({requests.length})</span>
        )}
      </h1>

      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {requests.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            {t('noPendingApprovals')}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map(request => (
            <Link
              key={request.id}
              to={`/requests/${request.id}`}
              className="card hover:shadow-lg transition-shadow block border-l-4 border-yellow-500"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold text-primary dark:text-blue-400">
                      {request.request_number}
                    </h3>
                    <span className="badge badge-in-review flex items-center">
                      <PendingIcon size={16} className="mr-1" /> {t('awaitingYourApproval')}
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
                    <p>
                      <span className="font-medium dark:text-gray-300">{t('requester')}:</span>{' '}
                      {request.requester_name}
                    </p>
                  </div>

                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t('justification')}:
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {request.purpose}
                    </p>
                  </div>
                </div>

                <div className="text-right text-sm text-gray-500 dark:text-gray-400 ml-4">
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

              <div className="mt-4 flex justify-end space-x-2">
                <span className="btn btn-primary btn-sm flex items-center">
                  {t('goToApproval')} <span className="ml-1 text-lg">→</span>
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default MyApprovalsPage;
