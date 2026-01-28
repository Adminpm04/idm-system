import React, { useState, useEffect } from 'react';
import { useLanguage } from '../App';

export default function AdminLDAP() {
  const { t } = useLanguage();
  const [config, setConfig] = useState({
    enabled: true,
    server: '',
    port: 389,
    use_ssl: false,
    base_dn: '',
    bind_dn: '',
    bind_password: '',
    user_search_base: '',
    user_filter: '(sAMAccountName={username})',
    timeout: 10,
    // Attribute mapping
    attr_email: 'mail',
    attr_display_name: 'displayName',
    attr_department: 'department',
    attr_position: 'title',
    attr_phone: 'telephoneNumber',
    attr_groups: 'memberOf'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('/api/admin/ldap/config', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setConfig(prev => ({ ...prev, ...data }));
      }
    } catch (error) {
      console.error('Error fetching LDAP config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('/api/admin/ldap/config', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
      });
      if (response.ok) {
        setMessage({ type: 'success', text: t('configSaved') });
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.detail || t('saveFailed') });
      }
    } catch (error) {
      setMessage({ type: 'error', text: t('saveFailed') });
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('/api/admin/ldap/test', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
      });
      const data = await response.json();
      setTestResult(data);
    } catch (error) {
      setTestResult({ success: false, message: t('connectionFailed') });
    } finally {
      setTesting(false);
    }
  };

  const handleChange = (field, value) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {message && (
        <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'}`}>
          {message.text}
        </div>
      )}

      {/* Connection Settings */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4 dark:text-gray-100">{t('connectionSettings')}</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={(e) => handleChange('enabled', e.target.checked)}
                className="w-5 h-5 text-primary rounded focus:ring-primary"
              />
              <span className="font-medium dark:text-gray-200">{t('enableLDAP')}</span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('ldapServer')}
            </label>
            <input
              type="text"
              value={config.server}
              onChange={(e) => handleChange('server', e.target.value)}
              className="input"
              placeholder="ldap://192.168.1.100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('port')}
            </label>
            <input
              type="number"
              value={config.port}
              onChange={(e) => handleChange('port', parseInt(e.target.value))}
              className="input"
              placeholder="389"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('baseDN')}
            </label>
            <input
              type="text"
              value={config.base_dn}
              onChange={(e) => handleChange('base_dn', e.target.value)}
              className="input"
              placeholder="DC=company,DC=local"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('timeout')} ({t('seconds')})
            </label>
            <input
              type="number"
              value={config.timeout}
              onChange={(e) => handleChange('timeout', parseInt(e.target.value))}
              className="input"
              placeholder="10"
            />
          </div>

          <div className="md:col-span-2">
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={config.use_ssl}
                onChange={(e) => handleChange('use_ssl', e.target.checked)}
                className="w-5 h-5 text-primary rounded focus:ring-primary"
              />
              <span className="dark:text-gray-200">{t('useSSL')} (LDAPS)</span>
            </label>
          </div>
        </div>
      </div>

      {/* Bind Account */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4 dark:text-gray-100">{t('serviceAccount')}</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('bindDN')}
            </label>
            <input
              type="text"
              value={config.bind_dn}
              onChange={(e) => handleChange('bind_dn', e.target.value)}
              className="input"
              placeholder="cn=service_account,ou=users,dc=company,dc=local"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('bindDNHint')}</p>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('bindPassword')}
            </label>
            <input
              type="password"
              value={config.bind_password}
              onChange={(e) => handleChange('bind_password', e.target.value)}
              className="input"
              placeholder="••••••••"
            />
          </div>
        </div>
      </div>

      {/* Search Settings */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4 dark:text-gray-100">{t('searchSettings')}</h3>

        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('userSearchBase')}
            </label>
            <input
              type="text"
              value={config.user_search_base}
              onChange={(e) => handleChange('user_search_base', e.target.value)}
              className="input"
              placeholder="OU=Users,DC=company,DC=local"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('userSearchBaseHint')}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('userFilter')}
            </label>
            <input
              type="text"
              value={config.user_filter}
              onChange={(e) => handleChange('user_filter', e.target.value)}
              className="input"
              placeholder="(sAMAccountName={username})"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('userFilterHint')}</p>
          </div>
        </div>
      </div>

      {/* Attribute Mapping */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4 dark:text-gray-100">{t('attributeMapping')}</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('emailAttribute')}
            </label>
            <input
              type="text"
              value={config.attr_email}
              onChange={(e) => handleChange('attr_email', e.target.value)}
              className="input"
              placeholder="mail"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('displayNameAttribute')}
            </label>
            <input
              type="text"
              value={config.attr_display_name}
              onChange={(e) => handleChange('attr_display_name', e.target.value)}
              className="input"
              placeholder="displayName"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('departmentAttribute')}
            </label>
            <input
              type="text"
              value={config.attr_department}
              onChange={(e) => handleChange('attr_department', e.target.value)}
              className="input"
              placeholder="department"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('positionAttribute')}
            </label>
            <input
              type="text"
              value={config.attr_position}
              onChange={(e) => handleChange('attr_position', e.target.value)}
              className="input"
              placeholder="title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('phoneAttribute')}
            </label>
            <input
              type="text"
              value={config.attr_phone}
              onChange={(e) => handleChange('attr_phone', e.target.value)}
              className="input"
              placeholder="telephoneNumber"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('groupsAttribute')}
            </label>
            <input
              type="text"
              value={config.attr_groups}
              onChange={(e) => handleChange('attr_groups', e.target.value)}
              className="input"
              placeholder="memberOf"
            />
          </div>
        </div>
      </div>

      {/* Test Result */}
      {testResult && (
        <div className={`card ${testResult.success ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-red-500 bg-red-50 dark:bg-red-900/20'}`}>
          <div className="flex items-center space-x-3">
            {testResult.success ? (
              <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            <div>
              <p className={`font-medium ${testResult.success ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                {testResult.success ? t('connectionSuccess') : t('connectionFailed')}
              </p>
              {testResult.message && (
                <p className="text-sm text-gray-600 dark:text-gray-400">{testResult.message}</p>
              )}
              {testResult.users_found !== undefined && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t('usersFound')}: {testResult.users_found}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end space-x-4">
        <button
          onClick={handleTestConnection}
          disabled={testing || !config.server}
          className="btn btn-outline"
        >
          {testing ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {t('testing')}
            </span>
          ) : t('testConnection')}
        </button>

        <button
          onClick={handleSave}
          disabled={saving}
          className="btn btn-primary"
        >
          {saving ? t('saving') : t('saveConfig')}
        </button>
      </div>
    </div>
  );
}
