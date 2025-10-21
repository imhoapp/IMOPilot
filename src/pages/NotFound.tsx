import { Link } from 'react-router-dom';
import { Home, Search, ArrowLeft, Zap, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background flex items-center justify-center p-4">
      <div className="max-w-2xl mx-auto text-center space-y-8">
        {/* Animated 404 */}
        <div className="relative">
          <div className="text-8xl md:text-9xl font-bold bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent animate-pulse">
            404
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Sparkles className="h-8 w-8 text-primary/60 animate-bounce" style={{ animationDelay: '0.5s' }} />
          </div>
        </div>

        {/* Content */}
        <div className="space-y-4">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            Oops! Page Not Found
          </h1>
          <p className="text-lg text-muted-foreground max-w-md mx-auto">
            The page you're looking for doesn't exist or you don't have permission to access it.
          </p>
        </div>

        {/* Interactive Elements */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
          <Card className="group hover-scale cursor-pointer border-2 border-dashed border-primary/20 hover:border-primary/40 transition-all duration-300">
            <Link to="/">
              <CardContent className="p-6 text-center space-y-4">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto group-hover:bg-primary/20 transition-colors">
                  <Home className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Go Home</h3>
                  <p className="text-sm text-muted-foreground">Return to the main page</p>
                </div>
              </CardContent>
            </Link>
          </Card>

          <Card className="group hover-scale cursor-pointer border-2 border-dashed border-primary/20 hover:border-primary/40 transition-all duration-300">
            <Link to="/search">
              <CardContent className="p-6 text-center space-y-4">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto group-hover:bg-primary/20 transition-colors">
                  <Search className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Search Products</h3>
                  <p className="text-sm text-muted-foreground">Find what you're looking for</p>
                </div>
              </CardContent>
            </Link>
          </Card>
        </div>

        {/* Back Button */}
        <div className="pt-4">
          <Button 
            variant="outline" 
            onClick={() => window.history.back()}
            className="gap-2 hover-scale"
          >
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </Button>
        </div>

        {/* Floating Animation */}
        <div className="fixed top-20 right-10 animate-bounce" style={{ animationDelay: '1s' }}>
          <Zap className="h-6 w-6 text-primary/40" />
        </div>
        <div className="fixed bottom-20 left-10 animate-bounce" style={{ animationDelay: '2s' }}>
          <Sparkles className="h-4 w-4 text-purple-500/40" />
        </div>
      </div>
    </div>
  );
}
