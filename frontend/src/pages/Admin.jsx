import { useState } from 'react';
import AdminSystems from './AdminSystems';
import AdminUsers from './AdminUsers';
import AdminRoles from './AdminRoles';
import AdminPermissions from './AdminPermissions';
import AdminAuditLogs from './AdminAuditLogs';
import ExportButton from '../components/ExportButton';

export default function Admin() {
  const [activeTab, setActiveTab] = useState('users');

  const tabs = [
    { id: 'users', name: 'Пользователи' },
    { id: 'systems', name: 'Системы' },
    { id: 'roles', name: 'Роли' },
    { id: 'permissions', name: 'Права доступа' },
    { id: 'audit', name: 'Журнал аудита' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-primary">Администрирование</h1>
          <p className="text-gray-600 mt-2">Управление пользователями, ролями и правами доступа</p>
        </div>
        <ExportButton isAdmin={true} />
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={'py-4 px-1 border-b-2 font-medium text-sm ' + (activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-gray-500')}
            >
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      <div>
        {activeTab === 'users' && <AdminUsers />}
        {activeTab === 'systems' && <AdminSystems />}
        {activeTab === 'roles' && <AdminRoles />}
        {activeTab === 'permissions' && <AdminPermissions />}
        {activeTab === 'audit' && <AdminAuditLogs />}
      </div>
    </div>
  );
}

function UsersTabPlaceholder() {
  return (
    <div className="card">
      <h2 className="text-xl font-semibold mb-4">Пользователи системы</h2>
      <p className="text-gray-600">Управление пользователями будет доступно в следующей версии</p>
    </div>
  );
}

function RolesTabPlaceholder() {
  return (
    <div className="card">
      <h2 className="text-xl font-semibold mb-4">Роли и права</h2>
      <p className="text-gray-600">Управление ролями будет доступно в следующей версии</p>
    </div>
  );
}

function PermissionsTabPlaceholder() {
  return (
    <div className="card">
      <h2 className="text-xl font-semibold mb-4">Права доступа</h2>
      <p className="text-gray-600">Просмотр прав доступа будет доступен в следующей версии</p>
    </div>
  );
}
