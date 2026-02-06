import { useState, useEffect } from 'react';
import { systemsAPI, subsystemsAPI, approvalChainAPI, usersAPI } from '../services/api';
import { InfoIcon, PlusIcon } from '../components/Icons';
import { useLanguage } from '../App';

// Criticality level badge component
function CriticalityBadge({ level, t }) {
  const config = {
    low: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-800 dark:text-green-300', label: t('criticalityLow') },
    medium: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-800 dark:text-yellow-300', label: t('criticalityMedium') },
    high: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-800 dark:text-orange-300', label: t('criticalityHigh') },
    critical: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-800 dark:text-red-300', label: t('criticalityCritical') },
  };
  const c = config[level] || config.medium;
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  );
}

export default function AdminSystems() {
  const { t } = useLanguage();
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
      alert(t('errorLoadingSystems') || 'Error loading systems');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm(t('confirmDeleteSystem'))) return;

    try {
      await systemsAPI.delete(id);
      alert(t('systemDeleted'));
      loadSystems();
    } catch (error) {
      alert(t('errorDeleting') + ': ' + (error.response?.data?.detail || error.message));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-primary dark:text-blue-400">{t('systemManagement')}</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">{t('addEditSystems')}</p>
        </div>
        <button
          onClick={() => {
            setEditingSystem(null);
            setShowModal(true);
          }}
          className="btn btn-primary flex items-center"
        >
          <PlusIcon size={18} className="mr-2" /> {t('addSystem')}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12 text-gray-600 dark:text-gray-400">{t('loading')}</div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">{t('name')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">{t('code')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">{t('criticality')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">{t('description')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">{t('status') || 'Status'}</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {systems.map((system) => (
                  <tr key={system.id}>
                    <td className="px-6 py-4 font-medium dark:text-gray-100">{system.name}</td>
                    <td className="px-6 py-4 dark:text-gray-300">{system.code}</td>
                    <td className="px-6 py-4">
                      <CriticalityBadge level={system.criticality_level} t={t} />
                    </td>
                    <td className="px-6 py-4 dark:text-gray-300">{system.description}</td>
                    <td className="px-6 py-4">
                      {system.is_active ? (
                        <span className="badge badge-success">{t('active')}</span>
                      ) : (
                        <span className="badge badge-secondary">{t('inactive')}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => {
                          setSelectedSystem(system);
                          setShowSubsystemsModal(true);
                        }}
                        className="bg-secondary text-primary hover:opacity-80 px-3 py-1 rounded text-sm font-medium"
                      >
                        {t('subsystems')}
                      </button>
                      <button
                        onClick={() => {
                          setSelectedSystem(system);
                          setShowApprovalModal(true);
                        }}
                        className="bg-primary text-white hover:opacity-80 px-3 py-1 rounded text-sm font-medium"
                      >
                        {t('approvers')}
                      </button>
                      <button
                        onClick={() => {
                          setEditingSystem(system);
                          setShowModal(true);
                        }}
                        className="text-primary dark:text-blue-400 hover:text-primary/80 dark:hover:text-blue-300"
                      >
                        {t('edit')}
                      </button>
                      <button
                        onClick={() => handleDelete(system.id)}
                        className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                      >
                        {t('delete')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    name: system?.name || '',
    code: system?.code || '',
    description: system?.description || '',
    criticality_level: system?.criticality_level || 'medium',
    url: system?.url || '',
    is_active: system?.is_active ?? true,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (system) {
        await systemsAPI.update(system.id, formData);
        alert(t('systemUpdated'));
      } else {
        await systemsAPI.create(formData);
        alert(t('systemCreated'));
      }
      onSave();
    } catch (error) {
      alert(t('error') + ': ' + (error.response?.data?.detail || error.message));
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-2xl font-bold mb-4 dark:text-gray-100">
          {system ? t('editSystem') : t('newSystem')}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t('name')} *</label>
            <input
              type="text"
              required
              className="input"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t('code')} *</label>
            <input
              type="text"
              required
              className="input"
              value={formData.code}
              onChange={(e) => setFormData({...formData, code: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t('description')}</label>
            <textarea
              className="input"
              rows="3"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t('criticality')} *</label>
            <select
              className="input"
              value={formData.criticality_level}
              onChange={(e) => setFormData({...formData, criticality_level: e.target.value})}
            >
              <option value="low">{t('criticalityLow')}</option>
              <option value="medium">{t('criticalityMedium')}</option>
              <option value="high">{t('criticalityHigh')}</option>
              <option value="critical">{t('criticalityCritical')}</option>
            </select>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('criticalityHint')}</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t('url')}</label>
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
              <span className="text-sm dark:text-gray-300">{t('active')}</span>
            </label>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              {t('cancel')}
            </button>
            <button type="submit" className="btn btn-primary">
              {t('save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SubsystemsModal({ system, onClose }) {
  const { t } = useLanguage();
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
    if (!confirm(t('deleteSubsystem'))) return;
    try {
      await subsystemsAPI.delete(id);
      loadSubsystems();
    } catch (error) {
      alert(t('error') + ': ' + error.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-3xl w-full mx-4 max-h-screen overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold dark:text-gray-100">
            {t('subsystems')}: {system.name}
          </h2>
          <button onClick={onClose} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-2xl">&times;</button>
        </div>

        <button
          onClick={() => {
            setEditingSubsystem(null);
            setShowAddForm(true);
          }}
          className="btn btn-primary mb-4"
        >
          {t('addSubsystem')}
        </button>

        {loading ? (
          <div className="py-8 text-center text-gray-600 dark:text-gray-400">{t('loading')}</div>
        ) : subsystems.length === 0 ? (
          <div className="py-8 text-center text-gray-500 dark:text-gray-400">{t('noSubsystems')}</div>
        ) : (
          <table className="min-w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-2 text-left text-gray-500 dark:text-gray-300">{t('name')}</th>
                <th className="px-4 py-2 text-left text-gray-500 dark:text-gray-300">{t('code')}</th>
                <th className="px-4 py-2 text-left text-gray-500 dark:text-gray-300">{t('description')}</th>
                <th className="px-4 py-2 text-right text-gray-500 dark:text-gray-300">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {subsystems.map((sub) => (
                <tr key={sub.id}>
                  <td className="px-4 py-2 dark:text-gray-100">{sub.name}</td>
                  <td className="px-4 py-2 dark:text-gray-300">{sub.code}</td>
                  <td className="px-4 py-2 dark:text-gray-300">{sub.description}</td>
                  <td className="px-4 py-2 text-right space-x-2">
                    <button
                      onClick={() => {
                        setEditingSubsystem(sub);
                        setShowAddForm(true);
                      }}
                      className="text-primary dark:text-blue-400 hover:text-primary/80"
                    >
                      {t('edit')}
                    </button>
                    <button
                      onClick={() => handleDelete(sub.id)}
                      className="text-red-600 dark:text-red-400 hover:text-red-800"
                    >
                      {t('delete')}
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
  const { t } = useLanguage();
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
        alert(t('subsystemUpdated'));
      } else {
        await subsystemsAPI.create(formData);
        alert(t('subsystemCreated'));
      }
      onSave();
    } catch (error) {
      alert(t('error') + ': ' + (error.response?.data?.detail || error.message));
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-xl font-bold mb-4 dark:text-gray-100">
          {subsystem ? t('editSubsystem') : t('newSubsystem')}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t('name')} *</label>
            <input
              type="text"
              required
              className="input"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t('code')} *</label>
            <input
              type="text"
              required
              className="input"
              value={formData.code}
              onChange={(e) => setFormData({...formData, code: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t('description')}</label>
            <textarea
              className="input"
              rows="2"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
            />
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              {t('cancel')}
            </button>
            <button type="submit" className="btn btn-primary">
              {t('save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ApprovalChainModal({ system, onClose }) {
  const { t } = useLanguage();
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
      alert(t('selectUser'));
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
      alert(t('error') + ': ' + error.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm(t('removeApprover'))) return;
    try {
      await approvalChainAPI.delete(id);
      loadApprovalChain();
    } catch (error) {
      alert(t('error') + ': ' + error.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-screen overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold dark:text-gray-100">
            {t('approvalChain')}: {system.name}
          </h2>
          <button onClick={onClose} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-2xl">&times;</button>
        </div>

        <div className="mb-6 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded p-3">
          <p className="text-sm text-blue-800 dark:text-blue-300 flex items-center">
            <InfoIcon size={18} className="mr-2 flex-shrink-0" /> {t('approvalChainDesc')}
          </p>
        </div>

        {loading ? (
          <div className="py-8 text-center text-gray-600 dark:text-gray-400">{t('loading')}</div>
        ) : (
          <>
            {approvalChain.length === 0 ? (
              <div className="py-8 text-center text-gray-500 dark:text-gray-400">
                {t('noApproversConfigured')}
              </div>
            ) : (
              <div className="space-y-3 mb-6">
                {approvalChain.map((chain) => {
                  const user = users.find(u => u.id === chain.approver_id);
                  return (
                    <div key={chain.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-3 rounded">
                      <div className="flex items-center space-x-3">
                        <div className="bg-primary text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">
                          {chain.step_number}
                        </div>
                        <div>
                          <p className="font-medium dark:text-gray-100">{user?.full_name || t('unknown')}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{chain.approver_role || t('approver')}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDelete(chain.id)}
                        className="text-red-600 dark:text-red-400 hover:text-red-800 text-sm"
                      >
                        {t('delete')}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <h3 className="font-semibold mb-3 dark:text-gray-100">{t('addApprover')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t('user')} *</label>
                  <select
                    className="input"
                    value={newApprover.approver_id}
                    onChange={(e) => setNewApprover({...newApprover, approver_id: e.target.value})}
                  >
                    <option value="">{t('selectUser')}</option>
                    {users.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.full_name} ({user.email})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t('roleOptional')}</label>
                  <input
                    type="text"
                    className="input"
                    placeholder={t('roleExample')}
                    value={newApprover.approver_role}
                    onChange={(e) => setNewApprover({...newApprover, approver_role: e.target.value})}
                  />
                </div>
              </div>
              <button
                onClick={handleAdd}
                className="btn btn-primary mt-3 w-full"
              >
                {t('add')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
