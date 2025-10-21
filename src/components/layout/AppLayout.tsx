import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { MobileBottomNav } from './MobileBottomNav';
import { SearchHeader } from '../search/SearchHeader';

interface AppLayoutProps {
  children: ReactNode;
}

export const AppLayout = ({ children }: AppLayoutProps) => {
  const location = useLocation();
  
  // Hide header on auth pages
  const hideHeaderPaths = ['/auth'];
  const shouldShowHeader = !hideHeaderPaths.some(path => location.pathname.startsWith(path));
  
  return (
    <div className="min-h-screen bg-background">
      {shouldShowHeader && <SearchHeader />}
      {children}
      <MobileBottomNav />
      {/* Add bottom padding for mobile to avoid content being hidden behind bottom nav */}
      <div className="md:hidden h-16" />
    </div>
  );
};