import { useState } from 'react';
import AdminSystems from './AdminSystems';
import AdminUsers from './AdminUsers';
import AdminRoles from './AdminRoles';
import AdminPermissions from './AdminPermissions';
import AdminAuditLogs from './AdminAuditLogs';
import AdminLDAP from './AdminLDAP';
import AdminADUsers from './AdminADUsers';
import AdminAccessRevocation from './AdminAccessRevocation';
import Dashboard from './Dashboard';
import ExportButton from '../components/ExportButton';
import { useLanguage } from '../App';

export default function Admin() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { t } = useLanguage();

  const tabs = [
    { id: 'dashboard', name: t('dashboardTitle') },
    { id: 'users', name: t('users') },
    { id: 'systems', name: t('systems') },
    { id: 'roles', name: t('roles') },
    { id: 'permissions', name: t('permissions') },
    { id: 'revocation', name: t('accessRevocation') || 'Auto-Revoke' },
    { id: 'ldap', name: t('ldapConfig') },
    { id: 'adusers', name: t('adUsers') },
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
              data-tour={tab.id === 'users' ? 'admin-users' : tab.id === 'systems' ? 'admin-systems' : undefined}
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
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'users' && <AdminUsers />}
        {activeTab === 'systems' && <AdminSystems />}
        {activeTab === 'roles' && <AdminRoles />}
        {activeTab === 'permissions' && <AdminPermissions />}
        {activeTab === 'revocation' && <AdminAccessRevocation />}
        {activeTab === 'ldap' && <AdminLDAP />}
        {activeTab === 'adusers' && <AdminADUsers />}
        {activeTab === 'audit' && <AdminAuditLogs />}
      </div>
    </div>
  );
}
