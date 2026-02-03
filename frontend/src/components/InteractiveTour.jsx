import React, { useState, useEffect, useCallback, createContext, useContext, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../App';

// Tour Context
const TourContext = createContext(null);
export const useTour = () => useContext(TourContext);

// Constants
const STORAGE_KEYS = {
  tour: (userId) => `idm_tour_v2_${userId}`,
  progress: (userId) => `idm_tour_progress_${userId}`,
  skipLang: (userId) => `idm_tour_skip_lang_${userId}`,
};

const ANIMATION_DURATION = 300;
const SPOTLIGHT_PADDING = 12;
const TOOLTIP_GAP = 20;

// Tour Provider Component
export function TourProvider({ children, user }) {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  const [state, setState] = useState({
    isActive: false,
    currentStep: 0,
    isTransitioning: false,
  });
  const [targetRect, setTargetRect] = useState(null);

  const targetElementRef = useRef(null);
  const observerRef = useRef(null);

  // User role detection
  const userRole = useMemo(() => {
    const isAdmin = user?.is_superuser || user?.is_demo;
    const isManager = user?.roles?.some(r =>
      ['manager', 'approver', 'менеджер', 'согласующий'].some(
        keyword => r.name?.toLowerCase().includes(keyword)
      )
    ) || isAdmin;
    return { isAdmin, isManager };
  }, [user]);

  // Tour steps definition
  const steps = useMemo(() => {
    const baseSteps = [
      {
        id: 'welcome',
        path: '/',
        target: null,
        icon: '👋',
        title: t('tourStepWelcome'),
        content: t('tourStepWelcomeDesc'),
        position: 'center',
      },
      {
        id: 'create-request',
        path: '/',
        target: '[data-tour="new-request"]',
        icon: '➕',
        title: t('tourStepCreateBtn'),
        content: t('tourStepCreateBtnDesc'),
        position: 'bottom',
        waitForClick: true,
        nextPath: '/create-request',
      },
      {
        id: 'user-search',
        path: '/create-request',
        target: '[data-tour="user-search"]',
        icon: '👤',
        title: t('tourStepSelectUser'),
        content: t('tourStepSelectUserDesc'),
        position: 'bottom',
      },
      {
        id: 'system-select',
        path: '/create-request',
        target: '[data-tour="system-select"]',
        icon: '🖥️',
        title: t('tourStepSelectSystem'),
        content: t('tourStepSelectSystemDesc'),
        position: 'bottom',
      },
      {
        id: 'role-select',
        path: '/create-request',
        target: '[data-tour="role-select"]',
        icon: '🔑',
        title: t('tourStepSelectRole'),
        content: t('tourStepSelectRoleDesc'),
        position: 'bottom',
      },
      {
        id: 'justification',
        path: '/create-request',
        target: '[data-tour="justification"]',
        icon: '📝',
        title: t('tourStepJustification'),
        content: t('tourStepJustificationDesc'),
        position: 'top',
      },
      {
        id: 'my-requests',
        path: '/',
        target: '[data-tour="my-requests"]',
        icon: '📋',
        title: t('tourStepMyRequests'),
        content: t('tourStepMyRequestsDesc'),
        position: 'bottom',
      },
    ];

    const managerSteps = [
      {
        id: 'approvals',
        path: '/',
        target: '[data-tour="pending-approvals"]',
        icon: '✅',
        title: t('tourStepApprovals'),
        content: t('tourStepApprovalsDesc'),
        position: 'bottom',
        waitForClick: true,
        nextPath: '/my-approvals',
      },
      {
        id: 'approve-request',
        path: '/my-approvals',
        target: '[data-tour="approval-card"]',
        icon: '📨',
        title: t('tourStepApproveRequest'),
        content: t('tourStepApproveRequestDesc'),
        position: 'right',
        optional: true, // May not have cards
      },
    ];

    const adminSteps = [
      {
        id: 'admin-nav',
        path: '/',
        target: '[data-tour="admin-link"]',
        icon: '⚙️',
        title: t('tourStepAdmin'),
        content: t('tourStepAdminDesc'),
        position: 'bottom',
        waitForClick: true,
        nextPath: '/admin',
      },
      {
        id: 'admin-users',
        path: '/admin',
        target: '[data-tour="admin-users"]',
        icon: '👥',
        title: t('tourStepAdminUsers'),
        content: t('tourStepAdminUsersDesc'),
        position: 'bottom',
      },
      {
        id: 'admin-systems',
        path: '/admin',
        target: '[data-tour="admin-systems"]',
        icon: '🏢',
        title: t('tourStepAdminSystems'),
        content: t('tourStepAdminSystemsDesc'),
        position: 'bottom',
      },
    ];

    const completeStep = {
      id: 'complete',
      path: null,
      target: null,
      icon: '🎉',
      title: t('tourStepComplete'),
      content: t('tourStepCompleteDesc'),
      position: 'center',
    };

    let allSteps = [...baseSteps];

    if (userRole.isManager && !userRole.isAdmin) {
      allSteps.push(...managerSteps);
    }
    if (userRole.isAdmin) {
      allSteps.push(...managerSteps, ...adminSteps);
    }

    allSteps.push(completeStep);
    return allSteps;
  }, [t, userRole]);

  const currentStepData = steps[state.currentStep];

  // Storage helpers
  const storage = useMemo(() => ({
    getTourStatus: () => localStorage.getItem(STORAGE_KEYS.tour(user?.id)),
    setTourStatus: (status) => localStorage.setItem(STORAGE_KEYS.tour(user?.id), status),
    getProgress: () => parseInt(localStorage.getItem(STORAGE_KEYS.progress(user?.id)) || '0', 10),
    setProgress: (step) => localStorage.setItem(STORAGE_KEYS.progress(user?.id), String(step)),
    getSkipLang: () => localStorage.getItem(STORAGE_KEYS.skipLang(user?.id)),
    setSkipLang: (lang) => localStorage.setItem(STORAGE_KEYS.skipLang(user?.id), lang),
    clearAll: () => {
      localStorage.removeItem(STORAGE_KEYS.tour(user?.id));
      localStorage.removeItem(STORAGE_KEYS.progress(user?.id));
      localStorage.removeItem(STORAGE_KEYS.skipLang(user?.id));
    },
  }), [user?.id]);

  // Initialize tour
  useEffect(() => {
    if (!user?.id) return;

    const status = storage.getTourStatus();
    if (!status) {
      const timer = setTimeout(() => {
        const savedProgress = storage.getProgress();
        setState(prev => ({
          ...prev,
          isActive: true,
          currentStep: savedProgress,
        }));
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [user?.id, storage]);

  // Language change handler - restart tour if skipped
  useEffect(() => {
    if (!user?.id) return;

    const status = storage.getTourStatus();
    const skipLang = storage.getSkipLang();

    if (status === 'skipped' && skipLang && skipLang !== language) {
      storage.clearAll();
      setState({ isActive: true, currentStep: 0, isTransitioning: false });
      navigate('/');
    }
  }, [language, user?.id, storage, navigate]);

  // Update target rect with ResizeObserver
  const updateTargetRect = useCallback(() => {
    const el = targetElementRef.current;
    if (!el) {
      setTargetRect(null);
      return;
    }

    const rect = el.getBoundingClientRect();
    setTargetRect({
      top: rect.top + window.scrollY,
      left: rect.left + window.scrollX,
      width: rect.width,
      height: rect.height,
      viewportTop: rect.top,
      viewportLeft: rect.left,
    });
  }, []);

  // Find and track target element
  useEffect(() => {
    if (!state.isActive || state.isTransitioning) return;

    const step = currentStepData;
    if (!step) return;

    // Navigate if needed
    if (step.path && step.path !== location.pathname) {
      navigate(step.path);
      return;
    }

    // No target = centered modal
    if (!step.target) {
      targetElementRef.current = null;
      setTargetRect(null);
      return;
    }

    // Find element with retry
    let attempts = 0;
    const maxAttempts = 20;

    const findElement = () => {
      const el = document.querySelector(step.target);

      if (el) {
        targetElementRef.current = el;
        updateTargetRect();

        // Scroll into view smoothly
        el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });

        // Setup ResizeObserver
        if (observerRef.current) observerRef.current.disconnect();
        observerRef.current = new ResizeObserver(updateTargetRect);
        observerRef.current.observe(el);
      } else if (attempts < maxAttempts) {
        attempts++;
        setTimeout(findElement, 150);
      } else if (step.optional) {
        // Skip optional steps if target not found
        goToStep(state.currentStep + 1);
      }
    };

    const timer = setTimeout(findElement, 100);

    return () => {
      clearTimeout(timer);
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, [state.isActive, state.currentStep, state.isTransitioning, location.pathname, currentStepData, navigate, updateTargetRect]);

  // Window resize/scroll handler
  useEffect(() => {
    if (!targetElementRef.current) return;

    window.addEventListener('resize', updateTargetRect);
    window.addEventListener('scroll', updateTargetRect, true);

    return () => {
      window.removeEventListener('resize', updateTargetRect);
      window.removeEventListener('scroll', updateTargetRect, true);
    };
  }, [updateTargetRect]);

  // Navigation functions - must be declared before useEffects that use them
  const goToStep = useCallback((stepIndex) => {
    if (stepIndex < 0 || stepIndex >= steps.length) return;

    setState(prev => ({ ...prev, isTransitioning: true }));

    setTimeout(() => {
      setState(prev => ({
        ...prev,
        currentStep: stepIndex,
        isTransitioning: false,
      }));
      storage.setProgress(stepIndex);
    }, ANIMATION_DURATION);
  }, [steps.length, storage]);

  const skipTour = useCallback(() => {
    storage.setTourStatus('skipped');
    storage.setSkipLang(language);
    setState(prev => ({ ...prev, isActive: false }));
  }, [storage, language]);

  const completeTour = useCallback(() => {
    storage.setTourStatus('completed');
    setState(prev => ({ ...prev, isActive: false }));
  }, [storage]);

  const restartTour = useCallback(() => {
    storage.clearAll();
    setState({ isActive: true, currentStep: 0, isTransitioning: false });
    navigate('/');
  }, [storage, navigate]);

  const nextStep = useCallback(() => {
    if (state.currentStep >= steps.length - 1) {
      completeTour();
    } else {
      goToStep(state.currentStep + 1);
    }
  }, [state.currentStep, steps.length, goToStep, completeTour]);

  const prevStep = useCallback(() => {
    if (state.currentStep > 0) {
      goToStep(state.currentStep - 1);
    }
  }, [state.currentStep, goToStep]);

  // Keyboard navigation - uses functions above
  useEffect(() => {
    if (!state.isActive) return;

    const handleKeyDown = (e) => {
      switch (e.key) {
        case 'Escape':
          skipTour();
          break;
        case 'ArrowRight':
        case 'Enter':
          if (!currentStepData?.waitForClick) nextStep();
          break;
        case 'ArrowLeft':
          if (!currentStepData?.waitForClick && state.currentStep > 0) prevStep();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.isActive, state.currentStep, currentStepData, skipTour, nextStep, prevStep]);

  // Click handler for waitForClick steps
  useEffect(() => {
    if (!state.isActive || !targetElementRef.current) return;
    if (!currentStepData?.waitForClick) return;

    const el = targetElementRef.current;

    const handleClick = () => {
      storage.setProgress(state.currentStep + 1);

      if (currentStepData.nextPath) {
        navigate(currentStepData.nextPath);
      }

      setTimeout(() => goToStep(state.currentStep + 1), 150);
    };

    el.addEventListener('click', handleClick);
    return () => el.removeEventListener('click', handleClick);
  }, [state.isActive, state.currentStep, currentStepData, storage, navigate, goToStep]);

  const contextValue = useMemo(() => ({
    isActive: state.isActive,
    currentStep: state.currentStep,
    totalSteps: steps.length,
    restartTour,
  }), [state.isActive, state.currentStep, steps.length, restartTour]);

  return (
    <TourContext.Provider value={contextValue}>
      {children}

      {state.isActive && currentStepData && (
        <TourOverlay
          step={currentStepData}
          stepNumber={state.currentStep + 1}
          totalSteps={steps.length}
          targetRect={targetRect}
          isTransitioning={state.isTransitioning}
          onNext={nextStep}
          onPrev={prevStep}
          onSkip={skipTour}
          isFirst={state.currentStep === 0}
          isLast={state.currentStep === steps.length - 1}
        />
      )}
    </TourContext.Provider>
  );
}

// Tour Overlay Component
function TourOverlay({
  step,
  stepNumber,
  totalSteps,
  targetRect,
  isTransitioning,
  onNext,
  onPrev,
  onSkip,
  isFirst,
  isLast
}) {
  const { t } = useLanguage();
  const tooltipRef = useRef(null);
  const [tooltipPosition, setTooltipPosition] = useState(null); // null = not calculated yet
  const [arrowPosition, setArrowPosition] = useState({ side: 'top', offset: 50 });

  // Calculate optimal tooltip position
  useEffect(() => {
    if (!tooltipRef.current) return;

    // Use RAF to ensure layout is complete
    const calculatePosition = () => {
      const tooltip = tooltipRef.current;
      if (!tooltip) return;

      const tooltipRect = tooltip.getBoundingClientRect();
      const viewport = {
        width: window.innerWidth,
        height: window.innerHeight,
      };

      let top, left;
      let arrowSide = step.position;
      let arrowOffset = 50;

      if (!targetRect || step.position === 'center') {
        top = (viewport.height - tooltipRect.height) / 2;
        left = (viewport.width - tooltipRect.width) / 2;
        setTooltipPosition({ top, left });
        setArrowPosition({ side: 'none', offset: 0 });
        return;
      }

      const padding = SPOTLIGHT_PADDING;
      const gap = TOOLTIP_GAP;

      // Calculate position based on step.position preference
      switch (step.position) {
        case 'bottom':
          top = targetRect.viewportTop + targetRect.height + gap + padding;
          left = targetRect.viewportLeft + targetRect.width / 2 - tooltipRect.width / 2;
          arrowSide = 'top';
          break;
        case 'top':
          top = targetRect.viewportTop - tooltipRect.height - gap - padding;
          left = targetRect.viewportLeft + targetRect.width / 2 - tooltipRect.width / 2;
          arrowSide = 'bottom';
          break;
        case 'left':
          top = targetRect.viewportTop + targetRect.height / 2 - tooltipRect.height / 2;
          left = targetRect.viewportLeft - tooltipRect.width - gap - padding;
          arrowSide = 'right';
          break;
        case 'right':
          top = targetRect.viewportTop + targetRect.height / 2 - tooltipRect.height / 2;
          left = targetRect.viewportLeft + targetRect.width + gap + padding;
          arrowSide = 'left';
          break;
        default:
          top = targetRect.viewportTop + targetRect.height + gap;
          left = targetRect.viewportLeft;
      }

      // Clamp to viewport
      const margin = 16;

      if (left < margin) {
        arrowOffset = Math.max(10, 50 + (left - margin) / tooltipRect.width * 100);
        left = margin;
      } else if (left + tooltipRect.width > viewport.width - margin) {
        arrowOffset = Math.min(90, 50 + (left + tooltipRect.width - viewport.width + margin) / tooltipRect.width * 100);
        left = viewport.width - tooltipRect.width - margin;
      }

      if (top < margin) {
        top = margin;
      } else if (top + tooltipRect.height > viewport.height - margin) {
        top = viewport.height - tooltipRect.height - margin;
      }

      setTooltipPosition({ top, left });
      setArrowPosition({ side: arrowSide, offset: arrowOffset });
    };

    // Use RAF to ensure layout is complete before measuring
    const rafId = requestAnimationFrame(calculatePosition);
    return () => cancelAnimationFrame(rafId);
  }, [targetRect, step.position]);

  const progress = (stepNumber / totalSteps) * 100;

  return (
    <div
      className="fixed inset-0 z-[9999]"
      style={{ pointerEvents: 'none' }}
      role="dialog"
      aria-modal="true"
      aria-label={t('tourStepWelcome')}
    >
      {/* Animated backdrop - pointerEvents handled by children */}
      <div
        className={`absolute inset-0 transition-opacity duration-300 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}
      >
        {/* SVG Spotlight mask - no pointer events */}
        <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }}>
          <defs>
            <mask id="tour-spotlight-mask">
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              {targetRect && (
                <rect
                  x={targetRect.left - SPOTLIGHT_PADDING}
                  y={targetRect.top - SPOTLIGHT_PADDING}
                  width={targetRect.width + SPOTLIGHT_PADDING * 2}
                  height={targetRect.height + SPOTLIGHT_PADDING * 2}
                  rx="12"
                  fill="black"
                  className="transition-all duration-300 ease-out"
                />
              )}
            </mask>
            {/* Glow filter for spotlight */}
            <filter id="tour-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Dark overlay with cutout */}
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="rgba(15, 23, 42, 0.85)"
            mask="url(#tour-spotlight-mask)"
            className="transition-all duration-300"
          />
        </svg>

        {/* Spotlight ring effect */}
        {targetRect && (
          <div
            className="absolute rounded-xl transition-all duration-300 ease-out"
            style={{
              top: targetRect.top - SPOTLIGHT_PADDING,
              left: targetRect.left - SPOTLIGHT_PADDING,
              width: targetRect.width + SPOTLIGHT_PADDING * 2,
              height: targetRect.height + SPOTLIGHT_PADDING * 2,
              boxShadow: `
                0 0 0 3px rgba(249, 191, 63, 0.8),
                0 0 0 6px rgba(249, 191, 63, 0.4),
                0 0 30px rgba(249, 191, 63, 0.6),
                inset 0 0 20px rgba(249, 191, 63, 0.1)
              `,
              animation: step.waitForClick ? 'tour-pulse 2s ease-in-out infinite' : 'none',
              pointerEvents: 'none',
            }}
          />
        )}

        {/* Click blocker - frame around target, allows clicks on target and header */}
        {!step.waitForClick && targetRect && (
          <>
            {/* Top blocker (below header) */}
            <div
              className="absolute left-0 right-0"
              style={{
                top: '64px',
                height: Math.max(0, targetRect.viewportTop - SPOTLIGHT_PADDING - 64),
                pointerEvents: 'auto',
              }}
            />
            {/* Bottom blocker */}
            <div
              className="absolute left-0 right-0 bottom-0"
              style={{
                top: targetRect.viewportTop + targetRect.height + SPOTLIGHT_PADDING,
                pointerEvents: 'auto',
              }}
            />
            {/* Left blocker */}
            <div
              className="absolute"
              style={{
                top: targetRect.viewportTop - SPOTLIGHT_PADDING,
                left: 0,
                width: Math.max(0, targetRect.viewportLeft - SPOTLIGHT_PADDING),
                height: targetRect.height + SPOTLIGHT_PADDING * 2,
                pointerEvents: 'auto',
              }}
            />
            {/* Right blocker */}
            <div
              className="absolute"
              style={{
                top: targetRect.viewportTop - SPOTLIGHT_PADDING,
                left: targetRect.viewportLeft + targetRect.width + SPOTLIGHT_PADDING,
                right: 0,
                height: targetRect.height + SPOTLIGHT_PADDING * 2,
                pointerEvents: 'auto',
              }}
            />
          </>
        )}
        {/* Full blocker when no target (centered modal) */}
        {!step.waitForClick && !targetRect && (
          <div
            className="absolute inset-0"
            style={{ top: '64px', pointerEvents: 'auto' }}
          />
        )}
      </div>

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className={`fixed bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden
          transition-all duration-300 ease-out transform
          ${isTransitioning || !tooltipPosition ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}
          ${step.position === 'center' ? 'max-w-md' : 'w-80'}
        `}
        style={{
          top: tooltipPosition ? `${tooltipPosition.top}px` : '50%',
          left: tooltipPosition ? `${tooltipPosition.left}px` : '50%',
          transform: tooltipPosition ? 'none' : 'translate(-50%, -50%)',
          pointerEvents: 'auto',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255,255,255,0.1)',
        }}
      >
        {/* Progress bar */}
        <div className="h-1 bg-gray-100 dark:bg-gray-700">
          <div
            className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Arrow */}
        {arrowPosition.side !== 'none' && targetRect && (
          <div
            className="absolute w-4 h-4 bg-white dark:bg-gray-800 transform rotate-45"
            style={{
              ...(arrowPosition.side === 'top' && {
                top: '-8px',
                left: `${arrowPosition.offset}%`,
                marginLeft: '-8px',
                boxShadow: '-2px -2px 4px rgba(0,0,0,0.1)',
              }),
              ...(arrowPosition.side === 'bottom' && {
                bottom: '-8px',
                left: `${arrowPosition.offset}%`,
                marginLeft: '-8px',
                boxShadow: '2px 2px 4px rgba(0,0,0,0.1)',
              }),
              ...(arrowPosition.side === 'left' && {
                left: '-8px',
                top: '50%',
                marginTop: '-8px',
                boxShadow: '-2px 2px 4px rgba(0,0,0,0.1)',
              }),
              ...(arrowPosition.side === 'right' && {
                right: '-8px',
                top: '50%',
                marginTop: '-8px',
                boxShadow: '2px -2px 4px rgba(0,0,0,0.1)',
              }),
            }}
          />
        )}

        {/* Content */}
        <div className="p-5">
          {/* Header with icon */}
          <div className="flex items-start gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/10 to-secondary/10
              dark:from-primary/20 dark:to-secondary/20 flex items-center justify-center text-xl flex-shrink-0">
              {step.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-xs font-semibold text-primary dark:text-blue-400 uppercase tracking-wide">
                  {stepNumber} / {totalSteps}
                </span>
                <button
                  onClick={onSkip}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300
                    transition-colors p-1 -m-1 rounded"
                  aria-label={t('tourSkip')}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">
                {step.title}
              </h3>
            </div>
          </div>

          {/* Description */}
          <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed mb-4">
            {step.content}
          </p>

          {/* Click hint */}
          {step.waitForClick && targetRect && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/10
              dark:bg-secondary/20 text-secondary-700 dark:text-secondary-400 text-sm font-medium mb-4">
              <svg className="w-5 h-5 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
              </svg>
              {t('tourClickHere')}
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={onSkip}
              className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400
                dark:hover:text-gray-200 transition-colors font-medium"
            >
              {t('tourSkip')}
            </button>

            <div className="flex items-center gap-2">
              {!isFirst && !step.waitForClick && (
                <button
                  onClick={onPrev}
                  className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-200
                    dark:border-gray-600 text-gray-700 dark:text-gray-300
                    hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors
                    flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  {t('previous')}
                </button>
              )}

              {!step.waitForClick && (
                <button
                  onClick={onNext}
                  className="px-4 py-2 text-sm font-semibold rounded-lg bg-gradient-to-r
                    from-primary to-primary-600 hover:from-primary-600 hover:to-primary-700
                    text-white shadow-lg shadow-primary/25 hover:shadow-primary/40
                    transition-all transform hover:scale-[1.02] flex items-center gap-1"
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

          {/* Keyboard hint */}
          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700
            text-xs text-gray-400 dark:text-gray-500 flex items-center justify-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 font-mono">Esc</kbd>
              {t('tourSkip')}
            </span>
            {!step.waitForClick && (
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 font-mono">→</kbd>
                {t('next')}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Global styles */}
      <style>{`
        @keyframes tour-pulse {
          0%, 100% {
            box-shadow:
              0 0 0 3px rgba(249, 191, 63, 0.8),
              0 0 0 6px rgba(249, 191, 63, 0.4),
              0 0 30px rgba(249, 191, 63, 0.6),
              inset 0 0 20px rgba(249, 191, 63, 0.1);
          }
          50% {
            box-shadow:
              0 0 0 5px rgba(249, 191, 63, 1),
              0 0 0 10px rgba(249, 191, 63, 0.5),
              0 0 50px rgba(249, 191, 63, 0.8),
              inset 0 0 30px rgba(249, 191, 63, 0.2);
          }
        }
      `}</style>
    </div>
  );
}

export default TourProvider;
