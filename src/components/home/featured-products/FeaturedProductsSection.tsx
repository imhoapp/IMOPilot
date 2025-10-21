import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FeaturedProductCard } from "./FeaturedProductCard";
import { supabase } from "@/integrations/supabase/client";
import { Product } from "@/types/search";

export const FeaturedProductsSection = () => {
  const { data: products, isLoading, error } = useQuery({
    queryKey: ["featuredProducts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("imo_score", { ascending: false })
        .limit(3);

      if (error) throw error;
      return data as Product[];
    }
  });

  // Don't render anything if we don't have enough products
  if (!isLoading && (!products || products.length < 3)) {
    return null;
  }

  // Show loading state (but maintain layout space)
  if (isLoading) {
    return (
      <section aria-label="Featured products loading" className="py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="space-y-4 animate-pulse">
            <div className="h-8 w-64 bg-muted rounded" />
            <div className="h-4 w-96 bg-muted rounded" />
          </div>
        </div>
      </section>
    );
  }

  // Show error state
  if (error) {
    return (
      <section aria-label="Featured products error" className="py-16">
        <div className="max-w-6xl mx-auto px-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load featured products. Please try again later.
            </AlertDescription>
          </Alert>
        </div>
      </section>
    );
  }

  return (
    <section 
      aria-labelledby="featured-products-title"
      className="py-24"
    >
      <div className="max-w-6xl mx-auto px-4">
        <motion.div
          initial={{ 
            opacity: 0, 
            y: 30,
            filter: "blur(5px)" 
          }}
          whileInView={{ 
            opacity: 1, 
            y: 0,
            filter: "blur(0px)" 
          }}
          viewport={{ once: true }}
          transition={{ 
            duration: 0.5,
            ease: [0.25, 0.1, 0.25, 1.0]
          }}
          className="text-center mb-12"
        >
          <h2 
            id="featured-products-title" 
            className="text-4xl font-heading font-normal mb-4"
          >
            Featured Products
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Discover our curated selection of high-quality products with detailed reviews and 
            AI-powered insights.
          </p>
        </motion.div>

        <AnimatePresence>
          {products && (
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
            >
              {products.map((product, index) => (
                <FeaturedProductCard 
                  key={product.id} 
                  product={product} 
                  index={index}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
};