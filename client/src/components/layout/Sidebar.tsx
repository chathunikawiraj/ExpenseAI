import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  ArrowLeftRight,
  Receipt,
  PieChart,
  BarChart3,
  Sparkles,
  Settings,
  ShieldAlert,
  Rocket
} from 'lucide-react';

interface SidebarProps {
  isAdmin?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ isAdmin = true }) => {
  const location = useLocation();

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
    { to: '/receipts', label: 'Receipt Scanner', icon: Receipt },
    { to: '/budgets', label: 'Budgets & Goals', icon: PieChart },
    { to: '/analytics', label: 'Analytics & Reports', icon: BarChart3 },
    { to: '/insights', label: 'AI Insights', icon: Sparkles },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  if (isAdmin) {
    navItems.push({ to: '/admin', label: 'Admin Portal', icon: ShieldAlert });
  }

  return (
    <>
      {/* Desktop / Tablet Left Sidebar */}
      <aside className="hidden md:flex flex-col items-center py-6 px-3 w-20 lg:w-24 min-h-screen bg-transparent z-20 flex-shrink-0 select-none">
        {/* Brand / Logo */}
        <div className="mb-10 flex flex-col items-center">
          <div className="w-12 h-12 rounded-2xl bg-white shadow-comet flex items-center justify-center text-primary group cursor-pointer transition-transform hover:scale-105">
            <Rocket className="w-6 h-6 stroke-[2.2] text-primary" />
          </div>
          <span className="text-[10px] font-bold text-navy-muted mt-1 uppercase tracking-wider">AI</span>
        </div>

        {/* Navigation Icons */}
        <nav className="flex-1 flex flex-col items-center space-y-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.to);

            return (
              <NavLink
                key={item.to}
                to={item.to}
                title={item.label}
                className="group relative flex items-center justify-center"
              >
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                    isActive
                      ? 'bg-primary text-white shadow-comet-glow scale-105'
                      : 'text-navy-muted hover:text-navy hover:bg-white/80'
                  }`}
                >
                  <Icon className="w-5 h-5 stroke-[2]" />
                </div>

                {/* Hover Tooltip */}
                <div className="absolute left-16 px-3 py-1.5 bg-navy text-white text-xs font-semibold rounded-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 shadow-lg whitespace-nowrap z-50">
                  {item.label}
                  <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-navy rotate-45" />
                </div>
              </NavLink>
            );
          })}
        </nav>
      </aside>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-purple-100 py-2 px-4 z-50 flex items-center justify-around shadow-lg">
        {navItems.slice(0, 5).map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname.startsWith(item.to);

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`p-2.5 rounded-2xl flex flex-col items-center transition-colors ${
                isActive ? 'text-primary bg-primary-light' : 'text-navy-muted hover:text-navy'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium mt-0.5">{item.label.split(' ')[0]}</span>
            </NavLink>
          );
        })}
      </nav>
    </>
  );
};
