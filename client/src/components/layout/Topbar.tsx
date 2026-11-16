import React, { useState } from 'react';
import { Search, Bell, X, CheckCircle2, AlertTriangle } from 'lucide-react';

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
  const [searchTerm, setSearchTerm] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(2);

  const notifications = [
    {
      id: 1,
      title: 'Budget Alert',
      message: 'You have reached 82% of your monthly Food budget.',
      time: '10m ago',
      type: 'warning',
    },
    {
      id: 2,
      title: 'Receipt Processed',
      message: 'MacBook receipt scanned: $1,280.50 categorized under Tech.',
      time: '1h ago',
      type: 'success',
    },
  ];

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchTerm(val);
    onSearch?.(val);
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
                    onClick={() => setUnreadCount(0)}
                    className="text-xs text-primary hover:underline font-medium"
                  >
                    Mark all read
                  </button>
                )}
              </div>
              <div className="divide-y divide-gray-50 mt-2 max-h-64 overflow-y-auto">
                {notifications.map((n) => (
                  <div key={n.id} className="py-2.5 flex items-start gap-3 hover:bg-navy-light/50 rounded-2xl p-2 transition-colors">
                    {n.type === 'warning' ? (
                      <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-navy">{n.title}</p>
                      <p className="text-xs text-navy-muted line-clamp-2 mt-0.5">{n.message}</p>
                      <span className="text-[10px] text-navy-muted/70 mt-1 block">{n.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Chip */}
        <div className="flex items-center gap-3 pl-2 pr-1 py-1 rounded-full bg-white/80 backdrop-blur-sm shadow-comet cursor-pointer hover:bg-white transition-all">
          <div className="w-9 h-9 rounded-full overflow-hidden bg-purple-100 border border-purple-200 flex-shrink-0">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
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
        </div>
      </div>
    </header>
  );
};
