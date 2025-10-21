import { NavLink, useLocation } from 'react-router-dom';
import { BarChart3, Home, Search, Heart, User, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Sidebar, 
  SidebarContent, 
  SidebarGroup, 
  SidebarGroupContent, 
  SidebarMenu, 
  SidebarMenuButton, 
  SidebarMenuItem, 
  useSidebar 
} from '@/components/ui/sidebar';

const navigationItems = [
  { title: 'Dashboard', path: '/admin', icon: BarChart3 },
  { title: 'Home', path: '/', icon: Home },
  { title: 'Search', path: '/search', icon: Search },
  { title: 'Likes', path: '/likes', icon: Heart },
  { title: 'Profile', path: '/profile', icon: User },
];

export function AdminSidebar() {
  const { signOut } = useAuth();
  const location = useLocation();
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';

  const isActive = (path: string) => {
    if (path === '/admin') {
      return location.pathname === '/admin';
    }
    return location.pathname === path;
  };

  const SidebarNavItem = ({ item }: { item: typeof navigationItems[0] }) => {
    const active = isActive(item.path);
    
    return (
      <SidebarMenuItem>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <SidebarMenuButton asChild>
                <NavLink 
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    active 
                      ? 'bg-primary text-primary-foreground' 
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  } ${isCollapsed ? 'justify-center' : ''}`}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  {!isCollapsed && <span>{item.title}</span>}
                </NavLink>
              </SidebarMenuButton>
            </TooltipTrigger>
            {isCollapsed && (
              <TooltipContent side="right" className="ml-2 bg-popover text-popover-foreground border shadow-lg">
                <p className="font-medium">{item.title}</p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar
      className={`border-r transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-64'}`}
      variant="sidebar"
    >
      <SidebarContent className="p-4">
        <div className="flex items-center justify-between mb-6">
          {!isCollapsed && (
            <h2 className="text-lg font-semibold">Admin Panel</h2>
          )}
        </div>

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-2">
              {navigationItems.map((item) => (
                <SidebarNavItem key={item.title} item={item} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="mt-auto pt-4 border-t">
          {isCollapsed ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => signOut()}
                    className="w-full h-12 text-muted-foreground hover:text-foreground hover:bg-muted"
                  >
                    <LogOut className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>Sign Out</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <Button
              variant="ghost"
              onClick={() => signOut()}
              className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              <LogOut className="h-5 w-5" />
              Sign Out
            </Button>
          )}
        </div>
      </SidebarContent>
    </Sidebar>
  );
}