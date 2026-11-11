/**
 * LogicLab - Global Application Store (Zustand style hook or pure reactive state)
 * Handles themes (light/dark/system), current project, notifications, active navigation
 */

import { useState, useEffect } from 'react';
import { ProjectMetadata } from '../types';

export type AppTheme = 'light' | 'dark' | 'system';
export type ActiveTab =
  | 'circuit'
  | 'truth-table'
  | 'karnaugh'
  | 'boolean-solver'
  | 'components'
  | 'education'
  | 'projects'
  | 'practice';

export interface ToastNotification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
}

// Initial theme setup with local storage
function getInitialTheme(): AppTheme {
  try {
    const saved = localStorage.getItem('logiclab_theme');
    if (saved === 'light' || saved === 'dark' || saved === 'system') {
      return saved;
    }
  } catch {
    // ignore
  }
  return 'dark'; // High-contrast engineering default
}

function applyThemeToDocument(theme: AppTheme) {
  const root = document.documentElement;
  const isDark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  if (isDark) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

// Global subscribers for reactive updates
let currentTheme: AppTheme = getInitialTheme();
let activeTab: ActiveTab = 'circuit';
let currentProject: ProjectMetadata = {
  id: 'proj_default',
  name: 'Proyecto Sin Título',
  description: 'Circuito digital en diseño',
  version: '1.0.0',
  createdAt: Date.now(),
  updatedAt: Date.now(),
};
let notifications: ToastNotification[] = [];

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

// Apply theme on load
applyThemeToDocument(currentTheme);

// Listen to OS prefers-color-scheme changes when in system mode
if (typeof window !== 'undefined' && window.matchMedia) {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const handleSystemChange = () => {
    if (currentTheme === 'system') {
      applyThemeToDocument('system');
      notify();
    }
  };
  mediaQuery.addEventListener?.('change', handleSystemChange);
}

export interface SharedBooleanFunction {
  expression: string;
  variableCount: number;
  variables: string[];
  source?: 'builder' | 'circuit' | 'solver' | 'karnaugh' | 'table';
  minterms?: number[];
  dontCares?: number[];
  timestamp: number;
}

let sharedBooleanFunction: SharedBooleanFunction | null = null;

export function useAppStore() {
  const [, setTick] = useState(0);

  useEffect(() => {
    const listener = () => setTick((t) => t + 1);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const setTheme = (theme: AppTheme) => {
    currentTheme = theme;
    try {
      localStorage.setItem('logiclab_theme', theme);
    } catch {
      // ignore
    }
    applyThemeToDocument(theme);
    notify();
  };

  const setActiveTab = (tab: ActiveTab) => {
    activeTab = tab;
    notify();
  };

  const setProjectName = (name: string) => {
    currentProject = { ...currentProject, name, updatedAt: Date.now() };
    notify();
  };

  const showToast = (type: ToastNotification['type'], message: string, duration = 4000) => {
    const id = `toast_${Date.now()}_${Math.random()}`;
    notifications = [...notifications, { id, type, message }];
    notify();

    setTimeout(() => {
      notifications = notifications.filter((n) => n.id !== id);
      notify();
    }, duration);
  };

  const dismissToast = (id: string) => {
    notifications = notifications.filter((n) => n.id !== id);
    notify();
  };

  const setSharedBooleanFunction = (fn: SharedBooleanFunction | null) => {
    sharedBooleanFunction = fn;
    notify();
  };

  return {
    theme: currentTheme,
    setTheme,
    activeTab,
    setActiveTab,
    project: currentProject,
    setProjectName,
    notifications,
    showToast,
    dismissToast,
    sharedBooleanFunction,
    setSharedBooleanFunction,
  };
}
