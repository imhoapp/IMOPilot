import { useState } from 'react';
import { ShoppingBag, Menu, X, Heart } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { ThemeToggle } from "@/components/theme-toggle";
import { AnimatedSearch } from "@/components/animated-search";
import { UserMenu } from "@/components/auth/UserMenu";
import { SubscriptionStatusIndicator } from "@/components/subscription/SubscriptionStatusIndicator";
import { useAuth } from '@/hooks/useAuth';

export const SearchHeader = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const { user } = useAuth();

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  const navigationItems = [
    { name: 'Home', path: '/' },
    { name: 'About', path: '/about' },
    { name: 'How It Works', path: '/how-it-works' },
    { name: 'Pricing', path: '/pricing' },
    { name: 'FAQ', path: '/faq' },
    { name: 'Contact', path: '/contact' },
  ];

  const userItems: any[] = [];

  const closeSheet = () => setIsOpen(false);

  return (
    <div className="sticky top-0 z-50 border-b border-border/20 backdrop-blur-xl bg-background/70 supports-[backdrop-filter]:bg-background/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
            <div className="bg-gradient-primary p-2 rounded-xl">
              <ShoppingBag className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold text-gradient">IMO</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-6">
            {navigationItems.map((item) => (
              <Link
                key={item.name}
                to={item.path}
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  isActive(item.path)
                    ? 'text-primary'
                    : 'text-muted-foreground'
                }`}
              >
                {item.name}
              </Link>
            ))}
            
            {userItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`flex items-center space-x-1 text-sm font-medium transition-colors hover:text-primary ${
                    isActive(item.path)
                      ? 'text-primary'
                      : 'text-muted-foreground'
                  }`}
                >
                  {Icon && <Icon className="h-4 w-4" />}
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>

          <div className="flex items-center space-x-3">
            <SubscriptionStatusIndicator variant="badge" size="sm" />
            <ThemeToggle />
            <div className="hidden sm:block">
              <AnimatedSearch />
            </div>
            
            {user ? (
              <UserMenu />
            ) : (
              <div className="hidden sm:flex items-center space-x-2">
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/auth?tab=signin">Sign In</Link>
                </Button>
                <Button size="sm" asChild>
                  <Link to="/auth?tab=signup">Sign Up</Link>
                </Button>
              </div>
            )}

            {/* Mobile menu trigger */}
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild className="lg:hidden">
                <Button variant="ghost" size="sm">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72 [&>button]:hidden">
                <div className="flex items-center justify-between mb-8">
                  <Link to="/" onClick={closeSheet} className="flex items-center space-x-2">
                    <div className="bg-gradient-primary p-2 rounded-xl">
                      <ShoppingBag className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-lg font-bold text-gradient">IMO</span>
                  </Link>
                  <Button variant="ghost" size="sm" onClick={closeSheet}>
                    <X className="h-5 w-5" />
                  </Button>
                </div>

                <div className="space-y-6">
                  <div className="space-y-3">
                    {navigationItems.map((item) => (
                      <Link
                        key={item.name}
                        to={item.path}
                        onClick={closeSheet}
                        className={`block px-3 py-2 rounded-lg text-base font-medium transition-colors ${
                          isActive(item.path)
                            ? 'bg-primary/10 text-primary'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                        }`}
                      >
                        {item.name}
                      </Link>
                    ))}
                  </div>

                  {userItems.length > 0 && (
                    <div className="border-t pt-6 space-y-3">
                      <div className="px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Your Account
                      </div>
                      {userItems.map((item) => {
                        const Icon = item.icon;
                        return (
                          <Link
                            key={item.name}
                            to={item.path}
                            onClick={closeSheet}
                            className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-base font-medium transition-colors ${
                              isActive(item.path)
                                ? 'bg-primary/10 text-primary'
                                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                            }`}
                          >
                            {Icon && <Icon className="h-4 w-4" />}
                            <span>{item.name}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}

                  {!user && (
                    <div className="border-t pt-6 space-y-3">
                      <Button 
                        variant="ghost" 
                        className="w-full justify-start" 
                        asChild
                      >
                        <Link to="/auth?tab=signin" onClick={closeSheet}>
                          Sign In
                        </Link>
                      </Button>
                      <Button 
                        size="sm"
                        className="w-full" 
                        asChild
                      >
                        <Link to="/auth?tab=signup" onClick={closeSheet}>
                          Sign Up
                        </Link>
                      </Button>
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </div>
  );
};