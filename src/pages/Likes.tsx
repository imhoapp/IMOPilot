import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ProductGrid } from '@/components/search/ProductGrid';
import { SearchHeader } from '@/components/search/SearchHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Heart, Grid3X3, List, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Product } from '@/types/search';

export default function Likes() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [likedProducts, setLikedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    if (!user) return;

    const fetchLikedProducts = async () => {
      try {
        const { data, error } = await supabase
          .from('product_likes')
          .select(`
            product_id,
            products (
              id,
              title,
              description,
              price,
              image_url,
              image_urls,
              imo_score,
              site_rating,
              product_url,
              external_url,
              source,
              source_id,
              pros,
              cons
            )
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        const products = data
          ?.map(item => ({
            ...item.products,
            source: item.products?.source as Product['source'],
            source_id: item.products?.source_id || null,
            created_at: new Date().toISOString()
          }))
          .filter(Boolean) as Product[];

        setLikedProducts(products || []);
      } catch (error) {
        console.error('Error fetching liked products:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLikedProducts();
  }, [user]);


  return (
    <div className="bg-background">
      {/* Desktop Layout */}
      <div className="hidden md:block">
        <div className="container mx-auto py-12 px-6 max-w-7xl">
          {/* Enhanced Desktop Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="bg-gradient-to-br from-red-500/20 to-pink-500/20 p-3 rounded-2xl">
                  <Heart className="h-8 w-8 text-red-500" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold tracking-tight text-foreground">Your Liked Products</h1>
                  <div className="flex items-center space-x-4 mt-2">
                    <Badge variant="secondary" className="flex items-center space-x-1">
                      <Heart className="h-3 w-3" />
                      <span>{likedProducts.length} {likedProducts.length === 1 ? 'product' : 'products'}</span>
                    </Badge>
                    {likedProducts.length > 0 && (
                      <p className="text-muted-foreground text-sm">
                        Products you've saved for later
                      </p>
                    )}
                  </div>
                </div>
              </div>
              
              {likedProducts.length > 0 && (
                <div className="flex items-center space-x-2">
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                    className="rounded-lg"
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                    className="rounded-lg"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Desktop Content */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-r-secondary rounded-full animate-[spin_1.5s_linear_infinite]"></div>
              </div>
            </div>
          ) : likedProducts.length > 0 ? (
            <ProductGrid products={likedProducts} />
          ) : (
            <div className="text-center py-20">
              <div className="bg-gradient-to-br from-red-500/10 to-pink-500/10 border border-red-500/20 rounded-3xl p-12 max-w-md mx-auto">
                <div className="bg-gradient-to-br from-red-500/20 to-pink-500/20 p-6 rounded-2xl w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                  <Heart className="h-12 w-12 text-red-500" />
                </div>
                <h3 className="text-2xl font-bold mb-4">No liked products yet</h3>
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  Start exploring products and click the heart icon to save your favorites here!
                </p>
                <Button 
                  onClick={() => navigate('/search')}
                  className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-500/90 hover:to-pink-500/90 rounded-xl px-8"
                >
                  <Search className="mr-2 h-4 w-4" />
                  Browse Products
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile App-style Layout */}
      <div className="md:hidden px-4 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="relative">
              <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
              <div className="absolute inset-0 w-12 h-12 border-4 border-transparent border-r-secondary rounded-full animate-[spin_1.5s_linear_infinite]"></div>
            </div>
          </div>
        ) : likedProducts.length > 0 ? (
          <div className="space-y-4">
            {/* Mobile Stats Card */}
            <div className="bg-gradient-to-br from-red-500/10 to-pink-500/10 border border-red-500/20 rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="bg-gradient-to-br from-red-500/20 to-pink-500/20 p-2 rounded-xl">
                    <Heart className="h-5 w-5 text-red-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-base">{likedProducts.length} Products Saved</p>
                    <p className="text-xs text-muted-foreground">Ready for purchase</p>
                  </div>
                </div>
                <Badge variant="secondary" className="bg-red-500/10 text-red-600 border-red-500/20">
                  ♥ Favorites
                </Badge>
              </div>
            </div>
            
            {/* Mobile Product Grid */}
            <ProductGrid products={likedProducts} />
          </div>
        ) : (
          <div className="text-center py-16 px-4">
            <div className="bg-gradient-to-br from-red-500/10 to-pink-500/10 border border-red-500/20 rounded-2xl p-8">
              <div className="bg-gradient-to-br from-red-500/20 to-pink-500/20 p-4 rounded-2xl w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                <Heart className="h-10 w-10 text-red-500" />
              </div>
              <h3 className="text-xl font-bold mb-3">No liked products yet</h3>
              <p className="text-muted-foreground mb-6 text-sm leading-relaxed">
                Start exploring products and tap the heart icon to save your favorites!
              </p>
              <Button 
                onClick={() => navigate('/search')}
                className="w-full bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-500/90 hover:to-pink-500/90 rounded-xl h-12 text-base font-semibold"
              >
                <Search className="mr-2 h-5 w-5" />
                Browse Products
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}