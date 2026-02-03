import React, { useState, useEffect } from 'react';
import { useLanguage } from '../App';

const OnboardingTour = ({ user, onComplete }) => {
  const { t } = useLanguage();
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  // Determine user role
  const isAdmin = user?.is_superuser || user?.is_demo;
  const isManager = user?.roles?.some(r =>
    r.name?.toLowerCase().includes('manager') ||
    r.name?.toLowerCase().includes('approver') ||
    r.name?.toLowerCase().includes('менеджер') ||
    r.name?.toLowerCase().includes('согласующий')
  ) || user?.is_superuser;

  // Check if user has seen the tour
  useEffect(() => {
    const tourKey = `onboarding_seen_${user?.id}`;
    const hasSeen = localStorage.getItem(tourKey);
    if (!hasSeen && user?.id) {
      setIsVisible(true);
    }
  }, [user?.id]);

  const handleComplete = () => {
    const tourKey = `onboarding_seen_${user?.id}`;
    localStorage.setItem(tourKey, 'true');
    setIsVisible(false);
    onComplete?.();
  };

  const handleSkip = () => {
    handleComplete();
  };

  // Tour steps based on role
  const getSteps = () => {
    const baseSteps = [
      {
        icon: '👋',
        titleKey: 'tourWelcomeTitle',
        descKey: 'tourWelcomeDesc',
      },
      {
        icon: '📝',
        titleKey: 'tourCreateRequestTitle',
        descKey: 'tourCreateRequestDesc',
      },
      {
        icon: '📋',
        titleKey: 'tourMyRequestsTitle',
        descKey: 'tourMyRequestsDesc',
      },
      {
        icon: '🔍',
        titleKey: 'tourSearchTitle',
        descKey: 'tourSearchDesc',
      },
    ];

    const managerSteps = [
      {
        icon: '✅',
        titleKey: 'tourApprovalsTitle',
        descKey: 'tourApprovalsDesc',
      },
      {
        icon: '🔔',
        titleKey: 'tourNotificationsTitle',
        descKey: 'tourNotificationsDesc',
      },
    ];

    const adminSteps = [
      {
        icon: '⚙️',
        titleKey: 'tourAdminTitle',
        descKey: 'tourAdminDesc',
      },
      {
        icon: '👥',
        titleKey: 'tourUsersTitle',
        descKey: 'tourUsersDesc',
      },
      {
        icon: '🖥️',
        titleKey: 'tourSystemsTitle',
        descKey: 'tourSystemsDesc',
      },
      {
        icon: '📊',
        titleKey: 'tourAuditTitle',
        descKey: 'tourAuditDesc',
      },
    ];

    let steps = [...baseSteps];

    if (isManager) {
      steps = [...steps, ...managerSteps];
    }

    if (isAdmin) {
      steps = [...steps, ...adminSteps];
    }

    // Final step
    steps.push({
      icon: '🎉',
      titleKey: 'tourCompleteTitle',
      descKey: 'tourCompleteDesc',
    });

    return steps;
  };

  const steps = getSteps();
  const currentStepData = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      handleComplete();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    setCurrentStep(prev => Math.max(0, prev - 1));
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-scale-in">
        {/* Progress bar */}
        <div className="h-1 bg-gray-200 dark:bg-gray-700">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>

        {/* Content */}
        <div className="p-8">
          {/* Icon */}
          <div className="text-6xl text-center mb-4 animate-bounce-slow">
            {currentStepData.icon}
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-center text-gray-800 dark:text-white mb-4">
            {t(currentStepData.titleKey)}
          </h2>

          {/* Description */}
          <p className="text-gray-600 dark:text-gray-300 text-center leading-relaxed">
            {t(currentStepData.descKey)}
          </p>

          {/* Role badge */}
          {currentStep === 0 && (
            <div className="mt-4 flex justify-center">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                isAdmin
                  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  : isManager
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                    : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              }`}>
                {isAdmin ? t('tourRoleAdmin') : isManager ? t('tourRoleManager') : t('tourRoleUser')}
              </span>
            </div>
          )}

          {/* Step indicator */}
          <div className="flex justify-center gap-2 mt-6">
            {steps.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentStep
                    ? 'bg-primary w-6'
                    : index < currentStep
                      ? 'bg-primary/50'
                      : 'bg-gray-300 dark:bg-gray-600'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 pb-8 flex justify-between items-center">
          <button
            onClick={handleSkip}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-sm"
          >
            {t('tourSkip')}
          </button>

          <div className="flex gap-3">
            {currentStep > 0 && (
              <button
                onClick={handlePrev}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                {t('previous')}
              </button>
            )}
            <button
              onClick={handleNext}
              className="px-6 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors font-medium"
            >
              {isLastStep ? t('tourStart') : t('next')}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes scale-in {
          0% { transform: scale(0.9); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-scale-in {
          animation: scale-in 0.3s ease-out;
        }
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-bounce-slow {
          animation: bounce-slow 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default OnboardingTour;
