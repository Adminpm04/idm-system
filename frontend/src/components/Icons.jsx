import React from 'react';

// Base wrapper for 3D effect
const Icon3DWrapper = ({ children, className = '', size = 24, gradient }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`inline-block ${className}`}
    style={{ filter: 'drop-shadow(1px 2px 3px rgba(0,0,0,0.2))' }}
  >
    <defs>
      {gradient}
    </defs>
    {children}
  </svg>
);

// Computer/System icon - 3D style
export const SystemIcon = ({ size = 24, className = '' }) => (
  <Icon3DWrapper size={size} className={className} gradient={
    <>
      <linearGradient id="systemGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#60a5fa" />
        <stop offset="100%" stopColor="#3b82f6" />
      </linearGradient>
      <linearGradient id="screenGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#1e3a8a" />
        <stop offset="100%" stopColor="#1e40af" />
      </linearGradient>
    </>
  }>
    <rect x="2" y="3" width="20" height="14" rx="2" fill="url(#systemGrad)" />
    <rect x="4" y="5" width="16" height="10" rx="1" fill="url(#screenGrad)" />
    <path d="M8 19H16" stroke="#64748b" strokeWidth="2" strokeLinecap="round" />
    <path d="M12 17V19" stroke="#64748b" strokeWidth="2" />
    <circle cx="12" cy="10" r="2" fill="#22d3ee" opacity="0.8" />
  </Icon3DWrapper>
);

// Package/Subsystem icon - 3D style
export const SubsystemIcon = ({ size = 24, className = '' }) => (
  <Icon3DWrapper size={size} className={className} gradient={
    <>
      <linearGradient id="boxGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fbbf24" />
        <stop offset="100%" stopColor="#f59e0b" />
      </linearGradient>
      <linearGradient id="boxSide" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#d97706" />
        <stop offset="100%" stopColor="#b45309" />
      </linearGradient>
    </>
  }>
    <path d="M12 2L21 7V17L12 22L3 17V7L12 2Z" fill="url(#boxGrad)" />
    <path d="M12 12L21 7V17L12 22V12Z" fill="url(#boxSide)" opacity="0.6" />
    <path d="M12 2L21 7L12 12L3 7L12 2Z" fill="#fcd34d" />
    <path d="M12 12V22" stroke="#92400e" strokeWidth="1" opacity="0.5" />
    <path d="M12 12L3 7" stroke="#92400e" strokeWidth="1" opacity="0.3" />
    <path d="M12 12L21 7" stroke="#92400e" strokeWidth="1" opacity="0.3" />
  </Icon3DWrapper>
);

// User icon - 3D style
export const UserIcon = ({ size = 24, className = '' }) => (
  <Icon3DWrapper size={size} className={className} gradient={
    <>
      <linearGradient id="userGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#a78bfa" />
        <stop offset="100%" stopColor="#8b5cf6" />
      </linearGradient>
      <linearGradient id="faceGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#fde68a" />
        <stop offset="100%" stopColor="#fcd34d" />
      </linearGradient>
    </>
  }>
    <circle cx="12" cy="8" r="5" fill="url(#faceGrad)" />
    <path d="M20 21C20 16.5817 16.4183 13 12 13C7.58172 13 4 16.5817 4 21" fill="url(#userGrad)" />
    <circle cx="10" cy="7" r="0.8" fill="#374151" />
    <circle cx="14" cy="7" r="0.8" fill="#374151" />
    <path d="M10 10C10.5 10.5 11.5 11 12 11C12.5 11 13.5 10.5 14 10" stroke="#d97706" strokeWidth="0.8" fill="none" strokeLinecap="round" />
  </Icon3DWrapper>
);

// Key/Role icon - 3D style
export const RoleIcon = ({ size = 24, className = '' }) => (
  <Icon3DWrapper size={size} className={className} gradient={
    <>
      <linearGradient id="keyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fcd34d" />
        <stop offset="100%" stopColor="#f59e0b" />
      </linearGradient>
    </>
  }>
    <circle cx="8" cy="8" r="5" fill="url(#keyGrad)" stroke="#d97706" strokeWidth="1" />
    <circle cx="8" cy="8" r="2" fill="#92400e" />
    <path d="M12 10L20 18" stroke="url(#keyGrad)" strokeWidth="3" strokeLinecap="round" />
    <path d="M17 15L20 18L17 21" stroke="url(#keyGrad)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M15 17L17 19" stroke="url(#keyGrad)" strokeWidth="2" strokeLinecap="round" />
  </Icon3DWrapper>
);

// Document/Request icon - 3D style
export const RequestIcon = ({ size = 24, className = '' }) => (
  <Icon3DWrapper size={size} className={className} gradient={
    <>
      <linearGradient id="docGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#f0fdfa" />
        <stop offset="100%" stopColor="#ccfbf1" />
      </linearGradient>
      <linearGradient id="docFold" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#5eead4" />
        <stop offset="100%" stopColor="#14b8a6" />
      </linearGradient>
    </>
  }>
    <path d="M6 2H14L20 8V20C20 21.1 19.1 22 18 22H6C4.9 22 4 21.1 4 20V4C4 2.9 4.9 2 6 2Z" fill="url(#docGrad)" stroke="#14b8a6" strokeWidth="1" />
    <path d="M14 2L14 8H20" fill="url(#docFold)" />
    <path d="M14 2V8H20L14 2Z" fill="url(#docFold)" />
    <path d="M8 12H16" stroke="#0d9488" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M8 15H14" stroke="#0d9488" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M8 18H12" stroke="#0d9488" strokeWidth="1.5" strokeLinecap="round" />
  </Icon3DWrapper>
);

// Chart/Statistics icon - 3D style
export const StatsIcon = ({ size = 24, className = '' }) => (
  <Icon3DWrapper size={size} className={className} gradient={
    <>
      <linearGradient id="bar1" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#34d399" />
        <stop offset="100%" stopColor="#10b981" />
      </linearGradient>
      <linearGradient id="bar2" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#60a5fa" />
        <stop offset="100%" stopColor="#3b82f6" />
      </linearGradient>
      <linearGradient id="bar3" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#f472b6" />
        <stop offset="100%" stopColor="#ec4899" />
      </linearGradient>
    </>
  }>
    <rect x="3" y="3" width="18" height="18" rx="2" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1" />
    <rect x="5" y="12" width="4" height="7" rx="1" fill="url(#bar1)" />
    <rect x="10" y="8" width="4" height="11" rx="1" fill="url(#bar2)" />
    <rect x="15" y="5" width="4" height="14" rx="1" fill="url(#bar3)" />
  </Icon3DWrapper>
);

// Search icon - 3D style
export const SearchIcon = ({ size = 24, className = '' }) => (
  <Icon3DWrapper size={size} className={className} gradient={
    <>
      <linearGradient id="searchGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#a5b4fc" />
        <stop offset="100%" stopColor="#6366f1" />
      </linearGradient>
      <linearGradient id="glassGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#e0e7ff" />
        <stop offset="100%" stopColor="#c7d2fe" />
      </linearGradient>
    </>
  }>
    <circle cx="10" cy="10" r="7" fill="url(#glassGrad)" stroke="url(#searchGrad)" strokeWidth="2" />
    <circle cx="10" cy="10" r="4" fill="none" stroke="#818cf8" strokeWidth="1" opacity="0.5" />
    <path d="M15 15L21 21" stroke="url(#searchGrad)" strokeWidth="3" strokeLinecap="round" />
    <ellipse cx="8" cy="8" rx="2" ry="1" fill="white" opacity="0.6" transform="rotate(-45 8 8)" />
  </Icon3DWrapper>
);

// Checkmark icon - 3D style
export const CheckIcon = ({ size = 24, className = '' }) => (
  <Icon3DWrapper size={size} className={className} gradient={
    <>
      <linearGradient id="checkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#4ade80" />
        <stop offset="100%" stopColor="#22c55e" />
      </linearGradient>
    </>
  }>
    <circle cx="12" cy="12" r="10" fill="url(#checkGrad)" />
    <circle cx="12" cy="12" r="10" fill="none" stroke="#16a34a" strokeWidth="1" />
    <path d="M7 12L10.5 15.5L17 9" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <ellipse cx="8" cy="8" rx="3" ry="2" fill="white" opacity="0.3" transform="rotate(-30 8 8)" />
  </Icon3DWrapper>
);

// Cross/Reject icon - 3D style
export const CrossIcon = ({ size = 24, className = '' }) => (
  <Icon3DWrapper size={size} className={className} gradient={
    <>
      <linearGradient id="crossGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#f87171" />
        <stop offset="100%" stopColor="#ef4444" />
      </linearGradient>
    </>
  }>
    <circle cx="12" cy="12" r="10" fill="url(#crossGrad)" />
    <circle cx="12" cy="12" r="10" fill="none" stroke="#dc2626" strokeWidth="1" />
    <path d="M8 8L16 16M16 8L8 16" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
    <ellipse cx="8" cy="8" rx="3" ry="2" fill="white" opacity="0.3" transform="rotate(-30 8 8)" />
  </Icon3DWrapper>
);

// Hourglass/Pending icon - 3D style
export const PendingIcon = ({ size = 24, className = '' }) => (
  <Icon3DWrapper size={size} className={className} gradient={
    <>
      <linearGradient id="hourGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fbbf24" />
        <stop offset="100%" stopColor="#f59e0b" />
      </linearGradient>
      <linearGradient id="sandGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#fde68a" />
        <stop offset="100%" stopColor="#fcd34d" />
      </linearGradient>
    </>
  }>
    <circle cx="12" cy="12" r="10" fill="url(#hourGrad)" />
    <circle cx="12" cy="12" r="10" fill="none" stroke="#d97706" strokeWidth="1" />
    <path d="M8 6H16V8L12 12L8 8V6Z" fill="url(#sandGrad)" />
    <path d="M8 18H16V16L12 12L8 16V18Z" fill="url(#sandGrad)" />
    <rect x="8" y="6" width="8" height="1" fill="#92400e" opacity="0.3" />
    <rect x="8" y="17" width="8" height="1" fill="#92400e" opacity="0.3" />
    <ellipse cx="9" cy="8" rx="2" ry="1" fill="white" opacity="0.4" />
  </Icon3DWrapper>
);

// Link icon - 3D style
export const LinkIcon = ({ size = 24, className = '' }) => (
  <Icon3DWrapper size={size} className={className} gradient={
    <>
      <linearGradient id="linkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#38bdf8" />
        <stop offset="100%" stopColor="#0ea5e9" />
      </linearGradient>
    </>
  }>
    <path d="M10 14C10.5304 14.5304 11.2069 14.9004 11.9497 15.0694C12.6925 15.2383 13.4695 15.1989 14.1909 14.9557C14.9123 14.7125 15.5481 14.2756 16.0245 13.6964C16.501 13.1172 16.7987 12.4192 16.882 11.6807C16.9653 10.9423 16.8306 10.195 16.494 9.52862C16.1573 8.86229 15.6332 8.30556 14.9851 7.92543C14.337 7.5453 13.5933 7.35848 12.8465 7.38813C12.0998 7.41778 11.3826 7.66278 10.78 8.09L9.22 9.91" stroke="url(#linkGrad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    <path d="M14 10C13.4696 9.46965 12.7931 9.09971 12.0503 8.93076C11.3075 8.76181 10.5305 8.80117 9.80911 9.04436C9.08773 9.28755 8.45193 9.72446 7.97548 10.3036C7.49903 10.8828 7.20128 11.5808 7.11801 12.3193C7.03473 13.0577 7.16938 13.805 7.50602 14.4714C7.84265 15.1377 8.36678 15.6944 9.01489 16.0746C9.663 16.4547 10.4067 16.6415 11.1535 16.6119C11.9002 16.5822 12.6174 16.3372 13.22 15.91L14.78 14.09" stroke="url(#linkGrad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </Icon3DWrapper>
);

// Info icon - 3D style
export const InfoIcon = ({ size = 24, className = '' }) => (
  <Icon3DWrapper size={size} className={className} gradient={
    <>
      <linearGradient id="infoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#60a5fa" />
        <stop offset="100%" stopColor="#3b82f6" />
      </linearGradient>
    </>
  }>
    <circle cx="12" cy="12" r="10" fill="url(#infoGrad)" />
    <circle cx="12" cy="12" r="10" fill="none" stroke="#2563eb" strokeWidth="1" />
    <circle cx="12" cy="7" r="1.5" fill="white" />
    <path d="M12 11V17" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
    <ellipse cx="8" cy="8" rx="3" ry="2" fill="white" opacity="0.3" transform="rotate(-30 8 8)" />
  </Icon3DWrapper>
);

// Warning icon - 3D style
export const WarningIcon = ({ size = 24, className = '' }) => (
  <Icon3DWrapper size={size} className={className} gradient={
    <>
      <linearGradient id="warnGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fbbf24" />
        <stop offset="100%" stopColor="#f59e0b" />
      </linearGradient>
    </>
  }>
    <path d="M12 2L22 20H2L12 2Z" fill="url(#warnGrad)" stroke="#d97706" strokeWidth="1" strokeLinejoin="round" />
    <circle cx="12" cy="16" r="1.2" fill="#92400e" />
    <path d="M12 8V13" stroke="#92400e" strokeWidth="2" strokeLinecap="round" />
    <path d="M5 18L12 5L19 18" fill="none" stroke="#fde68a" strokeWidth="0.5" opacity="0.5" />
  </Icon3DWrapper>
);

// Clock/Time icon - 3D style
export const ClockIcon = ({ size = 24, className = '' }) => (
  <Icon3DWrapper size={size} className={className} gradient={
    <>
      <linearGradient id="clockGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fb923c" />
        <stop offset="100%" stopColor="#f97316" />
      </linearGradient>
      <linearGradient id="clockFace" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#fff7ed" />
        <stop offset="100%" stopColor="#ffedd5" />
      </linearGradient>
    </>
  }>
    <circle cx="12" cy="12" r="10" fill="url(#clockGrad)" />
    <circle cx="12" cy="12" r="8" fill="url(#clockFace)" />
    <circle cx="12" cy="12" r="1" fill="#c2410c" />
    <path d="M12 6V12L15 15" stroke="#c2410c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <ellipse cx="8" cy="8" rx="2" ry="1" fill="white" opacity="0.5" />
  </Icon3DWrapper>
);

// Plus/Add icon - 3D style
export const PlusIcon = ({ size = 24, className = '' }) => (
  <Icon3DWrapper size={size} className={className} gradient={
    <>
      <linearGradient id="plusGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#4ade80" />
        <stop offset="100%" stopColor="#22c55e" />
      </linearGradient>
    </>
  }>
    <circle cx="12" cy="12" r="10" fill="url(#plusGrad)" />
    <circle cx="12" cy="12" r="10" fill="none" stroke="#16a34a" strokeWidth="1" />
    <path d="M12 7V17M7 12H17" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
    <ellipse cx="8" cy="8" rx="3" ry="2" fill="white" opacity="0.3" transform="rotate(-30 8 8)" />
  </Icon3DWrapper>
);

// Home/Dashboard icon - 3D style
export const HomeIcon = ({ size = 24, className = '' }) => (
  <Icon3DWrapper size={size} className={className} gradient={
    <>
      <linearGradient id="homeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#a78bfa" />
        <stop offset="100%" stopColor="#8b5cf6" />
      </linearGradient>
      <linearGradient id="roofGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#c4b5fd" />
        <stop offset="100%" stopColor="#a78bfa" />
      </linearGradient>
    </>
  }>
    <path d="M3 12L12 4L21 12" fill="url(#roofGrad)" stroke="#7c3aed" strokeWidth="1" />
    <path d="M5 10V20H19V10" fill="url(#homeGrad)" stroke="#7c3aed" strokeWidth="1" />
    <rect x="10" y="14" width="4" height="6" fill="#ede9fe" stroke="#7c3aed" strokeWidth="0.5" />
    <rect x="7" y="12" width="3" height="3" fill="#c4b5fd" stroke="#7c3aed" strokeWidth="0.5" />
    <rect x="14" y="12" width="3" height="3" fill="#c4b5fd" stroke="#7c3aed" strokeWidth="0.5" />
  </Icon3DWrapper>
);

// Admin/Settings icon - 3D style
export const AdminIcon = ({ size = 24, className = '' }) => (
  <Icon3DWrapper size={size} className={className} gradient={
    <>
      <linearGradient id="gearGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#94a3b8" />
        <stop offset="100%" stopColor="#64748b" />
      </linearGradient>
    </>
  }>
    <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" fill="url(#gearGrad)" />
    <path d="M19.4 15C19.2669 15.3016 19.2272 15.6362 19.286 15.9606C19.3448 16.285 19.4995 16.5843 19.73 16.82L19.79 16.88C19.976 17.0657 20.1235 17.2863 20.2241 17.5291C20.3248 17.7719 20.3766 18.0322 20.3766 18.295C20.3766 18.5578 20.3248 18.8181 20.2241 19.0609C20.1235 19.3037 19.976 19.5243 19.79 19.71C19.6043 19.896 19.3837 20.0435 19.1409 20.1441C18.8981 20.2448 18.6378 20.2966 18.375 20.2966C18.1122 20.2966 17.8519 20.2448 17.6091 20.1441C17.3663 20.0435 17.1457 19.896 16.96 19.71L16.9 19.65C16.6643 19.4195 16.365 19.2648 16.0406 19.206C15.7162 19.1472 15.3816 19.1869 15.08 19.32C14.7842 19.4468 14.532 19.6572 14.3543 19.9255C14.1766 20.1938 14.0813 20.5082 14.08 20.83V21C14.08 21.5304 13.8693 22.0391 13.4942 22.4142C13.1191 22.7893 12.6104 23 12.08 23C11.5496 23 11.0409 22.7893 10.6658 22.4142C10.2907 22.0391 10.08 21.5304 10.08 21V20.91C10.0723 20.579 9.96512 20.258 9.77251 19.9887C9.5799 19.7194 9.31074 19.5143 9 19.4C8.69838 19.2669 8.36381 19.2272 8.03941 19.286C7.71502 19.3448 7.41568 19.4995 7.18 19.73L7.12 19.79C6.93425 19.976 6.71368 20.1235 6.47088 20.2241C6.22808 20.3248 5.96783 20.3766 5.705 20.3766C5.44217 20.3766 5.18192 20.3248 4.93912 20.2241C4.69632 20.1235 4.47575 19.976 4.29 19.79C4.10405 19.6043 3.95653 19.3837 3.85588 19.1409C3.75523 18.8981 3.70343 18.6378 3.70343 18.375C3.70343 18.1122 3.75523 17.8519 3.85588 17.6091C3.95653 17.3663 4.10405 17.1457 4.29 16.96L4.35 16.9C4.58054 16.6643 4.73519 16.365 4.794 16.0406C4.85282 15.7162 4.81312 15.3816 4.68 15.08C4.55324 14.7842 4.34276 14.532 4.07447 14.3543C3.80618 14.1766 3.49179 14.0813 3.17 14.08H3C2.46957 14.08 1.96086 13.8693 1.58579 13.4942C1.21071 13.1191 1 12.6104 1 12.08C1 11.5496 1.21071 11.0409 1.58579 10.6658C1.96086 10.2907 2.46957 10.08 3 10.08H3.09C3.42099 10.0723 3.742 9.96512 4.0113 9.77251C4.28059 9.5799 4.48572 9.31074 4.6 9C4.73312 8.69838 4.77282 8.36381 4.714 8.03941C4.65519 7.71502 4.50054 7.41568 4.27 7.18L4.21 7.12C4.02405 6.93425 3.87653 6.71368 3.77588 6.47088C3.67523 6.22808 3.62343 5.96783 3.62343 5.705C3.62343 5.44217 3.67523 5.18192 3.77588 4.93912C3.87653 4.69632 4.02405 4.47575 4.21 4.29C4.39575 4.10405 4.61632 3.95653 4.85912 3.85588C5.10192 3.75523 5.36217 3.70343 5.625 3.70343C5.88783 3.70343 6.14808 3.75523 6.39088 3.85588C6.63368 3.95653 6.85425 4.10405 7.04 4.29L7.1 4.35C7.33568 4.58054 7.63502 4.73519 7.95941 4.794C8.28381 4.85282 8.61838 4.81312 8.92 4.68H9C9.29577 4.55324 9.54802 4.34276 9.72569 4.07447C9.90337 3.80618 9.99872 3.49179 10 3.17V3C10 2.46957 10.2107 1.96086 10.5858 1.58579C10.9609 1.21071 11.4696 1 12 1C12.5304 1 13.0391 1.21071 13.4142 1.58579C13.7893 1.96086 14 2.46957 14 3V3.09C14.0013 3.41179 14.0966 3.72618 14.2743 3.99447C14.452 4.26276 14.7042 4.47324 15 4.6C15.3016 4.73312 15.6362 4.77282 15.9606 4.714C16.285 4.65519 16.5843 4.50054 16.82 4.27L16.88 4.21C17.0657 4.02405 17.2863 3.87653 17.5291 3.77588C17.7719 3.67523 18.0322 3.62343 18.295 3.62343C18.5578 3.62343 18.8181 3.67523 19.0609 3.77588C19.3037 3.87653 19.5243 4.02405 19.71 4.21C19.896 4.39575 20.0435 4.61632 20.1441 4.85912C20.2448 5.10192 20.2966 5.36217 20.2966 5.625C20.2966 5.88783 20.2448 6.14808 20.1441 6.39088C20.0435 6.63368 19.896 6.85425 19.71 7.04L19.65 7.1C19.4195 7.33568 19.2648 7.63502 19.206 7.95941C19.1472 8.28381 19.1869 8.61838 19.32 8.92V9C19.4468 9.29577 19.6572 9.54802 19.9255 9.72569C20.1938 9.90337 20.5082 9.99872 20.83 10H21C21.5304 10 22.0391 10.2107 22.4142 10.5858C22.7893 10.9609 23 11.4696 23 12C23 12.5304 22.7893 13.0391 22.4142 13.4142C22.0391 13.7893 21.5304 14 21 14H20.91C20.5882 14.0013 20.2738 14.0966 20.0055 14.2743C19.7372 14.452 19.5268 14.7042 19.4 15Z" fill="url(#gearGrad)" stroke="#475569" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
  </Icon3DWrapper>
);

// Arrow back icon - 3D style
export const ArrowBackIcon = ({ size = 24, className = '' }) => (
  <Icon3DWrapper size={size} className={className} gradient={
    <>
      <linearGradient id="arrowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#6366f1" />
        <stop offset="100%" stopColor="#4f46e5" />
      </linearGradient>
    </>
  }>
    <circle cx="12" cy="12" r="10" fill="url(#arrowGrad)" opacity="0.1" />
    <path d="M19 12H5M5 12L12 5M5 12L12 19" stroke="url(#arrowGrad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </Icon3DWrapper>
);

// Neutral/Unknown status icon
export const NeutralIcon = ({ size = 24, className = '' }) => (
  <Icon3DWrapper size={size} className={className} gradient={
    <>
      <linearGradient id="neutralGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#e2e8f0" />
        <stop offset="100%" stopColor="#cbd5e1" />
      </linearGradient>
    </>
  }>
    <circle cx="12" cy="12" r="10" fill="url(#neutralGrad)" stroke="#94a3b8" strokeWidth="1" />
    <circle cx="12" cy="12" r="4" fill="#94a3b8" />
  </Icon3DWrapper>
);

// Export all icons as named exports for easy import
export const Icons = {
  System: SystemIcon,
  Subsystem: SubsystemIcon,
  User: UserIcon,
  Role: RoleIcon,
  Request: RequestIcon,
  Stats: StatsIcon,
  Search: SearchIcon,
  Check: CheckIcon,
  Cross: CrossIcon,
  Pending: PendingIcon,
  Link: LinkIcon,
  Info: InfoIcon,
  Warning: WarningIcon,
  Clock: ClockIcon,
  Plus: PlusIcon,
  Home: HomeIcon,
  Admin: AdminIcon,
  ArrowBack: ArrowBackIcon,
  Neutral: NeutralIcon,
};

export default Icons;
