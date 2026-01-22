import { useState, useEffect } from 'react';
import { adminAPI } from '../services/api';

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    limit: 50,
    offset: 0
  });

  useEffect(() => {
    loadLogs();
  }, [filters]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const res = await adminAPI.auditLogs.list(filters);
      setLogs(res.data);
    } catch (error) {
      console.error('Error loading audit logs:', error);
      alert('Ошибка загрузки журнала аудита');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getActionBadge = (action) => {
    const badges = {
      'created': 'bg-blue-100 text-blue-800',
      'updated': 'bg-yellow-100 text-yellow-800',
      'deleted': 'bg-red-100 text-red-800',
      'approved': 'bg-green-100 text-green-800',
      'rejected': 'bg-red-100 text-red-800',
      'commented': 'bg-purple-100 text-purple-800',
      'fully_approved': 'bg-green-100 text-green-800',
    };
    return badges[action] || 'bg-gray-100 text-gray-800';
  };

  const getActionText = (action) => {
    const texts = {
      'created': 'Создано',
      'updated': 'Обновлено',
      'deleted': 'Удалено',
      'approved': 'Согласовано',
      'rejected': 'Отклонено',
      'commented': 'Комментарий',
      'fully_approved': 'Полностью согласовано',
      'submitted': 'Отправлено',
    };
    return texts[action] || action;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-primary">Журнал аудита</h1>
          <p className="text-gray-600 mt-2">История всех действий в системе</p>
        </div>
        <button 
          onClick={loadLogs}
          className="btn btn-secondary"
        >
          Обновить
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">Загрузка...</div>
      ) : (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Дата/Время</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Пользователь</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Действие</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Детали</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Заявка</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP адрес</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                      Нет записей в журнале аудита
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm whitespace-nowrap">
                        {formatDate(log.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-2">
                          <div className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-bold text-sm">
                            {(log.user?.full_name || 'С')[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{log.user?.full_name || 'Система'}</p>
                            <p className="text-xs text-gray-500">{log.user?.email || '-'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={'px-2 py-1 rounded text-xs font-medium ' + getActionBadge(log.action)}>
                          {getActionText(log.action)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="max-w-md">
                          <p className="text-sm text-gray-900">{log.details}</p>
                          {log.request && (
                            <div className="mt-1 text-xs text-gray-500">
                              <span className="font-medium">Система:</span> {log.request.system?.name || '-'}
                              {' • '}
                              <span className="font-medium">Для:</span> {log.request.target_user?.full_name || '-'}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {log.request_id ? (
                          <a href={'/requests/' + log.request_id} className="text-primary hover:underline font-medium">
                            Заявка #{log.request_id}
                          </a>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {log.ip_address || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {logs.length > 0 && (
            <div className="px-4 py-3 bg-gray-50 border-t flex justify-between items-center">
              <div className="text-sm text-gray-600">
                Показано: {logs.length} записей
              </div>
              <div className="space-x-2">
                <button
                  onClick={() => setFilters({...filters, offset: Math.max(0, filters.offset - filters.limit)})}
                  disabled={filters.offset === 0}
                  className="btn btn-secondary disabled:opacity-50"
                >
                  ← Назад
                </button>
                <button
                  onClick={() => setFilters({...filters, offset: filters.offset + filters.limit})}
                  disabled={logs.length < filters.limit}
                  className="btn btn-secondary disabled:opacity-50"
                >
                  Вперёд →
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
