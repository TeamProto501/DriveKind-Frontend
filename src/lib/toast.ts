import { writable } from 'svelte/store';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  dismissible?: boolean;
}

function createToastStore() {
  const { subscribe, update } = writable<Toast[]>([]);

  function addToast(toast: Omit<Toast, 'id'>) {
    const id = crypto.randomUUID();
    const newToast: Toast = {
      id,
      duration: 5000,
      dismissible: true,
      ...toast,
    };

    update(toasts => [...toasts, newToast]);

    // Auto-dismiss after duration
    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, newToast.duration);
    }

    return id;
  }

  function removeToast(id: string) {
    update(toasts => toasts.filter(t => t.id !== id));
  }

  function clearAll() {
    update(() => []);
  }

  // Convenience methods
  function success(message: string, options?: Partial<Toast>) {
    return addToast({ message, type: 'success', ...options });
  }

  function error(message: string, options?: Partial<Toast>) {
    return addToast({ message, type: 'error', ...options });
  }

  function warning(message: string, options?: Partial<Toast>) {
    return addToast({ message, type: 'warning', ...options });
  }

  function info(message: string, options?: Partial<Toast>) {
    return addToast({ message, type: 'info', ...options });
  }

  return {
    subscribe,
    addToast,
    removeToast,
    clearAll,
    success,
    error,
    warning,
    info,
  };
}

export const toastStore = createToastStore();