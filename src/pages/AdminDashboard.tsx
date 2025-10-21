import { AnalyticsDashboard } from '@/components/analytics/AnalyticsDashboard';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AdminSidebar } from '@/components/layout/AdminSidebar';

export default function AdminDashboard() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AdminSidebar />
        
        <div className="flex-1 flex flex-col">
          {/* Header with trigger */}
          <header className="h-16 flex items-center justify-between border-b bg-card px-6">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Analytics Dashboard</h1>
                <p className="text-sm text-muted-foreground">Real-time insights and metrics</p>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 p-6 bg-gradient-to-br from-background via-background to-muted/20">
            <AnalyticsDashboard />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}