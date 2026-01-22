import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { requestsAPI } from '../services/api';

function MyApprovalsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
      setError('Ошибка загрузки заявок');
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
      <div className="min-h-screen bg-gray-50">
        <header className="bg-primary text-white shadow-lg">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between h-16">
              <Link to="/" className="text-2xl font-bold flex items-center space-x-2">
                <span>IDM</span>
                <span className="text-secondary">System</span>
              </Link>
            </div>
          </div>
        </header>
        <main className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center h-64">
            <div className="text-xl text-gray-600">Загрузка...</div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-primary text-white shadow-lg">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="text-2xl font-bold flex items-center space-x-2">
              <span>IDM</span>
              <span className="text-secondary">System</span>
            </Link>
            <nav className="flex space-x-6">
              <Link to="/" className="hover:text-secondary transition-colors">
                Главная
              </Link>
              <Link to="/my-requests" className="hover:text-secondary transition-colors">
                Мои заявки
              </Link>
              <Link to="/my-approvals" className="text-secondary">
                На согласовании
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-primary mb-6">
          Заявки на согласовании
          {requests.length > 0 && (
            <span className="ml-3 text-lg text-gray-600">({requests.length})</span>
          )}
        </h1>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {requests.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-gray-600 text-lg">
              У вас нет заявок, ожидающих согласования
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
                      <h3 className="text-lg font-semibold text-primary">
                        {request.request_number}
                      </h3>
                      <span className="badge badge-in-review">
                        ⏳ Ожидает вашего согласования
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
                      <p>
                        <span className="font-medium">Инициатор:</span>{' '}
                        {request.requester_name}
                      </p>
                    </div>

                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-sm font-medium text-gray-700">
                        Обоснование:
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        {request.purpose}
                      </p>
                    </div>
                  </div>

                  <div className="text-right text-sm text-gray-500 ml-4">
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

                <div className="mt-4 flex justify-end space-x-2">
                  <span className="btn btn-primary btn-sm">
                    Перейти к согласованию →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default MyApprovalsPage;
