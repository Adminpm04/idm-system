import React, { useState } from 'react';
import { exportAPI } from '../services/api';
import { useLanguage } from '../App';

// Excel icon
const ExcelIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ filter: 'drop-shadow(1px 1px 2px rgba(0,0,0,0.15))' }}>
    <rect x="4" y="2" width="16" height="20" rx="2" fill="#16a34a" />
    <text x="12" y="15" textAnchor="middle" fill="white" fontSize="6" fontWeight="bold">XLS</text>
  </svg>
);

export default function ExportButton({ isAdmin = false }) {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);

  const downloadFile = (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const handleExport = async () => {
    setLoading(true);
    try {
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
      const response = await exportAPI.excel();
      downloadFile(response.data, `zajavki_${timestamp}.xlsx`);
    } catch (error) {
      console.error('Export error:', error);
      alert(t('exportError') + ': ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  // Only show for admins
  if (!isAdmin) return null;

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      className="btn btn-secondary flex items-center"
      title={t('exportToExcel')}
    >
      {loading ? (
        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
      ) : (
        <ExcelIcon size={20} />
      )}
      <span className="ml-2">{t('exportExcel')}</span>
    </button>
  );
}
