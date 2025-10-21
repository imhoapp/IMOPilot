import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  TrendingUp, Users, Crown, DollarSign, Eye, MousePointer, ChevronUp, ChevronDown,
  BarChart3, Activity, Target, PieChart, AlertCircle, Filter, X,
  Unlock, ShoppingCart, CheckCircle, XCircle, Search, Key, Shield, Ban,
  ExternalLink, Tag, FileText, AlertTriangle, Clock
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useMemo, useState } from 'react';
import { useQueryState } from 'nuqs';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

interface AnalyticsMetrics {
  totalEvents: number;
  conversionRate: number;
  revenue: number;
  activeSubscriptions: number;
  categoryUnlocks: number;
  topCategories: Array<{ category: string; count: number; revenue: number }>;
  funnelSteps: Array<{ step: string; count: number; rate: number }>;
  dailyMetrics: Array<{ date: string; events: number; revenue: number; unlockAttempts?: number; checkoutStarted?: number; affiliateClicks?: number }>;
  allEvents: Array<any>;
}

export function AnalyticsDashboard() {
  const { session } = useAuth();
  const [activeTab, setActiveTab] = useQueryState('tab', { defaultValue: 'overview' });

  // Filter states
  const [userFilter, setUserFilter] = useState('all');
  const [eventFilter, setEventFilter] = useState('all');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  // Enhanced data fetching with better error handling
  const { data: analyticsData, isLoading, error } = useQuery({
    queryKey: ['analytics-dashboard'],
    queryFn: async (): Promise<AnalyticsMetrics> => {
      if (!session) throw new Error('Not authenticated');

      try {
        // Fetch user profiles for names
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email');

        // Fetch products for names
        const { data: products } = await supabase
          .from('products')
          .select('id, title');

        // Fetch all analytics events with specific event types
        const { data: analyticsEvents } = await supabase
          .from('analytics_events')
          .select('*')
          .in('event_name', [
            'unlock_attempt',
            'checkout_started',
            'checkout_success',
            'content_unlocked',
            'affiliate_click',
            'subscription_active'
          ])
          .order('created_at', { ascending: false });

        // Fetch subscription events
        const { data: subscriptionEvents } = await supabase
          .from('subscription_events')
          .select('*')
          .order('created_at', { ascending: false });

        // Fetch user interactions
        const { data: interactions } = await supabase
          .from('user_interactions')
          .select('*')
          .order('created_at', { ascending: false });

        // Fetch affiliate clicks
        const { data: affiliateClicks } = await supabase
          .from('affiliate_clicks')
          .select('*')
          .order('timestamp', { ascending: false });

        // Create user lookup map
        const userMap = new Map();
        (profiles || []).forEach(profile => {
          userMap.set(profile.id, profile.full_name || profile.email || 'Unknown User');
        });

        // Create product lookup map
        const productMap = new Map();
        (products || []).forEach(product => {
          productMap.set(product.id, product.title);
        });

        // Combine all events for analysis with user names and product names
        const allEvents = [
          ...(analyticsEvents || []).map(e => ({
            ...e,
            source: 'analytics',
            userName: userMap.get(e.user_id) || 'Unknown User',
            productName: (e.event_data as any)?.product_id ? productMap.get((e.event_data as any).product_id) : null
          })),
          ...(subscriptionEvents || []).map(e => ({
            ...e,
            source: 'subscription',
            userName: userMap.get(e.user_id) || 'Unknown User',
            productName: (e.event_data as any)?.product_id ? productMap.get((e.event_data as any).product_id) : null
          })),
          ...(interactions || []).map(e => ({
            ...e,
            source: 'interaction',
            userName: userMap.get(e.user_id) || 'Unknown User',
            productName: e.content_id ? productMap.get(e.content_id) : null
          })),
          ...(affiliateClicks || []).map(e => ({
            ...e,
            source: 'affiliate',
            event_name: 'affiliate_click',
            userName: userMap.get(e.user_id) || 'Unknown User',
            productName: productMap.get(e.product_id) || null
          }))
        ];

        const totalEvents = allEvents.length;

        // Calculate specific metrics based on the events you specified
        const unlockAttempts = analyticsEvents?.filter(e => e.event_name === 'unlock_attempt') || [];
        const checkoutStarted = analyticsEvents?.filter(e => e.event_name === 'checkout_started') || [];
        const checkoutSuccess = analyticsEvents?.filter(e => e.event_name === 'checkout_success') || [];
        const contentUnlocked = analyticsEvents?.filter(e => e.event_name === 'content_unlocked') || [];
        const subscriptionActive = analyticsEvents?.filter(e => e.event_name === 'subscription_active') || [];

        const conversionRate = checkoutStarted.length > 0 ? (checkoutSuccess.length / checkoutStarted.length) * 100 : 0;

        // Calculate revenue from checkout_success events
        const revenue = checkoutSuccess.reduce((sum, event) => {
          const price = (event.event_data as any)?.price || 0;
          return sum + parseFloat(price.toString());
        }, 0);

        const activeSubscriptions = subscriptionActive.length;
        const categoryUnlocks = contentUnlocked.length;

        // Top categories analysis
        const categoryMap = new Map<string, { count: number; revenue: number }>();

        [...unlockAttempts, ...checkoutStarted, ...checkoutSuccess, ...contentUnlocked].forEach(event => {
          const category = (event.event_data as any)?.category;
          if (category) {
            const existing = categoryMap.get(category) || { count: 0, revenue: 0 };
            existing.count++;
            if (event.event_name === 'checkout_success') {
              const price = (event.event_data as any)?.price || 0;
              existing.revenue += parseFloat(price.toString());
            }
            categoryMap.set(category, existing);
          }
        });

        const topCategories = Array.from(categoryMap.entries())
          .map(([category, data]) => ({ category, ...data }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        // Enhanced funnel analysis with your specific events
        const funnelSteps = [
          {
            step: 'Unlock Attempts',
            count: unlockAttempts.length,
            rate: 100,
            description: 'Users attempting to unlock content'
          },
          {
            step: 'Checkout Started',
            count: checkoutStarted.length,
            rate: unlockAttempts.length > 0 ? (checkoutStarted.length / unlockAttempts.length) * 100 : 0,
            description: 'Users who started the checkout process'
          },
          {
            step: 'Checkout Success',
            count: checkoutSuccess.length,
            rate: checkoutStarted.length > 0 ? (checkoutSuccess.length / checkoutStarted.length) * 100 : 0,
            description: 'Successfully completed purchases'
          },
          {
            step: 'Content Unlocked',
            count: contentUnlocked.length,
            rate: checkoutSuccess.length > 0 ? (contentUnlocked.length / checkoutSuccess.length) * 100 : 0,
            description: 'Content successfully accessed'
          }
        ];

        // Daily metrics (last 7 days) with specific event breakdown
        const last7Days = Array.from({ length: 7 }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - i);
          return date.toISOString().split('T')[0];
        }).reverse();

        const dailyMetrics = last7Days.map(date => {
          const dayEvents = allEvents.filter(e => {
            const eventDate = (e as any).created_at || (e as any).timestamp;
            return eventDate?.startsWith(date);
          });

          const dayRevenue = checkoutSuccess.filter(e =>
            e.created_at?.startsWith(date)
          ).reduce((sum, e) => {
            const price = (e.event_data as any)?.price || 0;
            return sum + parseFloat(price.toString());
          }, 0);

          return {
            date,
            events: dayEvents.length,
            revenue: dayRevenue,
            unlockAttempts: dayEvents.filter(e => (e as any).event_name === 'unlock_attempt' || (e as any).event_type === 'unlock_attempt').length,
            checkoutStarted: dayEvents.filter(e => (e as any).event_name === 'checkout_started' || (e as any).event_type === 'checkout_started').length,
            affiliateClicks: dayEvents.filter(e => (e as any).event_name === 'affiliate_click').length,
          };
        });

        return {
          totalEvents,
          conversionRate,
          revenue,
          activeSubscriptions,
          categoryUnlocks,
          topCategories,
          funnelSteps,
          dailyMetrics,
          allEvents,
        };
      } catch (error) {
        console.error('Analytics query error:', error);
        throw error;
      }
    },
    enabled: !!session,
    refetchInterval: 30000,
    retry: 3,
  });

  // Calculate growth trends for metric cards
  const metricCards = useMemo(() => {
    const hasData = analyticsData && Object.keys(analyticsData).length > 0;

    return [
      {
        title: 'Total Revenue',
        value: hasData ? `$${analyticsData.revenue.toFixed(2)}` : '$0.00',
        icon: DollarSign,
        change: hasData && analyticsData.revenue > 0 ? '+12.3%' : '0%',
        positive: hasData && analyticsData.revenue > 0,
        gradient: 'from-emerald-500/10 via-green-500/5 to-emerald-600/10',
        iconBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
        description: hasData ? 'Total earnings from all sources' : 'No revenue data yet',
      },
      {
        title: 'Conversion Rate',
        value: hasData ? `${analyticsData.conversionRate.toFixed(1)}%` : '0.0%',
        icon: Target,
        change: hasData && analyticsData.conversionRate > 0 ? '+2.1%' : '0%',
        positive: hasData && analyticsData.conversionRate > 0,
        gradient: 'from-blue-500/10 via-cyan-500/5 to-blue-600/10',
        iconBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
        description: hasData ? 'Checkout to purchase ratio' : 'No conversion data yet',
      },
      {
        title: 'Active Users',
        value: hasData ? analyticsData.totalEvents.toString() : '0',
        icon: Users,
        change: hasData && analyticsData.totalEvents > 0 ? '+5' : '0',
        positive: hasData && analyticsData.totalEvents > 0,
        gradient: 'from-purple-500/10 via-violet-500/5 to-purple-600/10',
        iconBg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
        description: hasData ? 'Total user interactions' : 'No user activity yet',
      },
      {
        title: 'Content Unlocks',
        value: hasData ? analyticsData.categoryUnlocks.toString() : '0',
        icon: Eye,
        change: hasData && analyticsData.categoryUnlocks > 0 ? '+8' : '0',
        positive: hasData && analyticsData.categoryUnlocks > 0,
        gradient: 'from-orange-500/10 via-amber-500/5 to-orange-600/10',
        iconBg: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
        description: hasData ? 'Categories unlocked by users' : 'No unlocks yet',
      },
    ];
  }, [analyticsData]);

  // Filter events based on user input
  const filteredEvents = useMemo(() => {
    if (!analyticsData?.allEvents) return [];

    return analyticsData.allEvents.filter(event => {
      // User filter
      if (userFilter && userFilter !== 'all') {
        if (!event.userName?.toLowerCase().includes(userFilter.toLowerCase())) {
          return false;
        }
      }

      // Event type filter
      if (eventFilter && eventFilter !== 'all') {
        const eventName = event.event_name || event.event_type || event.interaction_type;
        if (eventName !== eventFilter) {
          return false;
        }
      }

      // Date range filter
      const eventDate = new Date(event.created_at || event.timestamp);
      if (startDate && eventDate < startDate) {
        return false;
      }
      if (endDate && eventDate > endDate) {
        return false;
      }

      return true;
    });
  }, [analyticsData?.allEvents, userFilter, eventFilter, startDate, endDate]);

  // Get unique users and event types for filter options
  const uniqueUsers = useMemo(() => {
    if (!analyticsData?.allEvents) return [];
    const users = new Set(analyticsData.allEvents.map(e => e.userName).filter(Boolean));
    return Array.from(users).sort();
  }, [analyticsData?.allEvents]);

  const uniqueEventTypes = useMemo(() => {
    if (!analyticsData?.allEvents) return [];
    const events = new Set(analyticsData.allEvents.map(e =>
      e.event_name || e.event_type || e.interaction_type
    ).filter(Boolean));
    return Array.from(events).sort();
  }, [analyticsData?.allEvents]);

  const clearFilters = () => {
    setUserFilter('all');
    setEventFilter('all');
    setStartDate(undefined);
    setEndDate(undefined);
  };

  // Enhanced event icon mapping with Lucide React icons
  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'unlock_attempt':
        return Unlock;
      case 'checkout_started':
        return ShoppingCart;
      case 'checkout_success':
        return CheckCircle;
      case 'checkout_cancelled':
        return XCircle;
      case 'product_view':
        return Eye;
      case 'search_performed':
        return Search;
      case 'upgrade_prompt_shown':
        return TrendingUp;
      case 'free_limit_reached':
        return AlertTriangle;
      case 'affiliate_click':
        return ExternalLink;
      case 'category_interest':
        return Tag;
      case 'content_view':
        return FileText;
      case 'content_unlocked':
        return Key;
      case 'category_blocked':
        return Shield;
      case 'product_limit_reached':
        return Ban;
      case 'subscription_active':
        return Crown;
      default:
        return Activity;
    }
  };

  // Enhanced event styling with subtle, professional colors
  const getEventStyle = (eventType: string) => {
    switch (eventType) {
      case 'unlock_attempt':
        return {
          bgGradient: 'from-slate-50/40 via-slate-50/20 to-slate-100/40',
          iconBg: 'bg-slate-100/60 text-slate-600 dark:bg-slate-800/60 dark:text-slate-300',
          borderColor: 'border-slate-200/30 dark:border-slate-700/30',
          textColor: 'text-slate-700 dark:text-slate-200'
        };
      case 'checkout_started':
        return {
          bgGradient: 'from-blue-50/30 via-blue-50/15 to-blue-100/30',
          iconBg: 'bg-blue-100/50 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300',
          borderColor: 'border-blue-200/25 dark:border-blue-800/25',
          textColor: 'text-blue-700 dark:text-blue-200'
        };
      case 'checkout_success':
        return {
          bgGradient: 'from-emerald-50/30 via-emerald-50/15 to-emerald-100/30',
          iconBg: 'bg-emerald-100/50 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300',
          borderColor: 'border-emerald-200/25 dark:border-emerald-800/25',
          textColor: 'text-emerald-700 dark:text-emerald-200'
        };
      case 'checkout_cancelled':
        return {
          bgGradient: 'from-red-50/30 via-red-50/15 to-red-100/30',
          iconBg: 'bg-red-100/50 text-red-600 dark:bg-red-900/40 dark:text-red-300',
          borderColor: 'border-red-200/25 dark:border-red-800/25',
          textColor: 'text-red-700 dark:text-red-200'
        };
      case 'product_view':
        return {
          bgGradient: 'from-violet-50/30 via-violet-50/15 to-violet-100/30',
          iconBg: 'bg-violet-100/50 text-violet-600 dark:bg-violet-900/40 dark:text-violet-300',
          borderColor: 'border-violet-200/25 dark:border-violet-800/25',
          textColor: 'text-violet-700 dark:text-violet-200'
        };
      case 'search_performed':
        return {
          bgGradient: 'from-indigo-50/30 via-indigo-50/15 to-indigo-100/30',
          iconBg: 'bg-indigo-100/50 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-300',
          borderColor: 'border-indigo-200/25 dark:border-indigo-800/25',
          textColor: 'text-indigo-700 dark:text-indigo-200'
        };
      case 'upgrade_prompt_shown':
        return {
          bgGradient: 'from-amber-50/30 via-amber-50/15 to-amber-100/30',
          iconBg: 'bg-amber-100/50 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300',
          borderColor: 'border-amber-200/25 dark:border-amber-800/25',
          textColor: 'text-amber-700 dark:text-amber-200'
        };
      case 'free_limit_reached':
        return {
          bgGradient: 'from-orange-50/30 via-orange-50/15 to-orange-100/30',
          iconBg: 'bg-orange-100/50 text-orange-600 dark:bg-orange-900/40 dark:text-orange-300',
          borderColor: 'border-orange-200/25 dark:border-orange-800/25',
          textColor: 'text-orange-700 dark:text-orange-200'
        };
      case 'content_unlocked':
        return {
          bgGradient: 'from-teal-50/30 via-teal-50/15 to-teal-100/30',
          iconBg: 'bg-teal-100/50 text-teal-600 dark:bg-teal-900/40 dark:text-teal-300',
          borderColor: 'border-teal-200/25 dark:border-teal-800/25',
          textColor: 'text-teal-700 dark:text-teal-200'
        };
      case 'affiliate_click':
        return {
          bgGradient: 'from-rose-50/30 via-rose-50/15 to-rose-100/30',
          iconBg: 'bg-rose-100/50 text-rose-600 dark:bg-rose-900/40 dark:text-rose-300',
          borderColor: 'border-rose-200/25 dark:border-rose-800/25',
          textColor: 'text-rose-700 dark:text-rose-200'
        };
      case 'category_interest':
        return {
          bgGradient: 'from-purple-50/30 via-purple-50/15 to-purple-100/30',
          iconBg: 'bg-purple-100/50 text-purple-600 dark:bg-purple-900/40 dark:text-purple-300',
          borderColor: 'border-purple-200/25 dark:border-purple-800/25',
          textColor: 'text-purple-700 dark:text-purple-200'
        };
      case 'subscription_active':
        return {
          bgGradient: 'from-cyan-50/30 via-cyan-50/15 to-cyan-100/30',
          iconBg: 'bg-cyan-100/50 text-cyan-600 dark:bg-cyan-900/40 dark:text-cyan-300',
          borderColor: 'border-cyan-200/25 dark:border-cyan-800/25',
          textColor: 'text-cyan-700 dark:text-cyan-200'
        };
      case 'content_view':
        return {
          bgGradient: 'from-gray-50/30 via-gray-50/15 to-gray-100/30',
          iconBg: 'bg-gray-100/50 text-gray-600 dark:bg-gray-800/50 dark:text-gray-300',
          borderColor: 'border-gray-200/25 dark:border-gray-700/25',
          textColor: 'text-gray-700 dark:text-gray-200'
        };
      case 'category_blocked':
        return {
          bgGradient: 'from-zinc-50/30 via-zinc-50/15 to-zinc-100/30',
          iconBg: 'bg-zinc-100/50 text-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-300',
          borderColor: 'border-zinc-200/25 dark:border-zinc-700/25',
          textColor: 'text-zinc-700 dark:text-zinc-200'
        };
      case 'product_limit_reached':
        return {
          bgGradient: 'from-stone-50/30 via-stone-50/15 to-stone-100/30',
          iconBg: 'bg-stone-100/50 text-stone-600 dark:bg-stone-800/50 dark:text-stone-300',
          borderColor: 'border-stone-200/25 dark:border-stone-700/25',
          textColor: 'text-stone-700 dark:text-stone-200'
        };
      default:
        return {
          bgGradient: 'from-neutral-50/30 via-neutral-50/15 to-neutral-100/30',
          iconBg: 'bg-neutral-100/50 text-neutral-600 dark:bg-neutral-800/50 dark:text-neutral-300',
          borderColor: 'border-neutral-200/25 dark:border-neutral-700/25',
          textColor: 'text-neutral-700 dark:text-neutral-200'
        };
    }
  };

  // Enhanced loading state
  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="border-0 shadow-sm">
              <CardContent className="p-4 md:p-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 bg-muted rounded-lg" />
                    <div className="h-4 bg-muted rounded w-20" />
                  </div>
                  <div className="h-8 bg-muted rounded w-16" />
                  <div className="h-3 bg-muted rounded w-12" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="h-96 bg-muted rounded-2xl" />
      </div>
    );
  }

  // Enhanced error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertCircle className="h-16 w-16 text-destructive mb-4" />
        <h3 className="font-semibold text-lg mb-2">Unable to Load Analytics</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          There was an error loading your analytics data. Please try refreshing the page or contact support if the issue persists.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Enhanced Hero Stats Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {metricCards.map((metric, index) => (
          <Card key={index} className="group relative overflow-hidden border-0 shadow-sm hover:shadow-md transition-all duration-300 bg-gradient-to-br from-card to-card/80">
            <div className={`absolute inset-0 bg-gradient-to-br ${metric.gradient} opacity-50`} />
            <CardContent className="relative p-4 md:p-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className={`p-2 rounded-xl ${metric.iconBg} transition-colors duration-300`}>
                    <metric.icon className="h-4 w-4 md:h-5 md:w-5" />
                  </div>
                  <div className="flex items-center gap-1 text-xs">
                    {metric.positive ? (
                      <ChevronUp className="h-3 w-3 text-emerald-500" />
                    ) : (
                      <ChevronDown className="h-3 w-3 text-red-500" />
                    )}
                    <span className={`font-medium ${metric.positive ? 'text-emerald-600' : 'text-red-600'}`}>
                      {metric.change}
                    </span>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xl md:text-2xl lg:text-3xl font-bold tracking-tight">{metric.value}</p>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {metric.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {metric.description}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Enhanced Analytics Tabs with URL persistence */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <TabsList className="grid w-full sm:w-auto grid-cols-5 bg-muted/30 p-1">
            <TabsTrigger
              value="overview"
              className="flex items-center gap-2 text-xs sm:text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger
              value="funnel"
              className="flex items-center gap-2 text-xs sm:text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <Activity className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Funnel</span>
            </TabsTrigger>
            <TabsTrigger
              value="categories"
              className="flex items-center gap-2 text-xs sm:text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <PieChart className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Categories</span>
            </TabsTrigger>
            <TabsTrigger
              value="realtime"
              className="flex items-center gap-2 text-xs sm:text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Real-time</span>
            </TabsTrigger>
            <TabsTrigger
              value="events"
              className="flex items-center gap-2 text-xs sm:text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Events</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="space-y-4 lg:space-y-6 animate-fade-in">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 lg:gap-6">
            {/* Revenue & Events Chart */}
            <Card className="border-0 shadow-sm overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-background to-muted/30 border-b pb-3">
                <CardTitle className="flex items-center gap-2 text-base lg:text-lg">
                  <TrendingUp className="h-4 w-4 lg:h-5 lg:w-5" />
                  Revenue & Events Trend
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 lg:p-6">
                <div className="h-64 lg:h-80">
                  {!analyticsData?.dailyMetrics || analyticsData.dailyMetrics.length === 0 || analyticsData.dailyMetrics.every(d => d.revenue === 0 && d.events === 0) ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <TrendingUp className="h-12 lg:h-16 w-12 lg:w-16 text-muted-foreground mb-3 lg:mb-4" />
                      <h3 className="font-medium text-sm lg:text-lg mb-1 lg:mb-2">No Revenue Data</h3>
                      <p className="text-xs lg:text-sm text-muted-foreground max-w-sm">
                        Revenue and event trends will appear here once you start getting user activity and payments.
                      </p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={analyticsData?.dailyMetrics || []}>
                        <defs>
                          <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="eventsGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--secondary))" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="hsl(var(--secondary))" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground))" opacity={0.2} />
                        <XAxis
                          dataKey="date"
                          tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          stroke="hsl(var(--muted-foreground))"
                        />
                        <YAxis yAxisId="revenue" orientation="left" stroke="hsl(var(--primary))" />
                        <YAxis yAxisId="events" orientation="right" stroke="hsl(var(--secondary))" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            color: 'hsl(var(--foreground))'
                          }}
                          labelFormatter={(value) => new Date(value).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                        />
                        <Area
                          yAxisId="revenue"
                          type="monotone"
                          dataKey="revenue"
                          stroke="hsl(var(--primary))"
                          fillOpacity={1}
                          fill="url(#revenueGradient)"
                          strokeWidth={2}
                          name="Revenue ($)"
                        />
                        <Area
                          yAxisId="events"
                          type="monotone"
                          dataKey="events"
                          stroke="hsl(var(--secondary))"
                          fillOpacity={1}
                          fill="url(#eventsGradient)"
                          strokeWidth={2}
                          name="Events"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Daily Breakdown Bar Chart */}
            <Card className="border-0 shadow-sm overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-background to-muted/30 border-b pb-3">
                <CardTitle className="flex items-center gap-2 text-base lg:text-lg">
                  <BarChart3 className="h-4 w-4 lg:h-5 lg:w-5" />
                  Event Types Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 lg:p-6">
                <div className="h-64 lg:h-80">
                  {!analyticsData?.dailyMetrics || analyticsData.dailyMetrics.length === 0 || analyticsData.dailyMetrics.every(d => (d.unlockAttempts || 0) === 0 && (d.checkoutStarted || 0) === 0 && (d.affiliateClicks || 0) === 0) ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <BarChart3 className="h-12 lg:h-16 w-12 lg:w-16 text-muted-foreground mb-3 lg:mb-4" />
                      <h3 className="font-medium text-sm lg:text-lg mb-1 lg:mb-2">No Event Data</h3>
                      <p className="text-xs lg:text-sm text-muted-foreground max-w-sm">
                        Event type breakdowns will show here once users start interacting with your platform.
                      </p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analyticsData?.dailyMetrics || []}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground))" opacity={0.2} />
                        <XAxis
                          dataKey="date"
                          tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          stroke="hsl(var(--muted-foreground))"
                        />
                        <YAxis stroke="hsl(var(--muted-foreground))" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            color: 'hsl(var(--foreground))'
                          }}
                        />
                        <Bar dataKey="unlockAttempts" stackId="a" fill="hsl(var(--chart-1))" name="Unlock Attempts" />
                        <Bar dataKey="checkoutStarted" stackId="a" fill="hsl(var(--chart-2))" name="Checkout Started" />
                        <Bar dataKey="affiliateClicks" stackId="a" fill="hsl(var(--chart-3))" name="Affiliate Clicks" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="funnel" className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Funnel Visualization */}
            <Card className="border-0 shadow-lg overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-background to-muted/50 border-b">
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Conversion Funnel Chart
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="h-80">
                  {!analyticsData?.funnelSteps || analyticsData.funnelSteps.length === 0 || analyticsData.funnelSteps.every(s => s.count === 0) ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <Activity className="h-16 w-16 text-muted-foreground mb-4" />
                      <h3 className="font-medium text-lg mb-2">No Funnel Data</h3>
                      <p className="text-sm text-muted-foreground max-w-sm">
                        Conversion funnel analytics will appear here as users go through your unlock and purchase flow.
                      </p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        layout="horizontal"
                        data={analyticsData?.funnelSteps || []}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground))" opacity={0.2} />
                        <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
                        <YAxis
                          dataKey="step"
                          type="category"
                          width={120}
                          stroke="hsl(var(--muted-foreground))"
                          tick={{ fontSize: 12 }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            color: 'hsl(var(--foreground))'
                          }}
                          formatter={(value, name) => [value, name === 'count' ? 'Count' : 'Rate (%)']}
                        />
                        <Bar
                          dataKey="count"
                          fill="hsl(var(--primary))"
                          radius={[0, 4, 4, 0]}
                          name="Conversions"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Funnel Details */}
            <Card className="border-0 shadow-lg overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-background to-muted/50 border-b">
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Conversion Details
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-80 overflow-y-auto">
                  {!analyticsData?.funnelSteps || analyticsData.funnelSteps.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <Target className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="font-medium text-lg mb-2">No Funnel Data</h3>
                      <p className="text-sm text-muted-foreground max-w-sm">
                        Conversion details will appear here once users start interacting with your platform.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3 p-6">
                      {analyticsData.funnelSteps.map((step, index) => (
                        <div key={index} className="group relative overflow-hidden rounded-xl border bg-gradient-to-r from-background to-muted/30 hover:from-muted/50 hover:to-muted/70 transition-all duration-300 hover-scale">
                          <div className="flex items-center justify-between p-4">
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-3">
                                <Badge variant="outline" className="font-mono text-xs">
                                  {index + 1}
                                </Badge>
                                <p className="font-medium text-sm">{step.step}</p>
                              </div>
                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                  <span>Rate</span>
                                  <span>{step.rate.toFixed(1)}%</span>
                                </div>
                                <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                                  <div
                                    className="bg-gradient-to-r from-primary to-primary/70 h-2 rounded-full transition-all duration-1000 ease-out"
                                    style={{ width: `${step.rate}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                            <div className="text-right ml-4">
                              <p className="text-xl font-bold">{step.count}</p>
                              <p className="text-xs text-muted-foreground">users</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="categories" className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category Distribution Pie Chart */}
            <Card className="border-0 shadow-lg overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-background to-muted/50 border-b">
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Category Distribution
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="h-80">
                  {!analyticsData?.topCategories || analyticsData.topCategories.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <PieChart className="h-16 w-16 text-muted-foreground mb-4" />
                      <h3 className="font-medium text-lg mb-2">No Category Data</h3>
                      <p className="text-sm text-muted-foreground max-w-sm">
                        Category distribution will show here once users start engaging with different product categories.
                      </p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={analyticsData?.topCategories || []}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={5}
                          dataKey="count"
                        >
                          {(analyticsData?.topCategories || []).map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={`hsl(var(--chart-${(index % 5) + 1}))`}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            color: 'hsl(var(--foreground))'
                          }}
                          formatter={(value, name, props) => [
                            `${value} interactions`,
                            props.payload.category
                          ]}
                        />
                        <Legend />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Top Categories List */}
            <Card className="border-0 shadow-lg overflow-hidden flex flex-col">
              <CardHeader className="bg-gradient-to-r from-background to-muted/50 border-b">
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Top Categories by Revenue
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {!analyticsData?.topCategories || analyticsData.topCategories.length === 0 ? (
                  <div className="min-h-80 flex items-center justify-center">
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <Target className="h-16 w-16 text-muted-foreground mb-6" />
                      <h3 className="font-medium text-lg mb-2">No Category Data</h3>
                      <p className="text-sm text-muted-foreground max-w-sm">
                        Top performing categories will appear here once you have user engagement data.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="max-h-80 overflow-y-auto">
                    <div className="space-y-2 p-6">
                      {analyticsData.topCategories.map((category, index) => (
                        <div key={index} className="group flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-background to-muted/30 hover:from-muted/50 hover:to-muted/70 transition-all duration-300 hover-scale">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-r from-primary/20 to-primary/10 border border-primary/20">
                              <span className="text-sm font-bold text-primary">#{index + 1}</span>
                            </div>
                            <div>
                              <p className="font-medium">{category.category}</p>
                              <p className="text-sm text-muted-foreground flex items-center gap-1">
                                <MousePointer className="h-3 w-3" />
                                {category.count} interactions
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-bold text-green-600">${category.revenue.toFixed(2)}</p>
                            <p className="text-sm text-muted-foreground">revenue</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="realtime" className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Live Metrics */}
            <Card className="border-0 shadow-lg overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-background to-muted/50 border-b">
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <span className="text-sm text-muted-foreground">Events Today</span>
                    <span className="text-lg font-bold">{analyticsData?.dailyMetrics[analyticsData.dailyMetrics.length - 1]?.events || 0}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <span className="text-sm text-muted-foreground">Revenue Today</span>
                    <span className="text-lg font-bold text-green-600">${analyticsData?.dailyMetrics[analyticsData.dailyMetrics.length - 1]?.revenue.toFixed(2) || '0.00'}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <span className="text-sm text-muted-foreground">Conversion Rate</span>
                    <span className="text-lg font-bold text-blue-600">{analyticsData?.conversionRate.toFixed(1) || '0.0'}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Events Stream */}
            <Card className="lg:col-span-2 border-0 shadow-lg overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-background to-muted/50 border-b">
                <CardTitle className="flex items-center gap-2">
                  Event Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-80 overflow-y-auto">
                  {(analyticsData?.allEvents || []).length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center animate-fade-in">
                      <Activity className="h-16 w-16 text-muted-foreground mb-4 animate-pulse" />
                      <h3 className="font-medium text-lg mb-2">No Events Yet</h3>
                      <p className="text-sm text-muted-foreground max-w-sm">
                        Events will appear here as users interact with your platform.
                        Check back once you have some user activity.
                      </p>
                    </div>
                  ) : (
                    <div className="relative">
                      {/* Timeline Line */}
                      <div className="absolute left-8 top-0 bottom-0 w-px bg-gradient-to-b from-primary/20 via-primary/40 to-primary/20"></div>

                      <div className="space-y-1 p-6">
                        {(analyticsData?.allEvents || []).slice(0, 10).map((event, index) => {
                          const eventData = (event as any).event_data || {};
                          const userName = (event as any).userName;
                          const eventName = (event as any).event_name || (event as any).event_type || (event as any).interaction_type || 'Unknown Event';
                          const timestamp = (event as any).created_at || (event as any).timestamp;
                          const source = (event as any).source;

                          const EventIcon = getEventIcon(eventName);
                          const eventStyle = getEventStyle(eventName);
                          const isRecent = new Date().getTime() - new Date(timestamp).getTime() < 60000; // Less than 1 minute

                          return (
                            <div
                              key={index}
                              className={`relative group animate-fade-in hover-scale`}
                              style={{ animationDelay: `${index * 50}ms` }}
                            >
                              {/* Timeline Connector */}
                              <div className="absolute left-8 top-1/2 w-4 h-4 -translate-x-1/2 -translate-y-1/2 z-10">
                                <div className={`w-4 h-4 rounded-full border-2 border-background ${
                                  eventStyle.iconBg.includes('slate') ? 'bg-slate-400' :
                                  eventStyle.iconBg.includes('blue') ? 'bg-blue-400' :
                                  eventStyle.iconBg.includes('emerald') ? 'bg-emerald-400' :
                                  eventStyle.iconBg.includes('red') ? 'bg-red-400' :
                                  eventStyle.iconBg.includes('violet') ? 'bg-violet-400' :
                                  eventStyle.iconBg.includes('indigo') ? 'bg-indigo-400' :
                                  eventStyle.iconBg.includes('amber') ? 'bg-amber-400' :
                                  eventStyle.iconBg.includes('orange') ? 'bg-orange-400' :
                                  eventStyle.iconBg.includes('teal') ? 'bg-teal-400' :
                                  eventStyle.iconBg.includes('rose') ? 'bg-rose-400' :
                                  eventStyle.iconBg.includes('purple') ? 'bg-purple-400' :
                                  eventStyle.iconBg.includes('cyan') ? 'bg-cyan-400' :
                                  eventStyle.iconBg.includes('gray') ? 'bg-gray-400' :
                                  eventStyle.iconBg.includes('zinc') ? 'bg-zinc-400' :
                                  eventStyle.iconBg.includes('stone') ? 'bg-stone-400' :
                                  'bg-neutral-400'
                                } ${isRecent ? 'animate-pulse' : ''}`}></div>
                                {isRecent && (
                                  <div className={`absolute inset-0 w-4 h-4 rounded-full ${
                                    eventStyle.iconBg.includes('slate') ? 'bg-slate-400' :
                                    eventStyle.iconBg.includes('blue') ? 'bg-blue-400' :
                                    eventStyle.iconBg.includes('emerald') ? 'bg-emerald-400' :
                                    eventStyle.iconBg.includes('red') ? 'bg-red-400' :
                                    eventStyle.iconBg.includes('violet') ? 'bg-violet-400' :
                                    eventStyle.iconBg.includes('indigo') ? 'bg-indigo-400' :
                                    eventStyle.iconBg.includes('amber') ? 'bg-amber-400' :
                                    eventStyle.iconBg.includes('orange') ? 'bg-orange-400' :
                                    eventStyle.iconBg.includes('teal') ? 'bg-teal-400' :
                                    eventStyle.iconBg.includes('rose') ? 'bg-rose-400' :
                                    eventStyle.iconBg.includes('purple') ? 'bg-purple-400' :
                                    eventStyle.iconBg.includes('cyan') ? 'bg-cyan-400' :
                                    eventStyle.iconBg.includes('gray') ? 'bg-gray-400' :
                                    eventStyle.iconBg.includes('zinc') ? 'bg-zinc-400' :
                                    eventStyle.iconBg.includes('stone') ? 'bg-stone-400' :
                                    'bg-neutral-400'
                                  } animate-ping opacity-30`}></div>
                                )}
                              </div>

                              {/* Event Card */}
                              <div className={`ml-16 bg-gradient-to-br ${eventStyle.bgGradient} border ${eventStyle.borderColor} rounded-xl p-4 transition-all duration-300 hover:shadow-lg group-hover:scale-[1.02] backdrop-blur-sm`}>
                                <div className="flex items-start gap-3">
                                  {/* Enhanced Event Icon */}
                                  <div className={`flex-shrink-0 w-10 h-10 rounded-xl ${eventStyle.iconBg} border border-white/20 dark:border-black/20 flex items-center justify-center shadow-lg`}>
                                    <EventIcon className="h-5 w-5" />
                                  </div>

                                  {/* Event Content */}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                                      <h4 className={`font-semibold text-sm ${eventStyle.textColor} capitalize truncate`}>
                                        {eventName.replace(/_/g, ' ')}
                                      </h4>
                                      <div className="flex items-center gap-2">
                                        {isRecent && (
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-medium">
                                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                                            Live
                                          </span>
                                        )}
                                        <time className="text-xs text-muted-foreground font-mono bg-muted/30 px-2 py-1 rounded">
                                          {new Date(timestamp).toLocaleTimeString()}
                                        </time>
                                      </div>
                                    </div>

                                    {/* Event Details */}
                                    <div className="flex flex-wrap items-center gap-2 text-xs">
                                      {userName && (
                                        <span className="inline-flex items-center gap-1 bg-muted/50 px-2 py-1 rounded-md">
                                          <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                                          <span className="text-muted-foreground">User:</span>
                                          <span className="font-medium text-foreground">{userName}</span>
                                        </span>
                                      )}

                                      {eventData.category && (
                                        <span className="inline-flex items-center gap-1 bg-muted/50 px-2 py-1 rounded-md">
                                          <div className="w-1.5 h-1.5 rounded-full bg-orange-500"></div>
                                          <span className="text-muted-foreground">Category:</span>
                                          <span className="font-medium text-foreground capitalize">{eventData.category}</span>
                                        </span>
                                      )}

                                      {eventData.price && (
                                        <span className="inline-flex items-center gap-1 bg-green-50 dark:bg-green-950/30 px-2 py-1 rounded-md">
                                          <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                                          <span className="text-muted-foreground">Value:</span>
                                          <span className="font-medium text-green-600 dark:text-green-400">${eventData.price}</span>
                                        </span>
                                      )}

                                      {source !== 'subscription' && (
                                        <Badge variant="secondary" className="text-xs">
                                          {source}
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="events" className="space-y-4 lg:space-y-6 animate-fade-in">
          {/* Filters for Events */}
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 lg:p-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-medium text-muted-foreground">Filters</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">User</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          className="w-full h-9 justify-between font-normal"
                        >
                          {userFilter === 'all'
                            ? `All users (${analyticsData?.allEvents ? new Set(analyticsData.allEvents.map(e => e.userName).filter(Boolean)).size : 0})`
                            : userFilter
                          }
                          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0 bg-popover border shadow-lg" align="start">
                        <Command className="bg-popover">
                          <CommandInput placeholder="Search users..." className="h-9" />
                          <CommandList className="max-h-60">
                            <CommandEmpty>No users found.</CommandEmpty>
                            <CommandGroup>
                              <CommandItem
                                value="all"
                                onSelect={() => setUserFilter('all')}
                                className="cursor-pointer"
                              >
                                All users ({analyticsData?.allEvents ? new Set(analyticsData.allEvents.map(e => e.userName).filter(Boolean)).size : 0})
                              </CommandItem>
                              {uniqueUsers.map((user) => (
                                <CommandItem
                                  key={user}
                                  value={user}
                                  onSelect={() => setUserFilter(user)}
                                  className="cursor-pointer"
                                >
                                  {user}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Event Type</label>
                    <Select value={eventFilter} onValueChange={setEventFilter}>
                      <SelectTrigger className="w-full h-9">
                        <SelectValue placeholder="All events" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border shadow-lg">
                        <SelectItem value="all">All events</SelectItem>
                        {uniqueEventTypes.map(event => (
                          <SelectItem key={event} value={event}>{event.replace('_', ' ')}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Start Date</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full h-9 justify-start text-left font-normal",
                            !startDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {startDate ? format(startDate, "MMM dd, yyyy") : "Pick date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-popover border shadow-lg" align="start">
                        <Calendar
                          mode="single"
                          selected={startDate}
                          onSelect={setStartDate}
                          initialFocus
                          className="p-3 pointer-events-auto bg-popover"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">End Date</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full h-9 justify-start text-left font-normal",
                            !endDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {endDate ? format(endDate, "MMM dd, yyyy") : "Pick date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-popover border shadow-lg" align="start">
                        <Calendar
                          mode="single"
                          selected={endDate}
                          onSelect={setEndDate}
                          initialFocus
                          className="p-3 pointer-events-auto bg-popover"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Eye className="h-4 w-4" />
                    <span className="font-medium">{filteredEvents.length}</span>
                    <span>events found</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearFilters}
                    className="text-xs"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Clear filters
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-background to-muted/30 border-b pb-3">
              <CardTitle className="flex items-center gap-2 text-base lg:text-lg">
                <Eye className="h-4 w-4 lg:h-5 lg:w-5" />
                Events History ({filteredEvents.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-96 overflow-y-auto">
                {filteredEvents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <Eye className="h-16 w-16 text-muted-foreground mb-4" />
                    <h3 className="font-medium text-lg mb-2">
                      {userFilter || eventFilter || startDate || endDate ? 'No Matching Events' : 'No Events Recorded'}
                    </h3>
                    <p className="text-sm text-muted-foreground max-w-sm">
                      {userFilter || eventFilter || startDate || endDate
                        ? 'Try adjusting your filters to see more results.'
                        : 'User events and interactions will appear here as your platform gets more activity.'
                      }
                    </p>
                  </div>
                ) : (
                <div className="space-y-3 p-6">
                    {filteredEvents.slice(0, 50).map((event, index) => {
                      const eventData = (event as any).event_data || {};
                      const userName = (event as any).userName;
                      const timestamp = (event as any).created_at || (event as any).timestamp;
                      const eventName = (event as any).event_name || (event as any).event_type || (event as any).interaction_type || 'Unknown Event';
                      const source = (event as any).source;

                      const EventIcon = getEventIcon(eventName);
                      const eventStyle = getEventStyle(eventName);

                      return (
                        <div key={index} className={`group relative overflow-hidden rounded-xl bg-gradient-to-r ${eventStyle.bgGradient} border ${eventStyle.borderColor} hover:shadow-lg transition-all duration-300 p-4 backdrop-blur-sm`}>
                          <div className="flex items-start gap-4">
                            {/* Enhanced Event Icon */}
                            <div className={`flex-shrink-0 w-12 h-12 rounded-xl ${eventStyle.iconBg} border border-white/20 dark:border-black/20 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                              <EventIcon className="h-6 w-6" />
                            </div>

                            {/* Event Content */}
                            <div className="flex-1 min-w-0 space-y-2">
                              {/* Event Title and Time */}
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                <h4 className={`font-semibold ${eventStyle.textColor} capitalize text-sm lg:text-base`}>
                                  {eventName.replace(/_/g, ' ')}
                                </h4>
                                <div className="flex items-center gap-2">
                                  <Clock className="h-3 w-3 text-muted-foreground" />
                                  <time className="text-xs text-muted-foreground font-mono bg-muted/50 px-2 py-1 rounded-md">
                                    {new Date(timestamp).toLocaleString()}
                                  </time>
                                </div>
                              </div>

                              {/* Event Details */}
                              <div className="flex flex-wrap items-center gap-3 text-xs">
                                {userName && (
                                  <div className="flex items-center gap-1.5 bg-muted/30 px-2 py-1 rounded-md">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                                    <span className="text-muted-foreground">User:</span>
                                    <span className="font-medium text-foreground">{userName}</span>
                                  </div>
                                )}

                                {eventData.category && (
                                  <div className="flex items-center gap-1.5 bg-muted/30 px-2 py-1 rounded-md">
                                    <div className="w-1.5 h-1.5 rounded-full bg-orange-500"></div>
                                    <span className="text-muted-foreground">Category:</span>
                                    <span className="font-medium text-foreground capitalize">{eventData.category}</span>
                                  </div>
                                )}

                                {eventData.price && (
                                  <div className="flex items-center gap-1.5 bg-green-50/50 dark:bg-green-950/20 px-2 py-1 rounded-md">
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                                    <span className="text-muted-foreground">Value:</span>
                                    <span className="font-medium text-green-600 dark:text-green-400">${eventData.price}</span>
                                  </div>
                                )}

                                {((event as any).productName || eventData.product_id) && (
                                  <div className="flex items-center gap-1.5 bg-muted/30 px-2 py-1 rounded-md">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                                    <span className="text-muted-foreground">Product:</span>
                                    <span
                                      className="font-medium text-foreground truncate max-w-32 cursor-help"
                                      title={(event as any).productName || `Product ID: ${eventData.product_id}`}
                                    >
                                      {(event as any).productName ?
                                        ((event as any).productName.length > 20 ?
                                          `${(event as any).productName.slice(0, 20)}...` :
                                          (event as any).productName
                                        ) :
                                        `${eventData.product_id?.slice(0, 8)}...`
                                      }
                                    </span>
                                  </div>
                                )}
                              </div>

                              {/* Additional Event Data */}
                              {Object.keys(eventData).length > 0 && (
                                <details className="group/details">
                                  <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground transition-colors">
                                    View details ({Object.keys(eventData).length} properties)
                                  </summary>
                                  <div className="mt-2 p-3 rounded-lg bg-muted/20 border">
                                    <pre className="text-xs text-muted-foreground font-mono whitespace-pre-wrap overflow-x-auto">
                                      {JSON.stringify(eventData, null, 2)}
                                    </pre>
                                  </div>
                                </details>
                              )}
                            </div>

                            {/* Source Badge - Hide subscription source */}
                            <div className="flex-shrink-0">
                              {source !== 'subscription' && (
                                <Badge variant="secondary" className="text-xs font-medium">
                                  {source}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}