import { useState } from 'react';
import AdminSystems from './AdminSystems';
import AdminUsers from './AdminUsers';
import AdminRoles from './AdminRoles';
import AdminPermissions from './AdminPermissions';
import AdminAuditLogs from './AdminAuditLogs';
import ExportButton from '../components/ExportButton';
import { useLanguage } from '../App';

export default function Admin() {
  const [activeTab, setActiveTab] = useState('users');
  const { t } = useLanguage();

  const tabs = [
    { id: 'users', name: t('users') },
    { id: 'systems', name: t('systems') },
    { id: 'roles', name: t('roles') },
    { id: 'permissions', name: t('permissions') },
    { id: 'audit', name: t('auditLog') },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-primary dark:text-blue-400">{t('administration')}</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">{t('adminDesc')}</p>
        </div>
        <ExportButton isAdmin={true} />
      </div>

      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-primary text-primary dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
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
