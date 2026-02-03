/**
 * Browser Push Notifications Hook
 *
 * Monitors for new approval requests and shows browser notifications.
 * Works when the tab is open (uses Notification API).
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { requestsAPI } from '../services/api';

// Check interval in milliseconds (60 seconds)
const CHECK_INTERVAL = 60000;

// Notification sound (optional)
const playNotificationSound = () => {
  try {
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH+JkI2JhoWFh4mMjYqGg4KDh42SkpKOiYWEhYmOkpKPi4aDg4WKj5KSkIuGg4OFio+Sk5CMh4SDhYqPkpKQjIeFhIaKj5KSkI2IhYWGio+RkpCNiIaFh4qPkZKQjYmGhYeKj5GSkI6JhoWHio+RkZCOiYaGiIqPkZGQjomHhoeKj5GRj46Jh4aHio+RkY+OiYeGh4qPkZCPjomHhoeKj5CQj46Jh4aHio+QkI+OiYeHh4qPkJCPjomHh4eKj5CQj46JiIeHio+QkI+OiYiHh4qPkJCPjomIh4iJj5CQj46JiIeIiY+QkI+OiYiHiImPkJCPjomIiIiJj5CQj46JiIiIiY+Pj46JiIiIiY+Pj46JiIiIiY+Pj46JiIiIiY+Pj46JiIiIiY+Pj46JiIiIiY+Pj46JiIiIiI+Pj46JiIiIiI+Pj46JiIiIiI+Pj46JiIiIiI+Pj46JiIiIiI+Pj46JiIiIiI+Pj46JiImIiI+Pj46JiImIiI+Pj46JiImJiI+Pj46JiImJiI+Pj46JiImJiI+Pj46KiImJiI+Pj46KiImJiY+Pj46KiImJiY+Pj46KiImJiY+Pjo6KiImJiY+Pjo6KiImJiY+Pjo6KiImJiY+Pjo6KiYmJiY+Pjo6KiYmJiY+Pjo6KiYmJiY+Pjo6KiYmJiY+Pjo6KiYmJiY+Pjo6KiYmJiY6Ojo6KiYmJiY6Ojo6KiYmJiY6Ojo6KiYmJiY6Ojo6KiYmJiY6Ojo6KiYmJiY6Ojo6KiYmJiY6Ojo6KiYmJiY6Ojo6KiYmJiY6Ojo6KiYmJiY6Ojo6KiYmJiY6Ojo6KiYmJiY6Ojo6KiYmJiY6Ojo6KiYmJiY6Ojo6KiYmJiY6Ojo6KiYmJiY6Ojo6KiYmJiY6Ojo6KiYmJiY6Ojo6KiYmJiY6Ojo6KiYmKiY6Ojo6KiYmKiY6Ojo6KiYmKiY6Ojo6KiYmKiY6Ojo6KiYmKiY6Ojo6KiYmKiY6Ojo6KiYqKiY6Ojo6KiYqKiY6Ojo6KioqKiY6Ojo6KioqKiY6Ojo6KioqKiY6Ojo6KioqKio6Ojo6KioqKio6Ojo6KioqKio6Ojo6KioqKio6Ojo6KioqKio6Ojo6KioqKio6Ojo6KioqKio6Ojo6KioqKio6Ojo6KioqKio6Njo6KioqKio6Njo6KioqKio6Njo6KioqKio6Njo6KioqKio6Njo6KioqKio6Njo6Kioq');
    audio.volume = 0.3;
    audio.play().catch(() => {}); // Ignore errors
  } catch (e) {
    // Ignore audio errors
  }
};

export function useNotifications(enabled = true) {
  const [permission, setPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  );
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    const saved = localStorage.getItem('notifications_enabled');
    return saved !== 'false'; // Default to true
  });
  const [lastCheckCount, setLastCheckCount] = useState(null);
  const [newApprovalsCount, setNewApprovalsCount] = useState(0);
  const intervalRef = useRef(null);

  // Request permission
  const requestPermission = useCallback(async () => {
    if (typeof Notification === 'undefined') {
      return 'denied';
    }

    if (Notification.permission === 'granted') {
      setPermission('granted');
      return 'granted';
    }

    if (Notification.permission !== 'denied') {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result;
    }

    return Notification.permission;
  }, []);

  // Show notification
  const showNotification = useCallback((title, options = {}) => {
    if (permission !== 'granted' || !notificationsEnabled) {
      return null;
    }

    try {
      const notification = new Notification(title, {
        icon: '/vite.svg',
        badge: '/vite.svg',
        tag: 'idm-approval',
        renotify: true,
        ...options
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
        if (options.onClick) {
          options.onClick();
        }
      };

      // Auto close after 10 seconds
      setTimeout(() => notification.close(), 10000);

      playNotificationSound();

      return notification;
    } catch (e) {
      console.error('Error showing notification:', e);
      return null;
    }
  }, [permission, notificationsEnabled]);

  // Check for new approvals
  const checkForNewApprovals = useCallback(async () => {
    if (!enabled || !notificationsEnabled) return;

    try {
      const response = await requestsAPI.myApprovals();
      const currentCount = response.data?.length || 0;

      // If this is not the first check and count increased
      if (lastCheckCount !== null && currentCount > lastCheckCount) {
        const newCount = currentCount - lastCheckCount;
        setNewApprovalsCount(newCount);

        // Show notification
        showNotification(
          newCount === 1
            ? 'Новая заявка на согласование'
            : `${newCount} новых заявок на согласование`,
          {
            body: 'Нажмите, чтобы перейти к согласованию',
            onClick: () => {
              window.location.href = '/my-approvals';
            }
          }
        );
      }

      setLastCheckCount(currentCount);
    } catch (error) {
      console.error('Error checking for new approvals:', error);
    }
  }, [enabled, notificationsEnabled, lastCheckCount, showNotification]);

  // Toggle notifications
  const toggleNotifications = useCallback(async () => {
    if (!notificationsEnabled) {
      // Turning on - request permission first
      const perm = await requestPermission();
      if (perm === 'granted') {
        setNotificationsEnabled(true);
        localStorage.setItem('notifications_enabled', 'true');
      }
    } else {
      // Turning off
      setNotificationsEnabled(false);
      localStorage.setItem('notifications_enabled', 'false');
    }
  }, [notificationsEnabled, requestPermission]);

  // Start periodic checking
  useEffect(() => {
    if (!enabled || !notificationsEnabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Initial check
    checkForNewApprovals();

    // Set up interval
    intervalRef.current = setInterval(checkForNewApprovals, CHECK_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, notificationsEnabled, checkForNewApprovals]);

  // Request permission on mount if notifications are enabled
  useEffect(() => {
    if (notificationsEnabled && permission === 'default') {
      requestPermission();
    }
  }, [notificationsEnabled, permission, requestPermission]);

  return {
    permission,
    notificationsEnabled,
    toggleNotifications,
    requestPermission,
    showNotification,
    newApprovalsCount,
    isSupported: typeof Notification !== 'undefined'
  };
}

export default useNotifications;
