import React, { useState, useEffect, useCallback, createContext, useContext, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../App';

// Tour Context
const TourContext = createContext(null);
export const useTour = () => useContext(TourContext);

// Storage keys
const STORAGE = {
  status: (id) => `idm_tour_v3_${id}`,
  progress: (id) => `idm_tour_progress_v3_${id}`,
  lang: (id) => `idm_tour_lang_${id}`,
};

// Tour Provider
export function TourProvider({ children, user }) {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  const [isActive, setIsActive] = useState(false);
  const [step, setStep] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const [targetRect, setTargetRect] = useState(null);
  const [targetReady, setTargetReady] = useState(false);

  const targetRef = useRef(null);
  const resizeObserver = useRef(null);

  // Role detection
  const role = useMemo(() => ({
    isAdmin: user?.is_superuser || user?.is_demo,
    isManager: user?.roles?.some(r =>
      /manager|approver|менеджер|согласующий/i.test(r.name)
    ) || user?.is_superuser,
  }), [user]);

  // Tour steps
  const steps = useMemo(() => {
    const base = [
      {
        id: 'welcome',
        path: '/',
        target: null,
        title: t('tourStepWelcome'),
        description: t('tourStepWelcomeDesc'),
        icon: '👋',
      },
      {
        id: 'create-request',
        path: '/',
        target: '[data-tour="new-request"]',
        title: t('tourStepCreateBtn'),
        description: t('tourStepCreateBtnDesc'),
        icon: '➕',
        action: 'click',
        nextPath: '/create-request',
      },
      {
        id: 'user-search',
        path: '/create-request',
        target: '[data-tour="user-search"]',
        title: t('tourStepSelectUser'),
        description: t('tourStepSelectUserDesc'),
        icon: '👤',
      },
      {
        id: 'system-select',
        path: '/create-request',
        target: '[data-tour="system-select"]',
        title: t('tourStepSelectSystem'),
        description: t('tourStepSelectSystemDesc'),
        icon: '🖥️',
      },
      {
        id: 'role-select',
        path: '/create-request',
        target: '[data-tour="role-select"]',
        title: t('tourStepSelectRole'),
        description: t('tourStepSelectRoleDesc'),
        icon: '🔑',
      },
      {
        id: 'justification',
        path: '/create-request',
        target: '[data-tour="justification"]',
        title: t('tourStepJustification'),
        description: t('tourStepJustificationDesc'),
        icon: '📝',
      },
      {
        id: 'my-requests',
        path: '/',
        target: '[data-tour="my-requests"]',
        title: t('tourStepMyRequests'),
        description: t('tourStepMyRequestsDesc'),
        icon: '📋',
      },
    ];

    const manager = [
      {
        id: 'approvals',
        path: '/',
        target: '[data-tour="pending-approvals"]',
        title: t('tourStepApprovals'),
        description: t('tourStepApprovalsDesc'),
        icon: '✅',
        action: 'click',
        nextPath: '/my-approvals',
      },
    ];

    const admin = [
      {
        id: 'admin',
        path: '/',
        target: '[data-tour="admin-link"]',
        title: t('tourStepAdmin'),
        description: t('tourStepAdminDesc'),
        icon: '⚙️',
        action: 'click',
        nextPath: '/admin',
      },
      {
        id: 'admin-users',
        path: '/admin',
        target: '[data-tour="admin-users"]',
        title: t('tourStepAdminUsers'),
        description: t('tourStepAdminUsersDesc'),
        icon: '👥',
      },
      {
        id: 'admin-systems',
        path: '/admin',
        target: '[data-tour="admin-systems"]',
        title: t('tourStepAdminSystems'),
        description: t('tourStepAdminSystemsDesc'),
        icon: '🏢',
      },
    ];

    const complete = {
      id: 'complete',
      path: null,
      target: null,
      title: t('tourStepComplete'),
      description: t('tourStepCompleteDesc'),
      icon: '🎉',
      isLast: true,
    };

    let all = [...base];
    if (role.isManager) all.push(...manager);
    if (role.isAdmin) all.push(...admin);
    all.push(complete);

    return all;
  }, [t, role]);

  const current = steps[step];
  const isLast = step === steps.length - 1;
  const isFirst = step === 0;

  // Storage helpers
  const store = useMemo(() => ({
    getStatus: () => localStorage.getItem(STORAGE.status(user?.id)),
    setStatus: (s) => localStorage.setItem(STORAGE.status(user?.id), s),
    getStep: () => parseInt(localStorage.getItem(STORAGE.progress(user?.id)) || '0'),
    setStep: (s) => localStorage.setItem(STORAGE.progress(user?.id), String(s)),
    getLang: () => localStorage.getItem(STORAGE.lang(user?.id)),
    setLang: (l) => localStorage.setItem(STORAGE.lang(user?.id), l),
    clear: () => {
      localStorage.removeItem(STORAGE.status(user?.id));
      localStorage.removeItem(STORAGE.progress(user?.id));
      localStorage.removeItem(STORAGE.lang(user?.id));
    },
  }), [user?.id]);

  // Initialize tour
  useEffect(() => {
    if (!user?.id) return;
    const status = store.getStatus();
    if (!status) {
      setTimeout(() => {
        setStep(store.getStep());
        setIsActive(true);
      }, 600);
    }
  }, [user?.id, store]);

  // Language change - restart if skipped
  useEffect(() => {
    if (!user?.id) return;
    const status = store.getStatus();
    const lang = store.getLang();
    if (status === 'skipped' && lang && lang !== language) {
      store.clear();
      setStep(0);
      setIsActive(true);
      navigate('/');
    }
  }, [language, user?.id, store, navigate]);

  // Lock scroll when tour is active
  useEffect(() => {
    if (isActive) {
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';

      return () => {
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [isActive]);

  // Update target rect
  const updateRect = useCallback(() => {
    const el = targetRef.current;
    if (!el) {
      setTargetRect(null);
      return;
    }
    const r = el.getBoundingClientRect();
    setTargetRect({
      top: r.top,
      left: r.left,
      width: r.width,
      height: r.height,
      scrollTop: r.top + window.scrollY,
      scrollLeft: r.left + window.scrollX,
    });
  }, []);

  // Find target element
  useEffect(() => {
    if (!isActive || transitioning) return;
    if (!current) return;

    // Navigate if needed
    if (current.path && current.path !== location.pathname) {
      navigate(current.path);
      return;
    }

    // No target = modal
    if (!current.target) {
      targetRef.current = null;
      setTargetRect(null);
      setTargetReady(true);
      return;
    }

    setTargetReady(false);
    let attempts = 0;

    const find = () => {
      const el = document.querySelector(current.target);
      if (el) {
        targetRef.current = el;
        updateRect();
        setTargetReady(true);

        // Smooth scroll to element
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Observe resize
        if (resizeObserver.current) resizeObserver.current.disconnect();
        resizeObserver.current = new ResizeObserver(updateRect);
        resizeObserver.current.observe(el);
      } else if (attempts++ < 30) {
        setTimeout(find, 100);
      }
    };

    const timer = setTimeout(find, 50);
    return () => {
      clearTimeout(timer);
      if (resizeObserver.current) resizeObserver.current.disconnect();
    };
  }, [isActive, step, transitioning, current, location.pathname, navigate, updateRect]);

  // Handle resize
  useEffect(() => {
    if (!targetRef.current) return;
    window.addEventListener('resize', updateRect);
    return () => window.removeEventListener('resize', updateRect);
  }, [updateRect]);

  // Click handler for action steps
  useEffect(() => {
    if (!isActive || !targetReady || !targetRef.current) return;
    if (current?.action !== 'click') return;

    const el = targetRef.current;
    const handler = (e) => {
      e.preventDefault();
      e.stopPropagation();
      store.setStep(step + 1);
      if (current.nextPath) navigate(current.nextPath);
      goNext();
    };

    el.addEventListener('click', handler, true);
    return () => el.removeEventListener('click', handler, true);
  }, [isActive, targetReady, step, current, navigate, store]);

  // Keyboard
  useEffect(() => {
    if (!isActive) return;
    const handler = (e) => {
      if (e.key === 'Escape') skip();
      if (e.key === 'ArrowRight' || e.key === 'Enter') {
        if (current?.action !== 'click') goNext();
      }
      if (e.key === 'ArrowLeft' && step > 0) goPrev();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isActive, step, current]);

  // Navigation
  const goNext = useCallback(() => {
    if (isLast) {
      complete();
      return;
    }
    setTransitioning(true);
    setTimeout(() => {
      setStep(s => s + 1);
      store.setStep(step + 1);
      setTransitioning(false);
    }, 300);
  }, [isLast, step, store]);

  const goPrev = useCallback(() => {
    if (step <= 0) return;
    setTransitioning(true);
    setTimeout(() => {
      setStep(s => s - 1);
      setTransitioning(false);
    }, 300);
  }, [step]);

  const skip = useCallback(() => {
    store.setStatus('skipped');
    store.setLang(language);
    setIsActive(false);
  }, [store, language]);

  const complete = useCallback(() => {
    store.setStatus('completed');
    setIsActive(false);
  }, [store]);

  const restart = useCallback(() => {
    store.clear();
    setStep(0);
    setIsActive(true);
    navigate('/');
  }, [store, navigate]);

  return (
    <TourContext.Provider value={{ isActive, step, total: steps.length, restart }}>
      {children}
      {isActive && current && (
        <TourUI
          step={current}
          stepNum={step + 1}
          total={steps.length}
          rect={targetRect}
          transitioning={transitioning}
          onNext={goNext}
          onPrev={goPrev}
          onSkip={skip}
          isFirst={isFirst}
          isLast={isLast}
        />
      )}
    </TourContext.Provider>
  );
}

// Tour UI Component
function TourUI({ step, stepNum, total, rect, transitioning, onNext, onPrev, onSkip, isFirst, isLast }) {
  const { t } = useLanguage();
  const tooltipRef = useRef(null);
  const [pos, setPos] = useState(null);

  const pad = 16;
  const isCenter = !rect;

  // Calculate tooltip position
  useEffect(() => {
    if (!tooltipRef.current) return;

    const calc = () => {
      const tip = tooltipRef.current.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      if (isCenter) {
        setPos({
          top: (vh - tip.height) / 2,
          left: (vw - tip.width) / 2,
          arrow: null,
        });
        return;
      }

      const gap = 20;
      let top, left, arrow;

      // Try bottom first
      if (rect.top + rect.height + gap + tip.height < vh) {
        top = rect.top + rect.height + gap;
        left = rect.left + rect.width / 2 - tip.width / 2;
        arrow = 'top';
      }
      // Try top
      else if (rect.top - gap - tip.height > 0) {
        top = rect.top - gap - tip.height;
        left = rect.left + rect.width / 2 - tip.width / 2;
        arrow = 'bottom';
      }
      // Try right
      else if (rect.left + rect.width + gap + tip.width < vw) {
        top = rect.top + rect.height / 2 - tip.height / 2;
        left = rect.left + rect.width + gap;
        arrow = 'left';
      }
      // Try left
      else {
        top = rect.top + rect.height / 2 - tip.height / 2;
        left = rect.left - gap - tip.width;
        arrow = 'right';
      }

      // Clamp to viewport
      left = Math.max(16, Math.min(left, vw - tip.width - 16));
      top = Math.max(16, Math.min(top, vh - tip.height - 16));

      setPos({ top, left, arrow });
    };

    requestAnimationFrame(calc);
  }, [rect, isCenter]);

  return (
    <div className="fixed inset-0 z-[99999]" style={{ pointerEvents: 'none' }}>
      {/* Backdrop with spotlight */}
      <div className={`absolute inset-0 transition-opacity duration-500 ${transitioning ? 'opacity-0' : 'opacity-100'}`}>
        <svg className="w-full h-full">
          <defs>
            <mask id="tour-mask">
              <rect width="100%" height="100%" fill="white" />
              {rect && (
                <rect
                  x={rect.left - pad}
                  y={rect.top - pad}
                  width={rect.width + pad * 2}
                  height={rect.height + pad * 2}
                  rx="16"
                  fill="black"
                />
              )}
            </mask>
            <linearGradient id="tour-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(15, 23, 42, 0.92)" />
              <stop offset="100%" stopColor="rgba(15, 23, 42, 0.88)" />
            </linearGradient>
          </defs>
          <rect
            width="100%"
            height="100%"
            fill="url(#tour-gradient)"
            mask="url(#tour-mask)"
          />
        </svg>

        {/* Spotlight glow */}
        {rect && (
          <div
            className="absolute transition-all duration-500 ease-out rounded-2xl"
            style={{
              top: rect.top - pad,
              left: rect.left - pad,
              width: rect.width + pad * 2,
              height: rect.height + pad * 2,
              boxShadow: step.action === 'click'
                ? '0 0 0 4px rgba(249, 191, 63, 0.9), 0 0 0 8px rgba(249, 191, 63, 0.4), 0 0 60px rgba(249, 191, 63, 0.6)'
                : '0 0 0 3px rgba(255, 255, 255, 0.8), 0 0 40px rgba(255, 255, 255, 0.3)',
              animation: step.action === 'click' ? 'tour-glow 2s ease-in-out infinite' : 'none',
            }}
          />
        )}
      </div>

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className={`fixed transition-all duration-500 ease-out ${transitioning || !pos ? 'opacity-0 scale-90' : 'opacity-100 scale-100'}`}
        style={{
          top: pos?.top ?? '50%',
          left: pos?.left ?? '50%',
          transform: pos ? 'none' : 'translate(-50%, -50%)',
          pointerEvents: 'auto',
          maxWidth: isCenter ? '420px' : '360px',
        }}
      >
        {/* Glass card */}
        <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 dark:border-gray-700/50 overflow-hidden">
          {/* Progress bar */}
          <div className="h-1 bg-gray-100 dark:bg-gray-800">
            <div
              className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 transition-all duration-500"
              style={{ width: `${(stepNum / total) * 100}%` }}
            />
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Header */}
            <div className="flex items-start gap-4 mb-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10 dark:from-blue-500/20 dark:via-purple-500/20 dark:to-pink-500/20 flex items-center justify-center text-3xl flex-shrink-0 shadow-inner">
                {step.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-500 uppercase tracking-wider">
                    {stepNum} / {total}
                  </span>
                  <button
                    onClick={onSkip}
                    className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">
                  {step.title}
                </h2>
              </div>
            </div>

            {/* Description */}
            <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed mb-6">
              {step.description}
            </p>

            {/* Action hint */}
            {step.action === 'click' && rect && (
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200/50 dark:border-amber-700/30 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                  </svg>
                </div>
                <span className="text-amber-800 dark:text-amber-200 font-medium text-sm">
                  {t('tourClickHere')}
                </span>
              </div>
            )}

            {/* Buttons */}
            <div className="flex items-center justify-between">
              <button
                onClick={onSkip}
                className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors font-medium"
              >
                {t('tourSkip')}
              </button>

              <div className="flex items-center gap-2">
                {!isFirst && step.action !== 'click' && (
                  <button
                    onClick={onPrev}
                    className="px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all flex items-center gap-1.5"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    {t('previous')}
                  </button>
                )}

                {step.action !== 'click' && (
                  <button
                    onClick={onNext}
                    className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 transition-all transform hover:scale-[1.02] flex items-center gap-1.5"
                  >
                    {isLast ? t('tourFinish') : t('next')}
                    {!isLast && (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Keyboard hints */}
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-center gap-6 text-xs text-gray-400">
              <span className="flex items-center gap-1.5">
                <kbd className="px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 font-mono text-[10px]">Esc</kbd>
                <span>{t('tourSkip')}</span>
              </span>
              {step.action !== 'click' && (
                <span className="flex items-center gap-1.5">
                  <kbd className="px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 font-mono text-[10px]">→</kbd>
                  <span>{t('next')}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Arrow */}
        {pos?.arrow && (
          <div
            className="absolute w-4 h-4 bg-white/95 dark:bg-gray-900/95 transform rotate-45 border-white/20 dark:border-gray-700/50"
            style={{
              ...(pos.arrow === 'top' && { top: -8, left: '50%', marginLeft: -8, borderTop: '1px solid', borderLeft: '1px solid' }),
              ...(pos.arrow === 'bottom' && { bottom: -8, left: '50%', marginLeft: -8, borderBottom: '1px solid', borderRight: '1px solid' }),
              ...(pos.arrow === 'left' && { left: -8, top: '50%', marginTop: -8, borderBottom: '1px solid', borderLeft: '1px solid' }),
              ...(pos.arrow === 'right' && { right: -8, top: '50%', marginTop: -8, borderTop: '1px solid', borderRight: '1px solid' }),
            }}
          />
        )}
      </div>

      {/* Progress dots */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2" style={{ pointerEvents: 'auto' }}>
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className={`rounded-full transition-all duration-300 ${
              i === stepNum - 1
                ? 'w-8 h-2 bg-gradient-to-r from-blue-500 to-purple-500'
                : i < stepNum - 1
                ? 'w-2 h-2 bg-white/60'
                : 'w-2 h-2 bg-white/30'
            }`}
          />
        ))}
      </div>

      {/* Styles */}
      <style>{`
        @keyframes tour-glow {
          0%, 100% {
            box-shadow: 0 0 0 4px rgba(249, 191, 63, 0.9), 0 0 0 8px rgba(249, 191, 63, 0.4), 0 0 60px rgba(249, 191, 63, 0.6);
          }
          50% {
            box-shadow: 0 0 0 6px rgba(249, 191, 63, 1), 0 0 0 12px rgba(249, 191, 63, 0.5), 0 0 80px rgba(249, 191, 63, 0.8);
          }
        }
      `}</style>
    </div>
  );
}

export default TourProvider;
