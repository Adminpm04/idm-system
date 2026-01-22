import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { requestsAPI } from '../services/api';
import { format } from 'date-fns';

function MyRequestsListPage() {
  const [requests, setRequests] = useState([]);
  const [decisions, setDecisions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('my-requests'); // 'my-requests' or 'history'
  const [decisionFilter, setDecisionFilter] = useState('all'); // 'all', 'approved', 'rejected'

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
      setError('Ошибка загрузки заявок');
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
      setError('Ошибка загрузки истории согласований');
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
    };

    const labels = {
      draft: 'Черновик',
      submitted: 'Отправлено',
      in_review: 'На согласовании',
      approved: 'Согласовано',
      rejected: 'Отклонено',
      implemented: 'Реализовано',
      cancelled: 'Отменено',
    };

    return (
      <span className={`badge ${badges[status] || 'badge-draft'}`}>
        {labels[status] || status}
      </span>
    );
  };

  const getDecisionBadge = (decision) => {
    if (decision === 'approved') {
      return <span className="badge badge-approved">Согласовано</span>;
    } else if (decision === 'rejected') {
      return <span className="badge badge-rejected">Отклонено</span>;
    }
    return null;
  };

  const getTypeLabel = (type) => {
    const labels = {
      new_access: 'Новый доступ',
      modify_access: 'Изменение',
      revoke_access: 'Отзыв',
      temporary_access: 'Временный',
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
        <div className="text-xl text-gray-600">Загрузка...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-primary">Мои заявки</h1>
        <Link to="/create-request" className="btn btn-primary">
          + Создать заявку
        </Link>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="card mb-6">
        <div className="flex border-b border-gray-200 mb-4">
          <button
            onClick={() => { setActiveTab('my-requests'); setFilter('all'); }}
            className={`px-6 py-3 font-medium transition-colors border-b-2 -mb-px ${
              activeTab === 'my-requests'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Мои заявки
          </button>
          <button
            onClick={() => { setActiveTab('history'); setDecisionFilter('all'); }}
            className={`px-6 py-3 font-medium transition-colors border-b-2 -mb-px ${
              activeTab === 'history'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            История согласований
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
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Все
            </button>
            <button
              onClick={() => setFilter('draft')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'draft'
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Черновики
            </button>
            <button
              onClick={() => setFilter('in_review')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'in_review'
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              На согласовании
            </button>
            <button
              onClick={() => setFilter('approved')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'approved'
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Согласовано
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
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Все решения
            </button>
            <button
              onClick={() => setDecisionFilter('approved')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                decisionFilter === 'approved'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Согласованные
            </button>
            <button
              onClick={() => setDecisionFilter('rejected')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                decisionFilter === 'rejected'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Отклонённые
            </button>
          </div>
        )}
      </div>

      {/* Content for My Requests tab */}
      {activeTab === 'my-requests' && (
        <>
          {requests.length === 0 ? (
            <div className="card text-center py-12">
              <p className="text-gray-600 text-lg mb-4">Заявок не найдено</p>
              <Link to="/create-request" className="btn btn-primary inline-block">
                Создать первую заявку
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
                        <h3 className="text-lg font-semibold text-primary">
                          {request.request_number}
                        </h3>
                        {getStatusBadge(request.status)}
                        <span className="text-sm text-gray-500">
                          {getTypeLabel(request.request_type)}
                        </span>
                      </div>

                      <div className="space-y-1 text-sm text-gray-600">
                        <p>
                          <span className="font-medium">Система:</span>{' '}
                          {request.system_name}
                        </p>
                        <p>
                          <span className="font-medium">Роль:</span>{' '}
                          {request.access_role_name}
                        </p>
                        <p>
                          <span className="font-medium">Для:</span>{' '}
                          {request.target_user_name}
                        </p>
                        {request.is_temporary && (
                          <p className="text-orange-600">
                            Временный доступ до {formatDate(request.valid_until)}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="text-right text-sm text-gray-500">
                      <p>Создана:</p>
                      <p>{formatDate(request.created_at)}</p>
                      {request.submitted_at && (
                        <>
                          <p className="mt-2">Отправлена:</p>
                          <p>{formatDate(request.submitted_at)}</p>
                        </>
                      )}
                    </div>
                  </div>

                  {request.status === 'in_review' && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-sm text-gray-600">
                        На этапе согласования: <span className="font-medium">{request.current_step}</span>
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
              <p className="text-gray-600 text-lg">Нет истории согласований</p>
              <p className="text-gray-500 text-sm mt-2">
                Здесь будут отображаться заявки, по которым вы приняли решение
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
                        <h3 className="text-lg font-semibold text-primary">
                          {decision.request_number}
                        </h3>
                        {getDecisionBadge(decision.my_decision)}
                        {getStatusBadge(decision.status)}
                        <span className="text-sm text-gray-500">
                          {getTypeLabel(decision.request_type)}
                        </span>
                      </div>

                      <div className="space-y-1 text-sm text-gray-600">
                        <p>
                          <span className="font-medium">Система:</span>{' '}
                          {decision.system_name}
                        </p>
                        <p>
                          <span className="font-medium">Роль:</span>{' '}
                          {decision.access_role_name}
                        </p>
                        <p>
                          <span className="font-medium">Для:</span>{' '}
                          {decision.target_user_name}
                        </p>
                        <p>
                          <span className="font-medium">Заявитель:</span>{' '}
                          {decision.requester_name}
                        </p>
                        {decision.my_decision_comment && (
                          <p className="mt-2 italic text-gray-500">
                            Комментарий: {decision.my_decision_comment}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="text-right text-sm text-gray-500">
                      <p>Моё решение:</p>
                      <p className="font-medium">{formatDate(decision.my_decision_date)}</p>
                      <p className="mt-2">Создана:</p>
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
