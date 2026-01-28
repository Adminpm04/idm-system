import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { requestsAPI } from '../services/api';
import { useAuth, useLanguage } from '../App';
import { format } from 'date-fns';
import { CheckIcon, CrossIcon, PendingIcon, NeutralIcon, ClockIcon, WarningIcon, ArrowBackIcon } from '../components/Icons';

function RequestDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Comment form
  const [comment, setComment] = useState('');
  const [addingComment, setAddingComment] = useState(false);

  useEffect(() => {
    loadRequest();
  }, [id]);

  const loadRequest = async () => {
    setLoading(true);
    try {
      const response = await requestsAPI.get(id);
      setRequest(response.data);
    } catch (err) {
      console.error('Error loading request:', err);
      setError('Error loading request');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!window.confirm('Submit request for approval?')) return;

    setActionLoading(true);
    try {
      await requestsAPI.submit(id);
      await loadRequest();
    } catch (err) {
      alert(err.response?.data?.detail || 'Error submitting request');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async () => {
    const comment = window.prompt('Comment (optional):');
    if (comment === null) return; // Cancel clicked

    setActionLoading(true);
    try {
      await requestsAPI.approve(id, {
        decision: 'approved',
        comment: comment || undefined
      });
      await loadRequest();
      alert('Request approved successfully!');
    } catch (err) {
      alert(err.response?.data?.detail || 'Error approving');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    const comment = window.prompt('Reason for rejection (required):');
    if (!comment) return;

    setActionLoading(true);
    try {
      await requestsAPI.approve(id, {
        decision: 'rejected',
        comment
      });
      await loadRequest();
      alert('Request rejected');
    } catch (err) {
      alert(err.response?.data?.detail || 'Error rejecting');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;

    setAddingComment(true);
    try {
      await requestsAPI.addComment(id, { comment });
      setComment('');
      await loadRequest();
    } catch (err) {
      alert(err.response?.data?.detail || 'Error adding comment');
    } finally {
      setAddingComment(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      return format(new Date(dateString), 'dd.MM.yyyy HH:mm');
    } catch {
      return dateString;
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
    };

    const labels = {
      draft: t('statusDraft'),
      submitted: t('statusSubmitted'),
      in_review: t('statusInReview'),
      approved: t('statusApproved'),
      rejected: t('statusRejected'),
      implemented: t('statusImplemented'),
    };

    return (
      <span className={`badge ${badges[status]}`}>
        {labels[status] || status}
      </span>
    );
  };

  const getApprovalStatusIcon = (status) => {
    switch (status) {
      case 'approved': return <CheckIcon size={20} className="inline" />;
      case 'rejected': return <CrossIcon size={20} className="inline" />;
      case 'pending': return <PendingIcon size={20} className="inline" />;
      default: return <NeutralIcon size={20} className="inline" />;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-xl text-gray-600 dark:text-gray-400">{t('loading')}</div>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="card">
        <p className="text-red-600 dark:text-red-400">{error || t('requestNotFound')}</p>
        <button onClick={() => navigate('/my-requests')} className="btn btn-outline mt-4">
          {t('returnToList')}
        </button>
      </div>
    );
  }

  // Check if current user can approve
  const canApprove = request.approvals?.some(
    a => a.approver_id === user?.id && a.status === 'pending'
  );

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/my-requests')}
          className="text-primary dark:text-blue-400 hover:underline mb-4 flex items-center"
        >
          <ArrowBackIcon size={20} className="mr-2" /> {t('backToList')}
        </button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary dark:text-blue-400">
              {t('request')} {request.request_number}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {t('created')} {formatDate(request.created_at)}
            </p>
          </div>
          {getStatusBadge(request.status)}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <div className="card">
            <h2 className="text-xl font-semibold mb-4 dark:text-gray-100">{t('requestInfo')}</h2>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{t('requestor')}</p>
                  <p className="font-medium dark:text-gray-100">{request.requester_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{t('accessRecipient')}</p>
                  <p className="font-medium dark:text-gray-100">{request.target_user_name}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{t('system')}</p>
                  <p className="font-medium dark:text-gray-100">{request.system_name}</p>
                </div>
                {request.subsystem_name && (
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{t('subsystem')}</p>
                    <p className="font-medium dark:text-gray-100">{request.subsystem_name}</p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{t('accessRole')}</p>
                  <p className="font-medium dark:text-gray-100">{request.access_role_name}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{t('justification')}</p>
                <p className="mt-1 text-gray-800 dark:text-gray-200">{request.purpose}</p>
              </div>

              {request.is_temporary && (
                <div className="bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800 rounded-lg p-3">
                  <p className="text-sm font-medium text-orange-800 dark:text-orange-300 flex items-center">
                    <ClockIcon size={18} className="mr-2" /> {t('temporaryAccess')}
                  </p>
                  <p className="text-sm text-orange-700 dark:text-orange-400 mt-1">
                    {request.valid_from && `${t('validFrom')} ${formatDate(request.valid_from)} `}
                    {t('validUntil')} {formatDate(request.valid_until)}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Approval Flow */}
          <div className="card">
            <h2 className="text-xl font-semibold mb-4 dark:text-gray-100">{t('approvalProcess')}</h2>

            {request.approvals && request.approvals.length > 0 ? (
              <div className="space-y-4">
                {request.approvals.map((approval, index) => (
                  <div
                    key={approval.id}
                    className={`border-l-4 pl-4 py-2 ${
                      approval.status === 'approved'
                        ? 'border-green-500'
                        : approval.status === 'rejected'
                        ? 'border-red-500'
                        : approval.status === 'pending' && request.current_step === approval.step_number
                        ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
                        : 'border-gray-300 dark:border-gray-600'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium dark:text-gray-100">
                          {getApprovalStatusIcon(approval.status)} {t('step')} {approval.step_number}
                          {approval.approver_role && ` - ${approval.approver_role}`}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {t('approver')}: {approval.approver_name}
                        </p>
                        {approval.decision_date && (
                          <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                            {formatDate(approval.decision_date)}
                          </p>
                        )}
                        {approval.comment && (
                          <p className="text-sm text-gray-700 dark:text-gray-300 mt-2 italic">
                            "{approval.comment}"
                          </p>
                        )}
                      </div>

                      {approval.status === 'pending' &&
                       approval.approver_id === user?.id && (
                        <div className="flex space-x-2">
                          <button
                            onClick={handleApprove}
                            disabled={actionLoading}
                            className="btn btn-primary btn-sm"
                          >
                            {t('approve')}
                          </button>
                          <button
                            onClick={handleReject}
                            disabled={actionLoading}
                            className="btn bg-red-600 text-white hover:bg-red-700 btn-sm"
                          >
                            {t('reject')}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600 dark:text-gray-400">{t('approvalChainCreated')}</p>
            )}
          </div>

          {/* Comments */}
          <div className="card">
            <h2 className="text-xl font-semibold mb-4 dark:text-gray-100">{t('comments')}</h2>

            {request.comments && request.comments.length > 0 ? (
              <div className="space-y-3 mb-4">
                {request.comments.map(comment => (
                  <div key={comment.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                    <div className="flex justify-between items-start mb-1">
                      <p className="font-medium text-sm dark:text-gray-100">{comment.user_name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{formatDate(comment.created_at)}</p>
                    </div>
                    <p className="text-gray-700 dark:text-gray-300">{comment.comment}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600 dark:text-gray-400 mb-4">{t('noComments')}</p>
            )}

            {/* Add comment form */}
            <form onSubmit={handleAddComment} className="space-y-2">
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="input"
                rows="3"
                placeholder={t('addComment') + '...'}
              />
              <button
                type="submit"
                disabled={addingComment || !comment.trim()}
                className="btn btn-primary"
              >
                {addingComment ? t('addingComment') : t('addComment')}
              </button>
            </form>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Actions */}
          {request.status === 'draft' && request.requester_id === user?.id && (
            <div className="card">
              <h3 className="font-semibold mb-3 dark:text-gray-100">{t('actions')}</h3>
              <button
                onClick={handleSubmit}
                disabled={actionLoading}
                className="btn btn-primary w-full"
              >
                {t('submitForApproval')}
              </button>
            </div>
          )}

          {canApprove && (
            <div className="card bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800">
              <h3 className="font-semibold mb-3 text-yellow-900 dark:text-yellow-200 flex items-center">
                <WarningIcon size={22} className="mr-2" /> {t('yourApprovalRequired')}
              </h3>
              <div className="space-y-2">
                <button
                  onClick={handleApprove}
                  disabled={actionLoading}
                  className="btn btn-primary w-full flex items-center justify-center"
                >
                  <CheckIcon size={18} className="mr-2" /> {t('approve')}
                </button>
                <button
                  onClick={handleReject}
                  disabled={actionLoading}
                  className="btn bg-red-600 text-white hover:bg-red-700 w-full flex items-center justify-center"
                >
                  <CrossIcon size={18} className="mr-2" /> {t('reject')}
                </button>
              </div>
            </div>
          )}

          {/* Timeline */}
          <div className="card">
            <h3 className="font-semibold mb-3 dark:text-gray-100">{t('timeline')}</h3>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-gray-600 dark:text-gray-400">{t('created')}</p>
                <p className="font-medium dark:text-gray-100">{formatDate(request.created_at)}</p>
              </div>
              {request.submitted_at && (
                <div>
                  <p className="text-gray-600 dark:text-gray-400">{t('submitted')}</p>
                  <p className="font-medium dark:text-gray-100">{formatDate(request.submitted_at)}</p>
                </div>
              )}
              {request.completed_at && (
                <div>
                  <p className="text-gray-600 dark:text-gray-400">{t('completed')}</p>
                  <p className="font-medium dark:text-gray-100">{formatDate(request.completed_at)}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RequestDetailPage;
