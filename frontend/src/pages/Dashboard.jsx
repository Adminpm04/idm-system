import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { requestsAPI } from '../services/api';

export default function Dashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const res = await requestsAPI.statistics();
      setStats(res.data);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-primary">Панель управления</h1>
        <p className="text-gray-600 mt-2">Система управления доступами предназначена для централизованного запроса, согласования и предоставления доступов к корпоративным системам.</p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link to="/requests/create" className="card hover:shadow-lg transition-shadow cursor-pointer">
          <h3 className="text-lg font-semibold mb-2">Новая заявка</h3>
          <p className="text-gray-600 text-sm">Запросить доступ к системе</p>
        </Link>

        <Link to="/requests/my" className="card hover:shadow-lg transition-shadow cursor-pointer">
          <h3 className="text-lg font-semibold mb-2">Мои заявки</h3>
          <p className="text-gray-600 text-sm">Просмотр статусов заявок</p>
        </Link>

        <Link to="/requests/approvals" className="card hover:shadow-lg transition-shadow cursor-pointer">
          <h3 className="text-lg font-semibold mb-2">На согласовании</h3>
          <p className="text-gray-600 text-sm">Заявки, ожидающие утверждения</p>
        </Link>

        <Link to="/systems" className="card hover:shadow-lg transition-shadow cursor-pointer">
          <h3 className="text-lg font-semibold mb-2">Системы</h3>
          <p className="text-gray-600 text-sm">Доступные системы</p>
        </Link>
      </div>

      {/* Features */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">Добро пожаловать в IDM System</h2>
        <div className="space-y-3">
          <div className="flex items-start">
            <span className="text-secondary mr-3">✓</span>
            <div>
              <strong>Полная прозрачность процесса согласования</strong>
              <p className="text-sm text-gray-600">Отслеживайте статус каждой заявки в режиме реального времени</p>
            </div>
          </div>
          <div className="flex items-start">
            <span className="text-secondary mr-3">✓</span>
            <div>
              <strong>Автоматическая маршрутизация заявок</strong>
              <p className="text-sm text-gray-600">Заявки автоматически направляются ответственным лицам</p>
            </div>
          </div>
          <div className="flex items-start">
            <span className="text-secondary mr-3">✓</span>
            <div>
              <strong>Аудит всех действий и решений</strong>
              <p className="text-sm text-gray-600">Полная история изменений и действий пользователей</p>
            </div>
          </div>
          <div className="flex items-start">
            <span className="text-secondary mr-3">✓</span>
            <div>
              <strong>Временные доступы с авто-отзывом</strong>
              <p className="text-sm text-gray-600">Настройка временных доступов с автоматическим истечением срока</p>
            </div>
          </div>
          <div className="flex items-start">
            <span className="text-secondary mr-3">✓</span>
            <div>
              <strong>Периодическое переутверждение доступов</strong>
              <p className="text-sm text-gray-600">Регулярная проверка актуальности предоставленных доступов</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
