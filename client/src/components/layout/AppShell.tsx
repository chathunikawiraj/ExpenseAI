import React, { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

interface AppShellProps {
  children: ReactNode;
  rightPanel?: ReactNode;
  onSearch?: (term: string) => void;
  isAdmin?: boolean;
}

export const AppShell: React.FC<AppShellProps> = ({
  children,
  rightPanel,
  onSearch,
  isAdmin = true,
}) => {
  return (
    <div className="min-h-screen bg-background relative flex flex-col md:flex-row text-navy font-sans antialiased overflow-x-hidden">
      {/* Ambient color glow for the Midnight AI theme */}
      <div className="bg-ambient-blobs" aria-hidden="true">
        <div className="blob-pink" />
        <div className="blob-lavender" />
        <div className="blob-blue" />
      </div>

      {/* Slim icon-only left sidebar */}
      <Sidebar isAdmin={isAdmin} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 z-10 pb-20 md:pb-6">
        <Topbar onSearch={onSearch} />

        <main className="flex-1 px-4 sm:px-6 md:px-8 py-2 max-w-7xl w-full mx-auto">
          {rightPanel ? (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
              {/* Central primary content (e.g. Dashboard) */}
              <div className="xl:col-span-8 flex flex-col gap-6">
                {children}
              </div>

              {/* Right Panel matching Comet Wallet right column */}
              <aside className="xl:col-span-4 flex flex-col gap-6">
                {rightPanel}
              </aside>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {children}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
