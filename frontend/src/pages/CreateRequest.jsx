import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Select from 'react-select';
import { systemsAPI, subsystemsAPI, usersAPI, requestsAPI } from '../services/api';
import { CheckIcon, InfoIcon } from '../components/Icons';

function CreateRequestPage() {
  const navigate = useNavigate();
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
      setError('Ошибка загрузки систем');
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
      setError('Ошибка загрузки пользователей');
    }
  };

  const loadAccessRoles = async (systemId) => {
    setLoadingRoles(true);
    try {
      const response = await systemsAPI.getRoles(systemId);
      setAccessRoles(response.data);
    } catch (err) {
      console.error('Error loading access roles:', err);
      setError('Ошибка загрузки ролей доступа');
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
    
    // Загрузим подсистемы когда выбрана система
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
      setError(err.response?.data?.detail || 'Ошибка создания заявки');
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

  // Custom styles for react-select to match .input class
  const selectStyles = {
    control: (base, state) => ({
      ...base,
      width: '100%',
      padding: '2px 8px',
      border: state.isFocused ? 'none' : '1px solid #d1d5db',
      borderRadius: '0.5rem',
      boxShadow: state.isFocused ? '0 0 0 2px #16306C' : 'none',
      '&:hover': {
        borderColor: '#d1d5db'
      }
    }),
    menu: (base) => ({
      ...base,
      borderRadius: '0.5rem',
      zIndex: 50
    }),
    option: (base, state) => ({
      ...base,
      backgroundColor: state.isSelected ? '#16306C' : state.isFocused ? '#e5e7eb' : 'white',
      color: state.isSelected ? 'white' : '#111827',
      '&:active': {
        backgroundColor: '#16306C'
      }
    })
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-primary">Новая заявка на доступ</h1>
        <p className="text-gray-600 mt-2">Заполните форму для запроса доступа к системе</p>
      </div>

      <div className="card">
        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center">
            <CheckIcon size={20} className="mr-2" /> Заявка успешно создана! Перенаправление...
          </div>
        )}

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Пользователь */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Для кого запрашивается доступ <span className="text-red-500">*</span>
            </label>
            <Select
              options={userOptions}
              value={selectedUserOption}
              onChange={(option) => setFormData(prev => ({ ...prev, target_user_id: option ? option.value : '' }))}
              styles={selectStyles}
              placeholder="Введите имя..."
              noOptionsMessage={() => 'Пользователь не найден'}
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

          {/* Тип заявки */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Тип заявки <span className="text-red-500">*</span>
            </label>
            <select
              name="request_type"
              value={formData.request_type}
              onChange={handleChange}
              className="input"
              required
            >
              <option value="new_access">Новый доступ</option>
              <option value="modify_access">Изменение доступа</option>
              <option value="revoke_access">Отзыв доступа</option>
              <option value="temporary_access">Временный доступ</option>
            </select>
          </div>

          {/* Система */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Система <span className="text-red-500">*</span>
            </label>
            <select
              name="system_id"
              value={formData.system_id}
              onChange={handleChange}
              className="input"
              required
            >
              <option value="">Выберите систему</option>
              {systems.map(system => (
                <option key={system.id} value={system.id}>
                  {system.name} ({system.code})
                </option>
              ))}
            </select>
            {selectedSystem && (
              <p className="mt-2 text-sm text-gray-600">
                {selectedSystem.description}
              </p>
            )}
          </div>


          {/* Подсистема */}
          {subsystems.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Подсистема <span className="text-red-500">*</span>
              </label>
              <select
                name="subsystem_id"
                value={formData.subsystem_id}
                onChange={handleChange}
                className="input"
                required
              >
                <option value="">Выберите подсистему</option>
                {subsystems.map(subsystem => (
                  <option key={subsystem.id} value={subsystem.id}>
                    {subsystem.name} ({subsystem.code})
                  </option>
                ))}
              </select>
              <p className="mt-2 text-sm text-gray-600">
                {subsystems.find(s => s.id === parseInt(formData.subsystem_id))?.description || ''}
              </p>
            </div>
          )}

          {/* Роль доступа */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Роль доступа <span className="text-red-500">*</span>
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
                  ? 'Сначала выберите систему' 
                  : loadingRoles 
                  ? 'Загрузка...' 
                  : 'Выберите роль'}
              </option>
              {accessRoles.map(role => (
                <option key={role.id} value={role.id}>
                  {role.name} - {role.access_level} (риск: {role.risk_level})
                </option>
              ))}
            </select>
            {selectedRole && (
              <p className="mt-2 text-sm text-gray-600">
                {selectedRole.description}
              </p>
            )}
          </div>

          {/* Обоснование */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Обоснование (цель запроса) <span className="text-red-500">*</span>
            </label>
            <textarea
              name="purpose"
              value={formData.purpose}
              onChange={handleChange}
              className="input"
              rows="4"
              placeholder="Подробно опишите, для чего нужен доступ и как он будет использоваться..."
              required
              minLength={10}
            />
            <p className="mt-1 text-sm text-gray-500">
              Минимум 10 символов. Укажите бизнес-обоснование.
            </p>
          </div>

          {/* Временный доступ */}
          <div className="border-t pt-6">
            <div className="flex items-center mb-4">
              <input
                type="checkbox"
                name="is_temporary"
                checked={formData.is_temporary}
                onChange={handleChange}
                className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                id="is_temporary"
              />
              <label htmlFor="is_temporary" className="ml-2 text-sm font-medium text-gray-700">
                Временный доступ (с ограниченным сроком действия)
              </label>
            </div>

            {formData.is_temporary && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Действителен с
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Действителен до <span className="text-red-500">*</span>
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

          {/* Кнопки */}
          <div className="flex justify-end space-x-4 pt-6 border-t">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="btn btn-outline"
              disabled={loading}
            >
              Отмена
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || success}
            >
              {loading ? 'Создание...' : 'Создать заявку'}
            </button>
          </div>
        </form>
      </div>

      {/* Информация */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2 flex items-center">
          <InfoIcon size={20} className="mr-2" /> Что дальше?
        </h3>
        <ul className="text-sm text-blue-800 space-y-2">
          <li className="flex items-start"><CheckIcon size={16} className="mr-2 mt-0.5 flex-shrink-0" /> После создания заявка будет в статусе "Черновик"</li>
          <li className="flex items-start"><CheckIcon size={16} className="mr-2 mt-0.5 flex-shrink-0" /> Вы сможете отредактировать её перед отправкой</li>
          <li className="flex items-start"><CheckIcon size={16} className="mr-2 mt-0.5 flex-shrink-0" /> После отправки заявка пойдёт на согласование</li>
          <li className="flex items-start"><CheckIcon size={16} className="mr-2 mt-0.5 flex-shrink-0" /> Вы увидите всех согласующих и текущий статус</li>
        </ul>
      </div>
    </div>
  );
}

export default CreateRequestPage;
