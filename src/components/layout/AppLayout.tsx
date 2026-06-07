import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useUIStore } from '@/stores';

export default function AppLayout() {
  const { sidebarCollapsed, toasts, removeToast } = useUIStore();

  return (
    <div className="min-h-screen paper-texture" style={{ background: 'var(--ink-deep)' }}>
      <Sidebar />
      <main
        className="transition-all duration-300 min-h-screen"
        style={{ marginLeft: sidebarCollapsed ? 64 : 208 }}
      >
        <div className="p-6">
          <Outlet />
        </div>
      </main>

      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="animate-fade-in flex items-center gap-2 px-4 py-2.5 rounded-md text-sm shadow-lg cursor-pointer"
            style={{
              background: toast.type === 'success'
                ? 'var(--bamboo)'
                : toast.type === 'error'
                ? 'var(--vermilion)'
                : 'var(--smoke)',
              color: 'var(--paper)',
            }}
            onClick={() => removeToast(toast.id)}
          >
            <span className="font-calligraphy text-base">
              {toast.type === 'success' ? '✓' : toast.type === 'error' ? '✗' : '●'}
            </span>
            {toast.message}
          </div>
        ))}
      </div>
    </div>
  );
}
