import { useState, useEffect } from 'react';
import { systemsAPI, subsystemsAPI, approvalChainAPI, usersAPI } from '../services/api';
import { InfoIcon, SystemIcon, SubsystemIcon, PlusIcon } from '../components/Icons';

export default function AdminSystems() {
  const [systems, setSystems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showSubsystemsModal, setShowSubsystemsModal] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [editingSystem, setEditingSystem] = useState(null);
  const [selectedSystem, setSelectedSystem] = useState(null);

  useEffect(() => {
    loadSystems();
  }, []);

  const loadSystems = async () => {
    setLoading(true);
    try {
      const res = await systemsAPI.list({});
      setSystems(res.data);
    } catch (error) {
      console.error('Error loading systems:', error);
      alert('Ошибка загрузки систем');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Вы уверены что хотите удалить эту систему?')) return;
    
    try {
      await systemsAPI.delete(id);
      alert('Система удалена');
      loadSystems();
    } catch (error) {
      alert('Ошибка удаления: ' + (error.response?.data?.detail || error.message));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-primary">Управление системами</h1>
          <p className="text-gray-600 mt-2">Добавление и редактирование систем и подсистем</p>
        </div>
        <button
          onClick={() => {
            setEditingSystem(null);
            setShowModal(true);
          }}
          className="btn btn-primary flex items-center"
        >
          <PlusIcon size={18} className="mr-2" /> Добавить систему
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">Загрузка...</div>
      ) : (
        <div className="card">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Название</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Код</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Описание</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Статус</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Действия</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y">
              {systems.map((system) => (
                <tr key={system.id}>
                  <td className="px-6 py-4 font-medium">{system.name}</td>
                  <td className="px-6 py-4">{system.code}</td>
                  <td className="px-6 py-4">{system.description}</td>
                  <td className="px-6 py-4">
                    {system.is_active ? (
                      <span className="badge badge-success">Активна</span>
                    ) : (
                      <span className="badge badge-secondary">Неактивна</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button 
                      onClick={() => {
                        setSelectedSystem(system);
                        setShowSubsystemsModal(true);
                      }}
                      style={{backgroundColor: "#F9BF3F", color: "#16306C"}} className="hover:opacity-80 px-3 py-1 rounded text-sm font-medium"
                    >
                      Подсистемы
                    </button>
                    <button 
                      onClick={() => {
                        setSelectedSystem(system);
                        setShowApprovalModal(true);
                      }}
                      style={{backgroundColor: "#16306C", color: "white"}} className="hover:opacity-80 px-3 py-1 rounded text-sm font-medium"
                    >
                      Утверждающие
                    </button>
                    <button 
                      onClick={() => {
                        setEditingSystem(system);
                        setShowModal(true);
                      }}
                      className="text-primary hover:text-primary/80"
                    >
                      Изменить
                    </button>
                    <button 
                      onClick={() => handleDelete(system.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Удалить
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <SystemModal
          system={editingSystem}
          onClose={() => {
            setShowModal(false);
            setEditingSystem(null);
          }}
          onSave={() => {
            setShowModal(false);
            setEditingSystem(null);
            loadSystems();
          }}
        />
      )}

      {showSubsystemsModal && selectedSystem && (
        <SubsystemsModal
          system={selectedSystem}
          onClose={() => {
            setShowSubsystemsModal(false);
            setSelectedSystem(null);
          }}
        />
      )}

      {showApprovalModal && selectedSystem && (
        <ApprovalChainModal
          system={selectedSystem}
          onClose={() => {
            setShowApprovalModal(false);
            setSelectedSystem(null);
          }}
        />
      )}
    </div>
  );
}

function SystemModal({ system, onClose, onSave }) {
  const [approvalChain, setApprovalChain] = useState([]);
  const [users, setUsers] = useState([]);
  const [loadingChain, setLoadingChain] = useState(false);
  
  const [formData, setFormData] = useState({
    name: system?.name || '',
    code: system?.code || '',
    description: system?.description || '',
    url: system?.url || '',
    is_active: system?.is_active ?? true,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (system) {
        await systemsAPI.update(system.id, formData);
        alert('Система обновлена');
      } else {
        await systemsAPI.create(formData);
        alert('Система создана');
      }
      onSave();
    } catch (error) {
      alert('Ошибка: ' + (error.response?.data?.detail || error.message));
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-2xl font-bold mb-4">
          {system ? 'Редактировать систему' : 'Новая система'}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Название *</label>
            <input
              type="text"
              required
              className="input"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Код *</label>
            <input
              type="text"
              required
              className="input"
              value={formData.code}
              onChange={(e) => setFormData({...formData, code: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Описание</label>
            <textarea
              className="input"
              rows="3"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">URL</label>
            <input
              type="url"
              className="input"
              value={formData.url}
              onChange={(e) => setFormData({...formData, url: e.target.value})}
            />
          </div>

          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                className="mr-2"
                checked={formData.is_active}
                onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
              />
              <span className="text-sm">Активна</span>
            </label>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Отмена
            </button>
            <button type="submit" className="btn btn-primary">
              Сохранить
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SubsystemsModal({ system, onClose }) {
  const [subsystems, setSubsystems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingSubsystem, setEditingSubsystem] = useState(null);

  useEffect(() => {
    loadSubsystems();
  }, []);

  const loadSubsystems = async () => {
    setLoading(true);
    try {
      const res = await subsystemsAPI.list(system.id);
      setSubsystems(res.data);
    } catch (error) {
      console.error('Error loading subsystems:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Удалить эту подсистему?')) return;
    try {
      await subsystemsAPI.delete(id);
      loadSubsystems();
    } catch (error) {
      alert('Ошибка: ' + error.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-3xl w-full mx-4 max-h-screen overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">
            Подсистемы: {system.name}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
        </div>

        <button
          onClick={() => {
            setEditingSubsystem(null);
            setShowAddForm(true);
          }}
          className="btn btn-primary mb-4"
        >
          Добавить подсистему
        </button>

        {loading ? (
          <div className="py-8 text-center">Загрузка...</div>
        ) : subsystems.length === 0 ? (
          <div className="py-8 text-center text-gray-500">Нет подсистем</div>
        ) : (
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left">Название</th>
                <th className="px-4 py-2 text-left">Код</th>
                <th className="px-4 py-2 text-left">Описание</th>
                <th className="px-4 py-2 text-right">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {subsystems.map((sub) => (
                <tr key={sub.id}>
                  <td className="px-4 py-2">{sub.name}</td>
                  <td className="px-4 py-2">{sub.code}</td>
                  <td className="px-4 py-2">{sub.description}</td>
                  <td className="px-4 py-2 text-right space-x-2">
                    <button
                      onClick={() => {
                        setEditingSubsystem(sub);
                        setShowAddForm(true);
                      }}
                      className="text-primary hover:text-primary/80"
                    >
                      Изменить
                    </button>
                    <button
                      onClick={() => handleDelete(sub.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Удалить
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {showAddForm && (
          <SubsystemForm
            systemId={system.id}
            subsystem={editingSubsystem}
            onClose={() => {
              setShowAddForm(false);
              setEditingSubsystem(null);
            }}
            onSave={() => {
              setShowAddForm(false);
              setEditingSubsystem(null);
              loadSubsystems();
            }}
          />
        )}
      </div>
    </div>
  );
}

function SubsystemForm({ systemId, subsystem, onClose, onSave }) {
  const [formData, setFormData] = useState({
    system_id: systemId,
    name: subsystem?.name || '',
    code: subsystem?.code || '',
    description: subsystem?.description || '',
    is_active: subsystem?.is_active ?? true,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (subsystem) {
        await subsystemsAPI.update(subsystem.id, formData);
        alert('Подсистема обновлена');
      } else {
        await subsystemsAPI.create(formData);
        alert('Подсистема создана');
      }
      onSave();
    } catch (error) {
      alert('Ошибка: ' + (error.response?.data?.detail || error.message));
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-xl font-bold mb-4">
          {subsystem ? 'Редактировать подсистему' : 'Новая подсистема'}
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Название *</label>
            <input
              type="text"
              required
              className="input"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Код *</label>
            <input
              type="text"
              required
              className="input"
              value={formData.code}
              onChange={(e) => setFormData({...formData, code: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Описание</label>
            <textarea
              className="input"
              rows="2"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
            />
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Отмена
            </button>
            <button type="submit" className="btn btn-primary">
              Сохранить
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ApprovalChainModal({ system, onClose }) {
  const [approvalChain, setApprovalChain] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newApprover, setNewApprover] = useState({ approver_id: '', approver_role: '' });

  useEffect(() => {
    loadApprovalChain();
    loadUsers();
  }, []);

  const loadApprovalChain = async () => {
    setLoading(true);
    try {
      const res = await approvalChainAPI.listBySystem(system.id);
      setApprovalChain(res.data);
    } catch (error) {
      console.error('Error loading approval chain:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const res = await usersAPI.list();
      setUsers(res.data);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const handleAdd = async () => {
    if (!newApprover.approver_id) {
      alert('Выберите утверждающего');
      return;
    }

    try {
      const nextStep = approvalChain.length + 1;
      await approvalChainAPI.create({
        system_id: system.id,
        step_number: nextStep,
        approver_id: parseInt(newApprover.approver_id),
        approver_role: newApprover.approver_role,
        is_required: true
      });
      setNewApprover({ approver_id: '', approver_role: '' });
      loadApprovalChain();
    } catch (error) {
      alert('Ошибка: ' + error.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Удалить этого утверждающего из цепочки?')) return;
    try {
      await approvalChainAPI.delete(id);
      loadApprovalChain();
    } catch (error) {
      alert('Ошибка: ' + error.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-screen overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">
            Цепочка согласования: {system.name}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
        </div>

        <div className="mb-6 bg-blue-50 border border-blue-200 rounded p-3">
          <p className="text-sm text-blue-800 flex items-center">
            <InfoIcon size={18} className="mr-2 flex-shrink-0" /> Заявки на доступ к этой системе будут проходить согласование в указанном порядке
          </p>
        </div>

        {loading ? (
          <div className="py-8 text-center">Загрузка...</div>
        ) : (
          <>
            {approvalChain.length === 0 ? (
              <div className="py-8 text-center text-gray-500">
                Нет настроенных утверждающих. Добавьте первого!
              </div>
            ) : (
              <div className="space-y-3 mb-6">
                {approvalChain.map((chain, index) => {
                  const user = users.find(u => u.id === chain.approver_id);
                  return (
                    <div key={chain.id} className="flex items-center justify-between bg-gray-50 p-3 rounded">
                      <div className="flex items-center space-x-3">
                        <div className="bg-primary text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">
                          {chain.step_number}
                        </div>
                        <div>
                          <p className="font-medium">{user?.full_name || 'Неизвестен'}</p>
                          <p className="text-sm text-gray-600">{chain.approver_role || 'Утверждающий'}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDelete(chain.id)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Удалить
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="border-t pt-4">
              <h3 className="font-semibold mb-3">Добавить утверждающего</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Пользователь *</label>
                  <select
                    className="input"
                    value={newApprover.approver_id}
                    onChange={(e) => setNewApprover({...newApprover, approver_id: e.target.value})}
                  >
                    <option value="">Выберите пользователя</option>
                    {users.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.full_name} ({user.email})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Роль (необязательно)</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="например: Менеджер"
                    value={newApprover.approver_role}
                    onChange={(e) => setNewApprover({...newApprover, approver_role: e.target.value})}
                  />
                </div>
              </div>
              <button
                onClick={handleAdd}
                className="btn btn-primary mt-3 w-full"
              >
                Добавить
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
