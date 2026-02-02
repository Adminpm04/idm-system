import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { requestsAPI } from '../services/api';
import { useAuth, useLanguage } from '../App';
import { format } from 'date-fns';
import { CheckIcon, CrossIcon, PendingIcon, NeutralIcon, ClockIcon, WarningIcon, ArrowBackIcon } from '../components/Icons';

// File attachment icon component
const FileIcon = ({ size = 20, className = '' }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
    <polyline points="14 2 14 8 20 8"></polyline>
  </svg>
);

const UploadIcon = ({ size = 20, className = '' }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
    <polyline points="17 8 12 3 7 8"></polyline>
    <line x1="12" y1="3" x2="12" y2="15"></line>
  </svg>
);

const DownloadIcon = ({ size = 20, className = '' }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
    <polyline points="7 10 12 15 17 10"></polyline>
    <line x1="12" y1="15" x2="12" y2="3"></line>
  </svg>
);

const TrashIcon = ({ size = 20, className = '' }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
  </svg>
);

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

  // Attachments
  const [uploadingFile, setUploadingFile] = useState(false);
  const [fileDescription, setFileDescription] = useState('');
  const [attachmentType, setAttachmentType] = useState('');
  const fileInputRef = useRef(null);

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

  // Attachment handlers
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (5 MB)
    if (file.size > 5 * 1024 * 1024) {
      alert(t('fileTooLarge'));
      return;
    }

    setUploadingFile(true);
    try {
      await requestsAPI.uploadAttachment(id, file, fileDescription, attachmentType);
      setFileDescription('');
      setAttachmentType('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      await loadRequest();
    } catch (err) {
      alert(err.response?.data?.detail || 'Error uploading file');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleDownload = async (attachmentId, filename) => {
    try {
      const response = await requestsAPI.downloadAttachment(id, attachmentId);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.response?.data?.detail || 'Error downloading file');
    }
  };

  const handleDeleteAttachment = async (attachmentId, filename) => {
    if (!window.confirm(`${t('deleteAttachment')} "${filename}"?`)) return;

    try {
      await requestsAPI.deleteAttachment(id, attachmentId);
      await loadRequest();
    } catch (err) {
      alert(err.response?.data?.detail || 'Error deleting attachment');
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
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
      expired: 'badge-expired',
    };

    const labels = {
      draft: t('statusDraft'),
      submitted: t('statusSubmitted'),
      in_review: t('statusInReview'),
      approved: t('statusApproved'),
      rejected: t('statusRejected'),
      implemented: t('statusImplemented'),
      expired: t('statusExpired'),
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

          {/* Attachments */}
          <div className="card">
            <h2 className="text-xl font-semibold mb-4 dark:text-gray-100 flex items-center">
              <FileIcon size={22} className="mr-2" />
              {t('attachments')}
            </h2>

            {/* Attachment list */}
            {request.attachments && request.attachments.length > 0 ? (
              <div className="space-y-3 mb-4">
                {request.attachments.map(attachment => (
                  <div
                    key={attachment.id}
                    className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 rounded-lg p-3"
                  >
                    <div className="flex items-center flex-1 min-w-0">
                      <FileIcon size={20} className="text-gray-500 dark:text-gray-400 mr-3 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium text-sm dark:text-gray-100 truncate">{attachment.filename}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {formatFileSize(attachment.file_size)} | {attachment.uploaded_by_name} | {formatDate(attachment.uploaded_at)}
                        </p>
                        {attachment.description && (
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 italic">{attachment.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-2">
                      <button
                        onClick={() => handleDownload(attachment.id, attachment.filename)}
                        className="p-2 text-primary hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                        title={t('download')}
                      >
                        <DownloadIcon size={18} />
                      </button>
                      {(attachment.uploaded_by_id === user?.id || user?.is_superuser) && (
                        <button
                          onClick={() => handleDeleteAttachment(attachment.id, attachment.filename)}
                          className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                          title={t('delete')}
                        >
                          <TrashIcon size={18} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600 dark:text-gray-400 mb-4">{t('noAttachments')}</p>
            )}

            {/* Upload form */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('uploadAttachment')}
              </p>
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={fileDescription}
                    onChange={(e) => setFileDescription(e.target.value)}
                    placeholder={t('fileDescription')}
                    className="input text-sm"
                  />
                  <select
                    value={attachmentType}
                    onChange={(e) => setAttachmentType(e.target.value)}
                    className="input text-sm"
                  >
                    <option value="">{t('selectType')}</option>
                    <option value="regulation">{t('typeRegulation')}</option>
                    <option value="letter">{t('typeLetter')}</option>
                    <option value="approval">{t('typeApproval')}</option>
                    <option value="other">{t('typeOther')}</option>
                  </select>
                </div>
                <div className="flex items-center space-x-3">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.txt,.zip,.rar"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingFile}
                    className="btn btn-outline flex items-center"
                  >
                    <UploadIcon size={18} className="mr-2" />
                    {uploadingFile ? t('uploading') : t('selectFile')}
                  </button>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    PDF, DOC, XLS, PNG, JPG, TXT, ZIP (max 5 MB)
                  </span>
                </div>
              </div>
            </div>
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
