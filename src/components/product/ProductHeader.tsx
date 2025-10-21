import { ArrowLeft, ShoppingBag } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/auth/UserMenu";

interface ProductHeaderProps {
  searchQuery?: string;
}

export const ProductHeader = ({ searchQuery }: ProductHeaderProps) => {
  return (
    <motion.div 
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="sticky top-0 z-50 border-b border-border/20 backdrop-blur-xl bg-background/70 supports-[backdrop-filter]:bg-background/50"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-4">
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="hover:bg-primary/10 rounded-full"
            >
              <Link to={searchQuery ? `/search?q=${encodeURIComponent(searchQuery)}` : "/search"}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Search
              </Link>
            </Button>
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-primary p-2 rounded-xl">
                <ShoppingBag className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg font-bold text-gradient">IMO</span>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <ThemeToggle />
            <UserMenu />
          </div>
        </div>
      </div>
    </motion.div>
  );
};