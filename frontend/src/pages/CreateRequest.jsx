import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Select from 'react-select';
import { systemsAPI, subsystemsAPI, usersAPI, requestsAPI, sodAPI } from '../services/api';
import { CheckIcon, InfoIcon } from '../components/Icons';
import { useTheme, useLanguage } from '../App';

// File icons
const FileIcon = ({ size = 20, className = '' }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
    <polyline points="14 2 14 8 20 8"></polyline>
  </svg>
);

const UploadIcon = ({ size = 20, className = '' }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
    <polyline points="17 8 12 3 7 8"></polyline>
    <line x1="12" y1="3" x2="12" y2="15"></line>
  </svg>
);

const TrashIcon = ({ size = 20, className = '' }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
  </svg>
);

const LightbulbIcon = ({ size = 20, className = '' }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 21h6"></path>
    <path d="M9 18h6"></path>
    <path d="M12 2a7 7 0 0 0-7 7c0 2.38 1.19 4.47 3 5.74V17a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-2.26c1.81-1.27 3-3.36 3-5.74a7 7 0 0 0-7-7z"></path>
  </svg>
);

const ChevronDownIcon = ({ size = 20, className = '' }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="6 9 12 15 18 9"></polyline>
  </svg>
);

const ChevronUpIcon = ({ size = 20, className = '' }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="18 15 12 9 6 15"></polyline>
  </svg>
);

function CreateRequestPage() {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    target_user_ids: [],  // Changed from target_user_id to array for multi-select
    system_id: '',
    subsystem_id: '',
    access_role_id: '',
    request_type: 'new_access',
    purpose: '',
    is_temporary: false,
    valid_from: '',
    valid_until: '',
  });

  // File attachments (optional)
  const [selectedFiles, setSelectedFiles] = useState([]);
  const fileInputRef = useRef(null);

  // Recommendations state
  const [recommendations, setRecommendations] = useState({
    recommended_systems: [],
    recommended_roles: []
  });
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [showRecommendations, setShowRecommendations] = useState(true);

  // SoD state
  const [sodViolations, setSodViolations] = useState([]);
  const [sodHardBlock, setSodHardBlock] = useState(false);
  const [checkingSod, setCheckingSod] = useState(false);

  // Options data
  const [systems, setSystems] = useState([]);
  const [subsystems, setSubsystems] = useState([]);
  const [users, setUsers] = useState([]);
  const [accessRoles, setAccessRoles] = useState([]);
  const [loadingRoles, setLoadingRoles] = useState(false);

  // Load systems and users on mount with cleanup
  useEffect(() => {
    let isMounted = true;

    const loadInitialData = async () => {
      try {
        const [systemsRes, usersRes] = await Promise.all([
          systemsAPI.list(),
          usersAPI.list()
        ]);
        if (isMounted) {
          setSystems(systemsRes.data);
          setUsers(usersRes.data);
        }
      } catch (err) {
        if (isMounted) {
          console.error('Error loading initial data:', err);
        }
      }
    };

    loadInitialData();
    loadRecommendations();

    return () => {
      isMounted = false;
    };
  }, []);

  // Load role recommendations when system changes
  useEffect(() => {
    if (formData.system_id) {
      loadRecommendations(formData.system_id);
    }
  }, [formData.system_id]);

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
      setError(t('errorLoadingSystems') || 'Error loading systems');
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
      setError(t('errorLoadingUsers') || 'Error loading users');
    }
  };

  const loadAccessRoles = async (systemId) => {
    setLoadingRoles(true);
    try {
      const response = await systemsAPI.getRoles(systemId);
      setAccessRoles(response.data);
    } catch (err) {
      console.error('Error loading access roles:', err);
      setError(t('errorLoadingAccessRoles') || 'Error loading access roles');
    } finally {
      setLoadingRoles(false);
    }
  };

  const loadRecommendations = async (systemId = null) => {
    setLoadingRecommendations(true);
    try {
      const params = {};
      // If multiple users selected, skip personalized recommendations
      if (formData.target_user_ids.length === 1) {
        params.target_user_id = formData.target_user_ids[0];
      }
      if (systemId) {
        params.system_id = systemId;
      }
      const response = await requestsAPI.getRecommendations(params);
      setRecommendations(response.data);
    } catch (err) {
      console.error('Error loading recommendations:', err);
      // Silently fail - recommendations are optional
    } finally {
      setLoadingRecommendations(false);
    }
  };

  // SoD checking
  const checkSodViolations = async (roleId, userIds) => {
    if (!roleId || userIds.length === 0) {
      setSodViolations([]);
      setSodHardBlock(false);
      return;
    }

    setCheckingSod(true);
    try {
      // For single user, check their specific violations
      // For multiple users, we'll check each one
      const allViolations = [];
      let hasHardBlock = false;

      for (const userId of userIds.slice(0, 5)) { // Limit checks to avoid performance issues
        const response = await sodAPI.check(userId, parseInt(roleId));
        if (response.data.violations && response.data.violations.length > 0) {
          allViolations.push(...response.data.violations);
        }
        if (response.data.has_hard_blocks) {
          hasHardBlock = true;
        }
      }

      // Remove duplicates by conflict_id
      const uniqueViolations = allViolations.filter(
        (v, index, self) => index === self.findIndex(t => t.conflict_id === v.conflict_id)
      );

      setSodViolations(uniqueViolations);
      setSodHardBlock(hasHardBlock);
    } catch (err) {
      console.error('Error checking SoD:', err);
      // Don't block on SoD check errors
    } finally {
      setCheckingSod(false);
    }
  };

  // Check SoD when role or user changes
  useEffect(() => {
    if (formData.access_role_id && formData.target_user_ids.length > 0) {
      checkSodViolations(formData.access_role_id, formData.target_user_ids);
    } else {
      setSodViolations([]);
      setSodHardBlock(false);
    }
  }, [formData.access_role_id, formData.target_user_ids]);

  // File handling
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    const validFiles = [];
    const errors = [];

    files.forEach(file => {
      // Check size (5 MB)
      if (file.size > 5 * 1024 * 1024) {
        errors.push(`${file.name}: ${t('fileTooLarge')}`);
        return;
      }
      // Check extension
      const ext = file.name.split('.').pop()?.toLowerCase();
      const allowed = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'png', 'jpg', 'jpeg', 'txt', 'zip', 'rar'];
      if (!allowed.includes(ext)) {
        errors.push(`${file.name}: ${t('fileTypeNotAllowed')}`);
        return;
      }
      validFiles.push(file);
    });

    if (errors.length > 0) {
      alert(errors.join('\n'));
    }

    setSelectedFiles(prev => [...prev, ...validFiles]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
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
      const userIds = formData.target_user_ids;

      if (userIds.length === 0) {
        setError(t('selectAtLeastOneUser'));
        setLoading(false);
        return;
      }

      if (userIds.length === 1) {
        // Single user: use original API
        const requestData = {
          target_user_id: userIds[0],
          system_id: parseInt(formData.system_id),
          subsystem_id: formData.subsystem_id ? parseInt(formData.subsystem_id) : null,
          access_role_id: parseInt(formData.access_role_id),
          request_type: formData.request_type,
          purpose: formData.purpose,
          is_temporary: formData.is_temporary,
          valid_from: formData.is_temporary ? formData.valid_from || null : null,
          valid_until: formData.is_temporary ? formData.valid_until || null : null,
        };

        const response = await requestsAPI.create(requestData);
        const requestId = response.data.id;

        // Upload files if any (optional)
        if (selectedFiles.length > 0) {
          for (const file of selectedFiles) {
            try {
              await requestsAPI.uploadAttachment(requestId, file, '', '');
            } catch (uploadErr) {
              console.error('Error uploading file:', uploadErr);
            }
          }
        }

        setSuccess(true);
        setTimeout(() => {
          navigate(`/requests/${requestId}`);
        }, 1500);
      } else {
        // Multiple users: use bulk API
        const bulkData = {
          user_ids: userIds,
          system_id: parseInt(formData.system_id),
          subsystem_id: formData.subsystem_id ? parseInt(formData.subsystem_id) : null,
          access_role_id: parseInt(formData.access_role_id),
          request_type: formData.request_type,
          purpose: formData.purpose,
          is_temporary: formData.is_temporary,
          valid_from: formData.is_temporary ? formData.valid_from || null : null,
          valid_until: formData.is_temporary ? formData.valid_until || null : null,
        };

        const response = await requestsAPI.bulk(bulkData);

        if (response.data.skipped && response.data.skipped.length > 0) {
          const skippedInfo = response.data.skipped.map(s =>
            `ID ${s.user_id}: ${s.reason}`
          ).join(', ');
          setError(`${t('someRequestsSkipped')}: ${skippedInfo}`);
        }

        // Upload files to all created requests (optional)
        if (selectedFiles.length > 0 && response.data.request_ids.length > 0) {
          for (const reqId of response.data.request_ids) {
            for (const file of selectedFiles) {
              try {
                await requestsAPI.uploadAttachment(reqId, file, '', '');
              } catch (uploadErr) {
                console.error('Error uploading file to request', reqId, uploadErr);
              }
            }
          }
        }

        setSuccess(true);
        setTimeout(() => {
          navigate('/my-requests');
        }, 1500);
      }
    } catch (err) {
      console.error('Error creating request:', err);
      const detail = err.response?.data?.detail;
      if (detail && typeof detail === 'object' && detail.error === 'sod_violation') {
        // SoD violation from backend
        setError(`${t('sodViolation')}: ${detail.message}. ${detail.description || ''}`);
      } else {
        setError(typeof detail === 'string' ? detail : t('errorCreatingRequest') || 'Error creating request');
      }
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

  const selectedUserOptions = userOptions.filter(opt => formData.target_user_ids.includes(opt.value));

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
    }),
    multiValue: (base) => ({
      ...base,
      backgroundColor: isDark ? '#4b5563' : '#e5e7eb',
      borderRadius: '0.375rem'
    }),
    multiValueLabel: (base) => ({
      ...base,
      color: isDark ? '#f3f4f6' : '#111827',
      padding: '2px 6px'
    }),
    multiValueRemove: (base) => ({
      ...base,
      color: isDark ? '#9ca3af' : '#6b7280',
      ':hover': {
        backgroundColor: isDark ? '#6b7280' : '#d1d5db',
        color: isDark ? '#f3f4f6' : '#111827'
      }
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
          {/* Recommendations Panel */}
          {(recommendations.recommended_systems.length > 0 || recommendations.recommended_roles.length > 0) && (
            <div className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-amber-900 dark:text-amber-200 flex items-center">
                  <LightbulbIcon size={20} className="mr-2 text-amber-500" />
                  {t('recommendedForYou')}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowRecommendations(!showRecommendations)}
                  className="text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100 flex items-center text-sm"
                >
                  {showRecommendations ? (
                    <>
                      {t('hide')} <ChevronUpIcon size={16} className="ml-1" />
                    </>
                  ) : (
                    <>
                      {t('suggested')} <ChevronDownIcon size={16} className="ml-1" />
                    </>
                  )}
                </button>
              </div>

              {showRecommendations && (
                <div className="space-y-3">
                  {/* System Recommendations */}
                  {!formData.system_id && recommendations.recommended_systems.length > 0 && (
                    <div>
                      <p className="text-xs text-amber-700 dark:text-amber-300 mb-2">{t('system')}:</p>
                      <div className="flex flex-wrap gap-2">
                        {recommendations.recommended_systems.map((rec) => (
                          <button
                            key={rec.system_id}
                            type="button"
                            onClick={() => {
                              setFormData(prev => ({ ...prev, system_id: rec.system_id.toString() }));
                              loadSubsystems(rec.system_id);
                            }}
                            className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-white dark:bg-gray-700 border border-amber-300 dark:border-amber-600 text-amber-800 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-800/30 transition-colors"
                            title={rec.reason}
                          >
                            {rec.system_name}
                            <span className="ml-1.5 text-xs text-amber-600 dark:text-amber-400">
                              ({rec.system_code})
                            </span>
                          </button>
                        ))}
                      </div>
                      <p className="mt-1.5 text-xs text-amber-600 dark:text-amber-400">
                        {recommendations.recommended_systems[0]?.reason}
                      </p>
                    </div>
                  )}

                  {/* Role Recommendations */}
                  {formData.system_id && recommendations.recommended_roles.length > 0 && (
                    <div>
                      <p className="text-xs text-amber-700 dark:text-amber-300 mb-2">{t('accessRole')}:</p>
                      <div className="flex flex-wrap gap-2">
                        {recommendations.recommended_roles.map((rec) => (
                          <button
                            key={rec.access_role_id}
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, access_role_id: rec.access_role_id.toString() }))}
                            className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                              formData.access_role_id === rec.access_role_id.toString()
                                ? 'bg-amber-500 text-white border border-amber-500'
                                : 'bg-white dark:bg-gray-700 border border-amber-300 dark:border-amber-600 text-amber-800 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-800/30'
                            }`}
                            title={rec.reason}
                          >
                            {rec.role_name}
                            <span className={`ml-1.5 text-xs ${
                              formData.access_role_id === rec.access_role_id.toString()
                                ? 'text-amber-100'
                                : 'text-amber-600 dark:text-amber-400'
                            }`}>
                              ({rec.access_level})
                            </span>
                          </button>
                        ))}
                      </div>
                      <p className="mt-1.5 text-xs text-amber-600 dark:text-amber-400">
                        {recommendations.recommended_roles[0]?.reason}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* User */}
          <div data-tour="user-search">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('whoNeedsAccess')} <span className="text-red-500">*</span>
              {formData.target_user_ids.length > 1 && (
                <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                  ({formData.target_user_ids.length} {t('usersSelected')}, max 20)
                </span>
              )}
            </label>
            <Select
              options={userOptions}
              value={selectedUserOptions}
              onChange={(options) => {
                const ids = options ? options.map(opt => opt.value) : [];
                // Limit to 20 users
                if (ids.length <= 20) {
                  setFormData(prev => ({ ...prev, target_user_ids: ids }));
                }
              }}
              styles={selectStyles}
              placeholder={t('enterName')}
              noOptionsMessage={() => t('userNotFound')}
              isClearable
              isSearchable
              isMulti
            />
            {formData.target_user_ids.length === 0 && (
              <input
                type="hidden"
                name="target_user_ids"
                value=""
                required
              />
            )}
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
          <div data-tour="system-select">
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
              <>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  {selectedSystem.description}
                </p>
                {(selectedSystem.criticality_level === 'high' || selectedSystem.criticality_level === 'critical') && (
                  <div className={`mt-2 p-3 rounded-lg flex items-start ${
                    selectedSystem.criticality_level === 'critical'
                      ? 'bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800'
                      : 'bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800'
                  }`}>
                    <svg className={`w-5 h-5 mr-2 flex-shrink-0 ${
                      selectedSystem.criticality_level === 'critical' ? 'text-red-500' : 'text-orange-500'
                    }`} fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <p className={`text-sm font-medium ${
                        selectedSystem.criticality_level === 'critical'
                          ? 'text-red-800 dark:text-red-200'
                          : 'text-orange-800 dark:text-orange-200'
                      }`}>
                        {t('criticalSystemInfo')}: {selectedSystem.criticality_level === 'critical' ? t('criticalityCritical') : t('criticalityHigh')}
                      </p>
                      <p className={`text-xs mt-1 ${
                        selectedSystem.criticality_level === 'critical'
                          ? 'text-red-700 dark:text-red-300'
                          : 'text-orange-700 dark:text-orange-300'
                      }`}>
                        {t('criticalSystemWarning')}
                      </p>
                    </div>
                  </div>
                )}
              </>
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
          <div data-tour="role-select">
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
                  {role.name} - {role.access_level} ({t('riskLevel')}: {role.risk_level})
                </option>
              ))}
            </select>
            {selectedRole && (
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                {selectedRole.description}
              </p>
            )}

            {/* SoD Violations Warning */}
            {checkingSod && (
              <div className="mt-3 text-sm text-gray-500 dark:text-gray-400 flex items-center">
                <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {t('checkingSod')}...
              </div>
            )}

            {sodViolations.length > 0 && (
              <div className={`mt-3 p-4 rounded-lg border ${
                sodHardBlock
                  ? 'bg-red-50 dark:bg-red-900/30 border-red-300 dark:border-red-700'
                  : 'bg-yellow-50 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-700'
              }`}>
                <div className="flex items-start">
                  <svg className={`w-5 h-5 mr-3 flex-shrink-0 ${
                    sodHardBlock ? 'text-red-500' : 'text-yellow-500'
                  }`} fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <div className="flex-1">
                    <h4 className={`font-semibold ${
                      sodHardBlock
                        ? 'text-red-800 dark:text-red-200'
                        : 'text-yellow-800 dark:text-yellow-200'
                    }`}>
                      {sodHardBlock ? t('sodViolationBlocked') : t('sodViolationWarning')}
                    </h4>
                    <p className={`text-sm mt-1 ${
                      sodHardBlock
                        ? 'text-red-700 dark:text-red-300'
                        : 'text-yellow-700 dark:text-yellow-300'
                    }`}>
                      {sodHardBlock
                        ? t('sodViolationBlockedDesc')
                        : t('sodViolationWarningDesc')
                      }
                    </p>
                    <ul className="mt-3 space-y-2">
                      {sodViolations.map((violation, idx) => (
                        <li key={idx} className={`text-sm flex items-start ${
                          sodHardBlock
                            ? 'text-red-700 dark:text-red-300'
                            : 'text-yellow-700 dark:text-yellow-300'
                        }`}>
                          <span className="font-medium mr-2">\u2022</span>
                          <div>
                            <span className="font-medium">{violation.conflict_name}</span>
                            <br />
                            <span className="text-xs opacity-80">
                              {violation.requested_role_name} ({violation.requested_role_system})
                              {' ↔ '}
                              {violation.existing_role_name} ({violation.existing_role_system})
                            </span>
                            {violation.description && (
                              <p className="text-xs mt-1 opacity-70">{violation.description}</p>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Justification */}
          <div data-tour="justification">
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

          {/* File Attachments (Optional) */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
              <FileIcon size={18} className="mr-2" />
              {t('attachments')}
              <span className="ml-2 text-xs text-gray-500 dark:text-gray-400 font-normal">
                ({t('optional')})
              </span>
            </label>

            {/* Selected files list */}
            {selectedFiles.length > 0 && (
              <div className="mb-3 space-y-2">
                {selectedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 rounded-lg px-3 py-2"
                  >
                    <div className="flex items-center min-w-0">
                      <FileIcon size={16} className="text-gray-500 dark:text-gray-400 mr-2 flex-shrink-0" />
                      <span className="text-sm dark:text-gray-200 truncate">{file.name}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                        ({formatFileSize(file.size)})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                    >
                      <TrashIcon size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Upload button */}
            <div className="flex items-center space-x-3">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="hidden"
                multiple
                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.txt,.zip,.rar"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="btn btn-outline flex items-center text-sm"
              >
                <UploadIcon size={16} className="mr-2" />
                {t('selectFiles')}
              </button>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {t('fileFormatHint') || 'PDF, DOC, XLS, PNG, JPG, TXT, ZIP (max 5 MB)'}
              </span>
            </div>
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
              disabled={loading || success || formData.target_user_ids.length === 0 || sodHardBlock}
            >
              {loading
                ? t('creating')
                : formData.target_user_ids.length > 1
                  ? `${t('createRequests')} ${formData.target_user_ids.length} ${t('requests')}`
                  : t('createRequest')
              }
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
