import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  BookImage,
  ClipboardList,
  Timer,
  FlaskConical,
  Calculator,
  Star,
  Archive,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { useUIStore } from '@/stores';

const navItems = [
  { path: '/', label: '工作台', icon: LayoutDashboard },
  { path: '/materials', label: '素材库', icon: BookImage },
  { path: '/recipe', label: '配方板', icon: ClipboardList },
  { path: '/timeline', label: '工序时间线', icon: Timer },
  { path: '/trials', label: '试做记录', icon: FlaskConical },
  { path: '/cost', label: '采购成本', icon: Calculator },
  { path: '/review', label: '评审发布', icon: Star },
  { path: '/archive', label: '资料归档', icon: Archive },
];

export default function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const location = useLocation();

  return (
    <aside
      className={`fixed left-0 top-0 h-screen z-40 flex flex-col transition-all duration-300 ${
        sidebarCollapsed ? 'w-16' : 'w-52'
      }`}
      style={{
        background: 'linear-gradient(180deg, #0f0f1a 0%, #1a1a2e 100%)',
        borderRight: '1px solid rgba(245,240,232,0.08)',
      }}
    >
      <div className="flex items-center gap-3 px-4 py-5 border-b border-white/5">
        <div
          className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0"
          style={{ background: 'var(--vermilion)' }}
        >
          <span className="font-calligraphy text-white text-sm font-bold">古</span>
        </div>
        {!sidebarCollapsed && (
          <div className="overflow-hidden">
            <h1 className="font-calligraphy text-lg leading-tight" style={{ color: 'var(--paper)' }}>
              古味寻踪
            </h1>
            <p className="text-xs" style={{ color: 'var(--smoke-light)' }}>
              失传菜谱复原
            </p>
          </div>
        )}
      </div>

      <nav className="flex-1 py-3 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = item.path === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(item.path);
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 mx-2 px-3 py-2.5 rounded-md text-sm transition-all duration-200 group ${
                isActive
                  ? 'text-white'
                  : 'hover:bg-white/5'
              }`}
              style={isActive ? {
                background: 'linear-gradient(90deg, rgba(192,57,43,0.2), transparent)',
                borderLeft: '3px solid var(--vermilion)',
              } : {
                color: 'var(--smoke-light)',
                borderLeft: '3px solid transparent',
              }}
            >
              <item.icon
                size={18}
                style={{ color: isActive ? 'var(--vermilion)' : 'var(--smoke-light)' }}
                className="flex-shrink-0 transition-colors group-hover:text-white/80"
              />
              {!sidebarCollapsed && (
                <span className="truncate">{item.label}</span>
              )}
            </NavLink>
          );
        })}
      </nav>

      <button
        onClick={toggleSidebar}
        className="flex items-center justify-center py-3 border-t border-white/5 transition-colors hover:bg-white/5"
        style={{ color: 'var(--smoke-light)' }}
      >
        {sidebarCollapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
      </button>
    </aside>
  );
}
