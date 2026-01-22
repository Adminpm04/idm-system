import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { requestsAPI } from '../services/api';
import { useAuth } from '../App';
import { format } from 'date-fns';

function RequestDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
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
      setError('Ошибка загрузки заявки');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!window.confirm('Отправить заявку на согласование?')) return;
    
    setActionLoading(true);
    try {
      await requestsAPI.submit(id);
      await loadRequest();
    } catch (err) {
      alert(err.response?.data?.detail || 'Ошибка отправки заявки');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async () => {
    const comment = window.prompt('Комментарий (опционально):');
    if (comment === null) return; // Cancel clicked
    
    setActionLoading(true);
    try {
      await requestsAPI.approve(id, {
        decision: 'approved',
        comment: comment || undefined
      });
      await loadRequest();
      alert('Заявка успешно согласована!');
    } catch (err) {
      alert(err.response?.data?.detail || 'Ошибка согласования');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    const comment = window.prompt('Причина отклонения (обязательно):');
    if (!comment) return;
    
    setActionLoading(true);
    try {
      await requestsAPI.approve(id, {
        decision: 'rejected',
        comment
      });
      await loadRequest();
      alert('Заявка отклонена');
    } catch (err) {
      alert(err.response?.data?.detail || 'Ошибка отклонения');
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
      alert(err.response?.data?.detail || 'Ошибка добавления комментария');
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
      draft: 'Черновик',
      submitted: 'Отправлено',
      in_review: 'На согласовании',
      approved: 'Согласовано',
      rejected: 'Отклонено',
      implemented: 'Реализовано',
    };

    return (
      <span className={`badge ${badges[status]}`}>
        {labels[status] || status}
      </span>
    );
  };

  const getApprovalStatusIcon = (status) => {
    switch (status) {
      case 'approved': return '✅';
      case 'rejected': return '❌';
      case 'pending': return '⏳';
      default: return '⚪';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-xl text-gray-600">Загрузка...</div>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="card">
        <p className="text-red-600">{error || 'Заявка не найдена'}</p>
        <button onClick={() => navigate('/my-requests')} className="btn btn-outline mt-4">
          Вернуться к списку
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
          className="text-primary hover:underline mb-4"
        >
          ← Назад к списку
        </button>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary">
              Заявка {request.request_number}
            </h1>
            <p className="text-gray-600 mt-1">
              Создана {formatDate(request.created_at)}
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
            <h2 className="text-xl font-semibold mb-4">Информация о заявке</h2>
            
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Инициатор</p>
                  <p className="font-medium">{request.requester_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Получатель доступа</p>
                  <p className="font-medium">{request.target_user_name}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Система</p>
                  <p className="font-medium">{request.system_name}</p>
                </div>
                {request.subsystem_name && (
                  <div>
                    <p className="text-sm text-gray-600">Подсистема</p>
                    <p className="font-medium">{request.subsystem_name}</p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Роль доступа</p>
                  <p className="font-medium">{request.access_role_name}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-600">Обоснование</p>
                <p className="mt-1 text-gray-800">{request.purpose}</p>
              </div>

              {request.is_temporary && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                  <p className="text-sm font-medium text-orange-800">⏱ Временный доступ</p>
                  <p className="text-sm text-orange-700 mt-1">
                    {request.valid_from && `С ${formatDate(request.valid_from)} `}
                    До {formatDate(request.valid_until)}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Approval Flow */}
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Процесс согласования</h2>
            
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
                        ? 'border-yellow-500 bg-yellow-50'
                        : 'border-gray-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">
                          {getApprovalStatusIcon(approval.status)} Этап {approval.step_number}
                          {approval.approver_role && ` - ${approval.approver_role}`}
                        </p>
                        <p className="text-sm text-gray-600">
                          Согласующий: {approval.approver_name}
                        </p>
                        {approval.decision_date && (
                          <p className="text-sm text-gray-500 mt-1">
                            {formatDate(approval.decision_date)}
                          </p>
                        )}
                        {approval.comment && (
                          <p className="text-sm text-gray-700 mt-2 italic">
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
                            Согласовать
                          </button>
                          <button
                            onClick={handleReject}
                            disabled={actionLoading}
                            className="btn bg-red-600 text-white hover:bg-red-700 btn-sm"
                          >
                            Отклонить
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600">Цепочка согласования будет создана после отправки заявки</p>
            )}
          </div>

          {/* Comments */}
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Комментарии</h2>
            
            {request.comments && request.comments.length > 0 ? (
              <div className="space-y-3 mb-4">
                {request.comments.map(comment => (
                  <div key={comment.id} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex justify-between items-start mb-1">
                      <p className="font-medium text-sm">{comment.user_name}</p>
                      <p className="text-xs text-gray-500">{formatDate(comment.created_at)}</p>
                    </div>
                    <p className="text-gray-700">{comment.comment}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600 mb-4">Комментариев пока нет</p>
            )}

            {/* Add comment form */}
            <form onSubmit={handleAddComment} className="space-y-2">
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="input"
                rows="3"
                placeholder="Добавить комментарий..."
              />
              <button
                type="submit"
                disabled={addingComment || !comment.trim()}
                className="btn btn-primary"
              >
                {addingComment ? 'Добавление...' : 'Добавить комментарий'}
              </button>
            </form>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Actions */}
          {request.status === 'draft' && request.requester_id === user?.id && (
            <div className="card">
              <h3 className="font-semibold mb-3">Действия</h3>
              <button
                onClick={handleSubmit}
                disabled={actionLoading}
                className="btn btn-primary w-full"
              >
                Отправить на согласование
              </button>
            </div>
          )}

          {canApprove && (
            <div className="card bg-yellow-50 border-yellow-200">
              <h3 className="font-semibold mb-3 text-yellow-900">
                ⚠️ Требуется ваше согласование
              </h3>
              <div className="space-y-2">
                <button
                  onClick={handleApprove}
                  disabled={actionLoading}
                  className="btn btn-primary w-full"
                >
                  ✅ Согласовать
                </button>
                <button
                  onClick={handleReject}
                  disabled={actionLoading}
                  className="btn bg-red-600 text-white hover:bg-red-700 w-full"
                >
                  ❌ Отклонить
                </button>
              </div>
            </div>
          )}

          {/* Timeline */}
          <div className="card">
            <h3 className="font-semibold mb-3">Временная шкала</h3>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-gray-600">Создана</p>
                <p className="font-medium">{formatDate(request.created_at)}</p>
              </div>
              {request.submitted_at && (
                <div>
                  <p className="text-gray-600">Отправлена</p>
                  <p className="font-medium">{formatDate(request.submitted_at)}</p>
                </div>
              )}
              {request.completed_at && (
                <div>
                  <p className="text-gray-600">Завершена</p>
                  <p className="font-medium">{formatDate(request.completed_at)}</p>
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
