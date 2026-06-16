import { create } from 'zustand';

export const useUIStore = create((set, get) => ({
  // Theme state
  theme: localStorage.getItem('theme') || 'light',
  setTheme: (theme) => {
    localStorage.setItem('theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    set({ theme });
  },
  toggleTheme: () => {
    const nextTheme = get().theme === 'light' ? 'dark' : 'light';
    get().setTheme(nextTheme);
  },

  // Sidebar collapse state (desktop toggle)
  sidebarCollapsed: localStorage.getItem('sidebarCollapsed') === 'true',
  setSidebarCollapsed: (collapsed) => {
    localStorage.setItem('sidebarCollapsed', collapsed);
    set({ sidebarCollapsed: collapsed });
  },
  toggleSidebar: () => {
    get().setSidebarCollapsed(!get().sidebarCollapsed);
  },

  // Toast notification state
  toasts: [],
  addToast: (message, type = 'success') => {
    const id = Date.now() + Math.random().toString(36).substr(2, 9);
    set((state) => ({
      toasts: [...state.toasts, { id, message, type }],
    }));
    // Auto-remove after 4 seconds
    setTimeout(() => {
      get().removeToast(id);
    }, 4000);
  },
  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },
}));
