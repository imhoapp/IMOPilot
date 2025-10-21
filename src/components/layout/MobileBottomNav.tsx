import { Link, useLocation } from 'react-router-dom';
import { Home, Search, Heart, User } from 'lucide-react';

export const MobileBottomNav = () => {
  const location = useLocation();
  
  // Don't show bottom nav on auth, payment, checkout, or admin pages
  const hideNavPaths = ['/auth', '/payment-success', '/payment-canceled', '/checkout', '/admin'];
  const shouldHideNav = hideNavPaths.some(path => location.pathname.startsWith(path));
  
  if (shouldHideNav) {
    return null;
  }
  
  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  const navItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/search', icon: Search, label: 'Search' },
    { path: '/likes', icon: Heart, label: 'Likes' },
    { path: '/profile', icon: User, label: 'Profile' },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-t border-border/20">
      <div className="grid grid-cols-4 h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          
          return (
            <Link 
              key={item.path}
              to={item.path} 
              className={`flex flex-col items-center justify-center space-y-1 transition-colors ${
                active 
                  ? 'text-primary font-medium' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};