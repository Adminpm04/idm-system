import React, { useState, useRef, useEffect } from 'react';
import { exportAPI } from '../services/api';
import { useLanguage } from '../App';

// 3D Export icon
const ExportIcon = ({ size = 24 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ filter: 'drop-shadow(1px 2px 3px rgba(0,0,0,0.2))' }}
  >
    <defs>
      <linearGradient id="exportGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#34d399" />
        <stop offset="100%" stopColor="#10b981" />
      </linearGradient>
    </defs>
    <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" stroke="url(#exportGrad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M7 10L12 15L17 10" stroke="url(#exportGrad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 15V3" stroke="url(#exportGrad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// File type icons
const PdfIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ filter: 'drop-shadow(1px 1px 2px rgba(0,0,0,0.15))' }}>
    <rect x="4" y="2" width="16" height="20" rx="2" fill="#ef4444" />
    <text x="12" y="15" textAnchor="middle" fill="white" fontSize="7" fontWeight="bold">PDF</text>
  </svg>
);

const WordIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ filter: 'drop-shadow(1px 1px 2px rgba(0,0,0,0.15))' }}>
    <rect x="4" y="2" width="16" height="20" rx="2" fill="#2563eb" />
    <text x="12" y="15" textAnchor="middle" fill="white" fontSize="6" fontWeight="bold">DOC</text>
  </svg>
);

const ExcelIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ filter: 'drop-shadow(1px 1px 2px rgba(0,0,0,0.15))' }}>
    <rect x="4" y="2" width="16" height="20" rx="2" fill="#16a34a" />
    <text x="12" y="15" textAnchor="middle" fill="white" fontSize="6" fontWeight="bold">XLS</text>
  </svg>
);

export default function ExportButton({ isAdmin = false }) {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const handleExport = async (format) => {
    setLoading(format);
    try {
      let response;
      let filename;
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');

      switch (format) {
        case 'pdf':
          response = await exportAPI.pdf();
          filename = `idm_requests_${timestamp}.pdf`;
          break;
        case 'word':
          response = await exportAPI.word();
          filename = `idm_requests_${timestamp}.docx`;
          break;
        case 'excel':
          response = await exportAPI.excel();
          filename = `idm_requests_${timestamp}.xlsx`;
          break;
        default:
          return;
      }

      downloadFile(response.data, filename);
      setIsOpen(false);
    } catch (error) {
      console.error('Export error:', error);
      alert('Export error: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(null);
    }
  };

  // Only show for admins
  if (!isAdmin) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="btn btn-secondary flex items-center"
        disabled={loading}
      >
        <ExportIcon size={20} />
        <span className="ml-2">{t('export')}</span>
        <svg
          className={`ml-2 w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
          <div className="py-1">
            <div className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-700">
              {t('selectFormat')}
            </div>

            <button
              onClick={() => handleExport('pdf')}
              disabled={loading}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center space-x-3 disabled:opacity-50"
            >
              <PdfIcon />
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">PDF</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t('pdfSummary')}</p>
              </div>
              {loading === 'pdf' && (
                <div className="ml-auto w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              )}
            </button>

            <button
              onClick={() => handleExport('word')}
              disabled={loading}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center space-x-3 disabled:opacity-50"
            >
              <WordIcon />
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">Word</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t('wordDetailed')}</p>
              </div>
              {loading === 'word' && (
                <div className="ml-auto w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              )}
            </button>

            <button
              onClick={() => handleExport('excel')}
              disabled={loading}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center space-x-3 disabled:opacity-50"
            >
              <ExcelIcon />
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">Excel</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t('excelFull')}</p>
              </div>
              {loading === 'excel' && (
                <div className="ml-auto w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              )}
            </button>
          </div>

          <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/30 border-t border-gray-200 dark:border-gray-700 text-xs text-blue-700 dark:text-blue-300">
            {t('exportsAllRequests')}
          </div>
        </div>
      )}
    </div>
  );
}
