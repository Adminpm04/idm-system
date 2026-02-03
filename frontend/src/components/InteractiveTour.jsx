import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../App';

// Tour Context for global access
const TourContext = createContext(null);

export const useTour = () => useContext(TourContext);

// Tour Provider Component
export function TourProvider({ children, user }) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [targetElement, setTargetElement] = useState(null);
  const [targetRect, setTargetRect] = useState(null);

  // Determine user role
  const isAdmin = user?.is_superuser || user?.is_demo;
  const isManager = user?.roles?.some(r =>
    r.name?.toLowerCase().includes('manager') ||
    r.name?.toLowerCase().includes('approver') ||
    r.name?.toLowerCase().includes('менеджер') ||
    r.name?.toLowerCase().includes('согласующий')
  ) || user?.is_superuser;

  // Get tour key for storage
  const getTourKey = () => `interactive_tour_${user?.id}`;
  const getProgressKey = () => `interactive_tour_progress_${user?.id}`;

  // Define tour steps based on role
  const getTourSteps = useCallback(() => {
    const userSteps = [
      {
        id: 'welcome',
        path: '/',
        target: null, // No target = centered modal
        title: t('tourStepWelcome'),
        content: t('tourStepWelcomeDesc'),
        position: 'center',
      },
      {
        id: 'create-request-btn',
        path: '/',
        target: '[data-tour="new-request"]',
        title: t('tourStepCreateBtn'),
        content: t('tourStepCreateBtnDesc'),
        position: 'bottom',
        waitForClick: true,
        nextPath: '/create-request',
      },
      {
        id: 'select-user',
        path: '/create-request',
        target: '[data-tour="user-search"]',
        title: t('tourStepSelectUser'),
        content: t('tourStepSelectUserDesc'),
        position: 'bottom',
      },
      {
        id: 'select-system',
        path: '/create-request',
        target: '[data-tour="system-select"]',
        title: t('tourStepSelectSystem'),
        content: t('tourStepSelectSystemDesc'),
        position: 'bottom',
      },
      {
        id: 'select-role',
        path: '/create-request',
        target: '[data-tour="role-select"]',
        title: t('tourStepSelectRole'),
        content: t('tourStepSelectRoleDesc'),
        position: 'bottom',
      },
      {
        id: 'justification',
        path: '/create-request',
        target: '[data-tour="justification"]',
        title: t('tourStepJustification'),
        content: t('tourStepJustificationDesc'),
        position: 'top',
      },
      {
        id: 'my-requests',
        path: '/',
        target: '[data-tour="my-requests"]',
        title: t('tourStepMyRequests'),
        content: t('tourStepMyRequestsDesc'),
        position: 'bottom',
      },
      {
        id: 'complete',
        path: null,
        target: null,
        title: t('tourStepComplete'),
        content: t('tourStepCompleteDesc'),
        position: 'center',
      },
    ];

    const managerSteps = [
      {
        id: 'approvals-nav',
        path: '/',
        target: '[data-tour="pending-approvals"]',
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
        title: t('tourStepApproveRequest'),
        content: t('tourStepApproveRequestDesc'),
        position: 'right',
      },
    ];

    const adminSteps = [
      {
        id: 'admin-nav',
        path: '/',
        target: '[data-tour="admin-link"]',
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
        title: t('tourStepAdminUsers'),
        content: t('tourStepAdminUsersDesc'),
        position: 'right',
      },
      {
        id: 'admin-systems',
        path: '/admin',
        target: '[data-tour="admin-systems"]',
        title: t('tourStepAdminSystems'),
        content: t('tourStepAdminSystemsDesc'),
        position: 'right',
      },
    ];

    let steps = [...userSteps];

    if (isManager && !isAdmin) {
      // Insert manager steps before complete
      steps.splice(steps.length - 1, 0, ...managerSteps);
    }

    if (isAdmin) {
      // Insert admin steps before complete
      steps.splice(steps.length - 1, 0, ...managerSteps, ...adminSteps);
    }

    return steps;
  }, [t, isAdmin, isManager]);

  const steps = getTourSteps();

  // Check if tour should start
  useEffect(() => {
    if (!user?.id) return;

    const hasSeen = localStorage.getItem(getTourKey());
    const savedProgress = localStorage.getItem(getProgressKey());

    if (!hasSeen) {
      // First time - start tour
      setTimeout(() => {
        setIsActive(true);
        setCurrentStep(savedProgress ? parseInt(savedProgress, 10) : 0);
      }, 500);
    }
  }, [user?.id]);

  // Find and highlight target element
  useEffect(() => {
    if (!isActive) {
      setTargetElement(null);
      setTargetRect(null);
      return;
    }

    const step = steps[currentStep];
    if (!step) return;

    // Check if we're on the right page
    if (step.path && step.path !== location.pathname) {
      navigate(step.path);
      return;
    }

    // Find target element
    const findTarget = () => {
      if (!step.target) {
        setTargetElement(null);
        setTargetRect(null);
        return;
      }

      const el = document.querySelector(step.target);
      if (el) {
        setTargetElement(el);
        const rect = el.getBoundingClientRect();
        setTargetRect({
          top: rect.top + window.scrollY,
          left: rect.left + window.scrollX,
          width: rect.width,
          height: rect.height,
        });

        // Scroll element into view
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        // Element not found yet, retry
        setTimeout(findTarget, 200);
      }
    };

    const timer = setTimeout(findTarget, 300);
    return () => clearTimeout(timer);
  }, [isActive, currentStep, steps, location.pathname, navigate]);

  // Handle window resize
  useEffect(() => {
    if (!targetElement) return;

    const updateRect = () => {
      const rect = targetElement.getBoundingClientRect();
      setTargetRect({
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
        height: rect.height,
      });
    };

    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect);

    return () => {
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect);
    };
  }, [targetElement]);

  // Handle click on target element
  useEffect(() => {
    if (!isActive || !targetElement) return;

    const step = steps[currentStep];
    if (!step?.waitForClick) return;

    const handleClick = () => {
      // Save progress
      localStorage.setItem(getProgressKey(), String(currentStep + 1));

      if (step.nextPath) {
        navigate(step.nextPath);
      }

      setTimeout(() => {
        setCurrentStep(prev => prev + 1);
      }, 100);
    };

    targetElement.addEventListener('click', handleClick);
    return () => targetElement.removeEventListener('click', handleClick);
  }, [isActive, targetElement, currentStep, steps, navigate]);

  const nextStep = () => {
    const step = steps[currentStep];

    if (currentStep >= steps.length - 1) {
      completeTour();
      return;
    }

    localStorage.setItem(getProgressKey(), String(currentStep + 1));

    if (step?.nextPath && !step.waitForClick) {
      navigate(step.nextPath);
    }

    setCurrentStep(prev => prev + 1);
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const skipTour = () => {
    localStorage.setItem(getTourKey(), 'skipped');
    localStorage.removeItem(getProgressKey());
    setIsActive(false);
  };

  const completeTour = () => {
    localStorage.setItem(getTourKey(), 'completed');
    localStorage.removeItem(getProgressKey());
    setIsActive(false);
  };

  const restartTour = () => {
    localStorage.removeItem(getTourKey());
    localStorage.removeItem(getProgressKey());
    setCurrentStep(0);
    setIsActive(true);
    navigate('/');
  };

  const currentStepData = steps[currentStep];

  return (
    <TourContext.Provider value={{ isActive, restartTour, currentStep, totalSteps: steps.length }}>
      {children}

      {isActive && currentStepData && (
        <TourOverlay
          step={currentStepData}
          stepNumber={currentStep + 1}
          totalSteps={steps.length}
          targetRect={targetRect}
          onNext={nextStep}
          onPrev={prevStep}
          onSkip={skipTour}
          isFirst={currentStep === 0}
          isLast={currentStep === steps.length - 1}
        />
      )}
    </TourContext.Provider>
  );
}

// Tour Overlay Component
function TourOverlay({ step, stepNumber, totalSteps, targetRect, onNext, onPrev, onSkip, isFirst, isLast }) {
  const { t } = useLanguage();
  const padding = 8;

  // Calculate tooltip position
  const getTooltipStyle = () => {
    if (!targetRect || step.position === 'center') {
      return {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      };
    }

    const tooltipWidth = 320;
    const tooltipHeight = 200;
    const arrowSize = 12;
    const gap = 16;

    let top, left;

    switch (step.position) {
      case 'bottom':
        top = targetRect.top + targetRect.height + gap;
        left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
        break;
      case 'top':
        top = targetRect.top - tooltipHeight - gap;
        left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
        break;
      case 'left':
        top = targetRect.top + targetRect.height / 2 - tooltipHeight / 2;
        left = targetRect.left - tooltipWidth - gap;
        break;
      case 'right':
        top = targetRect.top + targetRect.height / 2 - tooltipHeight / 2;
        left = targetRect.left + targetRect.width + gap;
        break;
      default:
        top = targetRect.top + targetRect.height + gap;
        left = targetRect.left;
    }

    // Keep tooltip in viewport
    left = Math.max(16, Math.min(left, window.innerWidth - tooltipWidth - 16));
    top = Math.max(16, top);

    return {
      position: 'absolute',
      top: `${top}px`,
      left: `${left}px`,
      width: `${tooltipWidth}px`,
    };
  };

  // Arrow position
  const getArrowStyle = () => {
    if (!targetRect || step.position === 'center') return { display: 'none' };

    const base = {
      position: 'absolute',
      width: 0,
      height: 0,
      borderStyle: 'solid',
    };

    switch (step.position) {
      case 'bottom':
        return {
          ...base,
          top: '-10px',
          left: '50%',
          transform: 'translateX(-50%)',
          borderWidth: '0 10px 10px 10px',
          borderColor: 'transparent transparent white transparent',
        };
      case 'top':
        return {
          ...base,
          bottom: '-10px',
          left: '50%',
          transform: 'translateX(-50%)',
          borderWidth: '10px 10px 0 10px',
          borderColor: 'white transparent transparent transparent',
        };
      case 'left':
        return {
          ...base,
          right: '-10px',
          top: '50%',
          transform: 'translateY(-50%)',
          borderWidth: '10px 0 10px 10px',
          borderColor: 'transparent transparent transparent white',
        };
      case 'right':
        return {
          ...base,
          left: '-10px',
          top: '50%',
          transform: 'translateY(-50%)',
          borderWidth: '10px 10px 10px 0',
          borderColor: 'transparent white transparent transparent',
        };
      default:
        return { display: 'none' };
    }
  };

  return (
    <div className="fixed inset-0 z-[9999]">
      {/* Overlay with spotlight cutout */}
      <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }}>
        <defs>
          <mask id="spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {targetRect && (
              <rect
                x={targetRect.left - padding}
                y={targetRect.top - padding}
                width={targetRect.width + padding * 2}
                height={targetRect.height + padding * 2}
                rx="8"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.75)"
          mask="url(#spotlight-mask)"
        />
      </svg>

      {/* Highlight border around target */}
      {targetRect && (
        <div
          className="absolute border-2 border-primary rounded-lg pointer-events-none animate-pulse-border"
          style={{
            top: targetRect.top - padding,
            left: targetRect.left - padding,
            width: targetRect.width + padding * 2,
            height: targetRect.height + padding * 2,
            boxShadow: '0 0 0 4px rgba(22, 48, 108, 0.3), 0 0 20px rgba(22, 48, 108, 0.5)',
          }}
        />
      )}

      {/* Click overlay for non-target areas */}
      {!step.waitForClick && (
        <div
          className="absolute inset-0"
          onClick={(e) => {
            // Allow clicking through to target element area
            if (targetRect) {
              const { clientX, clientY } = e;
              const inTarget =
                clientX >= targetRect.left - padding &&
                clientX <= targetRect.left + targetRect.width + padding &&
                clientY >= targetRect.top - padding &&
                clientY <= targetRect.top + targetRect.height + padding;
              if (inTarget) return;
            }
            e.stopPropagation();
          }}
        />
      )}

      {/* Tooltip */}
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-5 z-10 animate-fade-in"
        style={getTooltipStyle()}
      >
        {/* Arrow */}
        <div style={getArrowStyle()} className="dark:border-gray-800" />

        {/* Progress */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-primary dark:text-blue-400">
            {stepNumber} / {totalSteps}
          </span>
          <div className="flex gap-1">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-all ${
                  i < stepNumber
                    ? 'bg-primary dark:bg-blue-400'
                    : 'bg-gray-200 dark:bg-gray-600'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">
          {step.title}
        </h3>
        <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed mb-4">
          {step.content}
        </p>

        {/* Click hint for waitForClick steps */}
        {step.waitForClick && targetRect && (
          <div className="flex items-center gap-2 text-primary dark:text-blue-400 text-sm font-medium mb-4 animate-pulse">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
            </svg>
            {t('tourClickHere')}
          </div>
        )}

        {/* Buttons */}
        <div className="flex items-center justify-between">
          <button
            onClick={onSkip}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-sm transition-colors"
          >
            {t('tourSkip')}
          </button>

          <div className="flex gap-2">
            {!isFirst && !step.waitForClick && (
              <button
                onClick={onPrev}
                className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                {t('previous')}
              </button>
            )}
            {!step.waitForClick && (
              <button
                onClick={onNext}
                className="px-4 py-1.5 text-sm rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors font-medium"
              >
                {isLast ? t('tourFinish') : t('next')}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Styles */}
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
        @keyframes pulse-border {
          0%, 100% { box-shadow: 0 0 0 4px rgba(22, 48, 108, 0.3), 0 0 20px rgba(22, 48, 108, 0.5); }
          50% { box-shadow: 0 0 0 8px rgba(22, 48, 108, 0.2), 0 0 30px rgba(22, 48, 108, 0.7); }
        }
        .animate-pulse-border {
          animation: pulse-border 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

export default TourProvider;
