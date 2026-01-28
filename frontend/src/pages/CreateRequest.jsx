import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Select from 'react-select';
import { systemsAPI, subsystemsAPI, usersAPI, requestsAPI } from '../services/api';
import { CheckIcon, InfoIcon } from '../components/Icons';
import { useTheme, useLanguage } from '../App';

function CreateRequestPage() {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    target_user_id: '',
    system_id: '',
    subsystem_id: '',
    access_role_id: '',
    request_type: 'new_access',
    purpose: '',
    is_temporary: false,
    valid_from: '',
    valid_until: '',
  });

  // Options data
  const [systems, setSystems] = useState([]);
  const [subsystems, setSubsystems] = useState([]);
  const [users, setUsers] = useState([]);
  const [accessRoles, setAccessRoles] = useState([]);
  const [loadingRoles, setLoadingRoles] = useState(false);

  // Load systems and users on mount
  useEffect(() => {
    loadSystems();
    loadUsers();
  }, []);

  // Load access roles when system is selected
  useEffect(() => {
    if (formData.system_id) {
      loadAccessRoles(formData.system_id);
    } else {
      setAccessRoles([]);
      setFormData(prev => ({ ...prev, access_role_id: '' }));
    }
  }, [formData.system_id]);

  const loadSystems = async () => {
    try {
      const response = await systemsAPI.list({ is_active: true });
      setSystems(response.data);
    } catch (err) {
      console.error('Error loading systems:', err);
      setError('Error loading systems');
    }
  };

  const loadSubsystems = async (systemId) => {
    if (!systemId) {
      setSubsystems([]);
      return;
    }
    try {
      const res = await subsystemsAPI.list(systemId);
      setSubsystems(res.data || []);
    } catch (error) {
      console.error('Error loading subsystems:', error);
      setSubsystems([]);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await usersAPI.list();
      setUsers(response.data);
    } catch (err) {
      console.error('Error loading users:', err);
      setError('Error loading users');
    }
  };

  const loadAccessRoles = async (systemId) => {
    setLoadingRoles(true);
    try {
      const response = await systemsAPI.getRoles(systemId);
      setAccessRoles(response.data);
    } catch (err) {
      console.error('Error loading access roles:', err);
      setError('Error loading access roles');
    } finally {
      setLoadingRoles(false);
    }
  };

  const handleChange = async (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    // Load subsystems when system is selected
    if (name === 'system_id') {
      await loadSubsystems(value);
      setFormData(prev => ({ ...prev, subsystem_id: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Convert string IDs to integers
      const requestData = {
        ...formData,
        target_user_id: parseInt(formData.target_user_id),
        system_id: parseInt(formData.system_id),
        subsystem_id: formData.subsystem_id ? parseInt(formData.subsystem_id) : null,
        access_role_id: parseInt(formData.access_role_id),
      };

      // Remove date fields if not temporary
      if (!requestData.is_temporary) {
        delete requestData.valid_from;
        delete requestData.valid_until;
      }

      const response = await requestsAPI.create(requestData);

      setSuccess(true);
      setTimeout(() => {
        navigate(`/requests/${response.data.id}`);
      }, 1500);
    } catch (err) {
      console.error('Error creating request:', err);
      setError(err.response?.data?.detail || 'Error creating request');
    } finally {
      setLoading(false);
    }
  };

  const selectedSystem = systems.find(s => s.id === parseInt(formData.system_id));
  const selectedRole = accessRoles.find(r => r.id === parseInt(formData.access_role_id));

  // react-select options for users
  const userOptions = users.map(user => ({
    value: user.id,
    label: user.full_name
  }));

  const selectedUserOption = userOptions.find(opt => opt.value === parseInt(formData.target_user_id)) || null;

  // Custom styles for react-select to match .input class with dark mode support
  const selectStyles = {
    control: (base, state) => ({
      ...base,
      width: '100%',
      padding: '2px 8px',
      border: state.isFocused ? 'none' : isDark ? '1px solid #4b5563' : '1px solid #d1d5db',
      borderRadius: '0.5rem',
      boxShadow: state.isFocused ? '0 0 0 2px #16306C' : 'none',
      backgroundColor: isDark ? '#374151' : 'white',
      '&:hover': {
        borderColor: isDark ? '#4b5563' : '#d1d5db'
      }
    }),
    menu: (base) => ({
      ...base,
      borderRadius: '0.5rem',
      zIndex: 50,
      backgroundColor: isDark ? '#374151' : 'white',
      border: isDark ? '1px solid #4b5563' : '1px solid #e5e7eb'
    }),
    option: (base, state) => ({
      ...base,
      backgroundColor: state.isSelected
        ? '#16306C'
        : state.isFocused
          ? (isDark ? '#4b5563' : '#e5e7eb')
          : (isDark ? '#374151' : 'white'),
      color: state.isSelected ? 'white' : (isDark ? '#f3f4f6' : '#111827'),
      '&:active': {
        backgroundColor: '#16306C'
      }
    }),
    singleValue: (base) => ({
      ...base,
      color: isDark ? '#f3f4f6' : '#111827'
    }),
    input: (base) => ({
      ...base,
      color: isDark ? '#f3f4f6' : '#111827'
    }),
    placeholder: (base) => ({
      ...base,
      color: isDark ? '#9ca3af' : '#6b7280'
    })
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-primary dark:text-blue-400">{t('newAccessRequest')}</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">{t('fillFormDesc')}</p>
      </div>

      <div className="card">
        {success && (
          <div className="mb-6 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 px-4 py-3 rounded-lg flex items-center">
            <CheckIcon size={20} className="mr-2" /> {t('requestCreated')}
          </div>
        )}

        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* User */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('whoNeedsAccess')} <span className="text-red-500">*</span>
            </label>
            <Select
              options={userOptions}
              value={selectedUserOption}
              onChange={(option) => setFormData(prev => ({ ...prev, target_user_id: option ? option.value : '' }))}
              styles={selectStyles}
              placeholder={t('enterName')}
              noOptionsMessage={() => t('userNotFound')}
              isClearable
              isSearchable
            />
            <input
              type="hidden"
              name="target_user_id"
              value={formData.target_user_id}
              required
            />
          </div>

          {/* Request Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('requestType')} <span className="text-red-500">*</span>
            </label>
            <select
              name="request_type"
              value={formData.request_type}
              onChange={handleChange}
              className="input"
              required
            >
              <option value="new_access">{t('newAccessType')}</option>
              <option value="modify_access">{t('modifyAccessType')}</option>
              <option value="revoke_access">{t('revokeAccessType')}</option>
              <option value="temporary_access">{t('temporaryAccessType')}</option>
            </select>
          </div>

          {/* System */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('system')} <span className="text-red-500">*</span>
            </label>
            <select
              name="system_id"
              value={formData.system_id}
              onChange={handleChange}
              className="input"
              required
            >
              <option value="">{t('selectSystem')}</option>
              {systems.map(system => (
                <option key={system.id} value={system.id}>
                  {system.name} ({system.code})
                </option>
              ))}
            </select>
            {selectedSystem && (
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                {selectedSystem.description}
              </p>
            )}
          </div>

          {/* Subsystem */}
          {subsystems.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('subsystem')} <span className="text-red-500">*</span>
              </label>
              <select
                name="subsystem_id"
                value={formData.subsystem_id}
                onChange={handleChange}
                className="input"
                required
              >
                <option value="">{t('selectSubsystem')}</option>
                {subsystems.map(subsystem => (
                  <option key={subsystem.id} value={subsystem.id}>
                    {subsystem.name} ({subsystem.code})
                  </option>
                ))}
              </select>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                {subsystems.find(s => s.id === parseInt(formData.subsystem_id))?.description || ''}
              </p>
            </div>
          )}

          {/* Access Role */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('accessRole')} <span className="text-red-500">*</span>
            </label>
            <select
              name="access_role_id"
              value={formData.access_role_id}
              onChange={handleChange}
              className="input"
              required
              disabled={!formData.system_id || loadingRoles}
            >
              <option value="">
                {!formData.system_id
                  ? t('selectSystemFirst')
                  : loadingRoles
                  ? t('loading')
                  : t('selectRole')}
              </option>
              {accessRoles.map(role => (
                <option key={role.id} value={role.id}>
                  {role.name} - {role.access_level} (risk: {role.risk_level})
                </option>
              ))}
            </select>
            {selectedRole && (
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                {selectedRole.description}
              </p>
            )}
          </div>

          {/* Justification */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('justificationLabel')} <span className="text-red-500">*</span>
            </label>
            <textarea
              name="purpose"
              value={formData.purpose}
              onChange={handleChange}
              className="input"
              rows="4"
              placeholder={t('justificationPlaceholder')}
              required
              minLength={10}
            />
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-500">
              {t('minChars')}
            </p>
          </div>

          {/* Temporary Access */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <div className="flex items-center mb-4">
              <input
                type="checkbox"
                name="is_temporary"
                checked={formData.is_temporary}
                onChange={handleChange}
                className="w-4 h-4 text-primary border-gray-300 dark:border-gray-600 rounded focus:ring-primary dark:bg-gray-700"
                id="is_temporary"
              />
              <label htmlFor="is_temporary" className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('temporaryAccessCheckbox')}
              </label>
            </div>

            {formData.is_temporary && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('validFromLabel')}
                  </label>
                  <input
                    type="date"
                    name="valid_from"
                    value={formData.valid_from}
                    onChange={handleChange}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('validUntilLabel')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="valid_until"
                    value={formData.valid_until}
                    onChange={handleChange}
                    className="input"
                    required={formData.is_temporary}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Buttons */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="btn btn-outline"
              disabled={loading}
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || success}
            >
              {loading ? t('creating') : t('createRequest')}
            </button>
          </div>
        </form>
      </div>

      {/* Information */}
      <div className="mt-6 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-2 flex items-center">
          <InfoIcon size={20} className="mr-2" /> {t('whatNext')}
        </h3>
        <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-2">
          <li className="flex items-start"><CheckIcon size={16} className="mr-2 mt-0.5 flex-shrink-0" /> {t('whatNext1')}</li>
          <li className="flex items-start"><CheckIcon size={16} className="mr-2 mt-0.5 flex-shrink-0" /> {t('whatNext2')}</li>
          <li className="flex items-start"><CheckIcon size={16} className="mr-2 mt-0.5 flex-shrink-0" /> {t('whatNext3')}</li>
          <li className="flex items-start"><CheckIcon size={16} className="mr-2 mt-0.5 flex-shrink-0" /> {t('whatNext4')}</li>
        </ul>
      </div>
    </div>
  );
}

export default CreateRequestPage;
