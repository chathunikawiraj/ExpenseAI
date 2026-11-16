import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bell, X, CheckCircle2, AlertTriangle, LogOut, Settings, Info } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { useToast } from '../common/Toast';

interface TopbarProps {
  onSearch?: (term: string) => void;
  user?: {
    name: string;
    role: string;
    avatarUrl?: string;
  };
}

export const Topbar: React.FC<TopbarProps> = ({
  onSearch,
  user = {
    name: 'Jonathan',
    role: 'admin',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
  },
}) => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { notifications, unreadCount, markAllAsRead, markAsRead } = useNotifications();
  const { showToast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchTerm(val);
    onSearch?.(val);
  };

  useEffect(() => {
    if (!showProfileMenu) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !profileMenuRef.current?.contains(event.target)) {
        setShowProfileMenu(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowProfileMenu(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showProfileMenu]);

  const handleSignOut = async () => {
    setShowProfileMenu(false);
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch {
      showToast('Unable to sign out right now. Please try again.', 'error');
    }
  };

  return (
    <header className="w-full flex items-center justify-between py-4 px-6 md:px-8 z-10">
      {/* Brand title on mobile / Desktop Search Pill */}
      <div className="flex items-center gap-4 flex-1 max-w-md">
        <div className="relative w-full">
          <input
            type="text"
            value={searchTerm}
            onChange={handleSearchChange}
            placeholder="Search everything..."
            className="w-full pl-11 pr-4 py-2.5 bg-white text-sm text-navy placeholder:text-navy-muted rounded-full shadow-comet border border-transparent focus:border-primary/30 focus:outline-none transition-all"
          />
          <Search className="w-4 h-4 text-navy-muted absolute left-4 top-1/2 -translate-y-1/2" />
          {searchTerm && (
            <button
              onClick={() => {
                setSearchTerm('');
                onSearch?.('');
              }}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-navy-muted hover:text-navy"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Right Controls: Notifications & User Profile */}
      <div className="flex items-center gap-4 sm:gap-6 ml-4">
        {/* Notifications Bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="w-10 h-10 rounded-full bg-white shadow-comet flex items-center justify-center text-navy-muted hover:text-navy hover:shadow-comet-hover transition-all relative"
            aria-label="View notifications"
          >
            <Bell className="w-5 h-5 stroke-[1.8]" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-primary text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-background shadow-sm">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-3 w-80 bg-white rounded-3xl shadow-comet-lg border border-purple-50 p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <span className="font-bold text-navy text-sm">Notifications</span>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-primary hover:underline font-medium"
                  >
                    Mark all read
                  </button>
                )}
              </div>
              <div className="divide-y divide-gray-50 mt-2 max-h-64 overflow-y-auto">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`py-2.5 flex items-start gap-3 hover:bg-navy-light/50 rounded-2xl p-2 transition-colors ${
                      n.isRead ? 'opacity-70' : ''
                    }`}
                  >
                    {n.type === 'BUDGET_80' ? (
                      <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                    ) : n.type === 'OCR_PROCESSED' ? (
                      <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-primary-light text-primary flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Info className="w-4 h-4" />
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-navy">
                        {n.type === 'BUDGET_80'
                          ? 'Budget Alert'
                          : n.type === 'OCR_PROCESSED'
                            ? 'Receipt Processed'
                            : 'Account Update'}
                      </p>
                      <p className="text-xs text-navy-muted line-clamp-2 mt-0.5">{n.message}</p>
                      <time className="text-[10px] text-navy-muted/70 mt-1 block" dateTime={n.createdAt}>
                        {new Date(n.createdAt).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </time>
                    </div>
                    {!n.isRead && (
                      <button
                        type="button"
                        onClick={() => markAsRead(n.id)}
                        aria-label="Mark notification as read"
                        className="rounded-full p-1 text-navy-muted hover:bg-emerald-50 hover:text-emerald-600"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowNotifications(false);
                  navigate('/notifications');
                }}
                className="mt-3 w-full rounded-full bg-primary-light px-4 py-2.5 text-xs font-bold text-primary transition-colors hover:bg-primary hover:text-white"
              >
                See all notifications
              </button>
            </div>
          )}
        </div>

        {/* User Profile Chip */}
        <div className="relative" ref={profileMenuRef}>
          <button
            type="button"
            onClick={() => setShowProfileMenu((open) => !open)}
            aria-label="Open user profile menu"
            aria-haspopup="menu"
            aria-expanded={showProfileMenu}
            className="flex items-center gap-3 pl-2 pr-1 py-1 rounded-full bg-white/80 backdrop-blur-sm shadow-comet hover:bg-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <div className="w-9 h-9 rounded-full overflow-hidden bg-purple-100 border border-purple-200 flex-shrink-0">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-bold text-primary text-xs">
                  {user.name.charAt(0)}
                </div>
              )}
            </div>
            <div className="pr-3 hidden sm:flex flex-col text-left">
              <span className="text-xs font-bold text-navy leading-tight">{user.name}</span>
              <span className="text-[10px] font-semibold text-navy-muted uppercase tracking-wider leading-tight">
                {user.role}
              </span>
            </div>
          </button>

          {showProfileMenu && (
            <div
              role="menu"
              aria-label="User profile options"
              className="absolute right-0 mt-3 w-52 rounded-2xl border border-purple-100 bg-white p-2 shadow-comet-lg z-50"
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setShowProfileMenu(false);
                  navigate('/settings');
                }}
                className="w-full flex items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs font-semibold text-navy hover:bg-primary-light hover:text-primary transition-colors"
              >
                <Settings className="w-4 h-4" />
                Profile & settings
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={handleSignOut}
                className="w-full flex items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs font-semibold text-rose-500 hover:bg-rose-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
