import { Link } from "react-router-dom";
import { Search, ArrowRight, Sparkles, Play, Zap, Eye, TrendingUp, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface HeroSectionProps {
  className?: string;
}

export const HeroSection = ({ className }: HeroSectionProps) => {
  return (
    <section 
      className={`relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 overflow-hidden ${className}`}
    >
      {/* Background Elements - Hidden on Mobile */}
      <motion.div 
        className="hidden md:block absolute top-20 left-1/4 w-72 h-72 bg-primary/10 rounded-full blur-3xl"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      <motion.div 
        className="hidden md:block absolute bottom-20 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl"
        animate={{
          scale: [1.2, 1, 1.2],
          opacity: [0.2, 0.4, 0.2],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />

      {/* Mobile App-style Content */}
      <div className="md:hidden text-center py-8 px-4 relative z-10">
        {/* App Icon */}
        <motion.div 
          className="flex items-center justify-center mb-6"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, type: "spring" }}
        >
          <div className="bg-gradient-to-br from-primary to-accent p-4 rounded-3xl shadow-lg">
            <Sparkles className="h-8 w-8 text-white" />
          </div>
        </motion.div>
        
        {/* Mobile App Title */}
        <motion.h1 
          className="text-3xl font-bold tracking-tight mb-4 text-foreground"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          Make better{" "}
          <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            buying decisions
          </span>
        </motion.h1>
        
        {/* Mobile Subtitle */}
        <motion.p 
          className="text-base text-muted-foreground mb-8 leading-relaxed px-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          AI-powered product research in seconds
        </motion.p>

        {/* Mobile Search CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="mb-8"
        >
          <Button asChild size="lg" className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 rounded-xl px-6 h-12 text-base font-medium border-0 shadow-lg">
            <Link to="/search" className="flex items-center justify-center space-x-3">
              <Search className="h-5 w-5" />
              <span>Start Searching Products</span>
              <ArrowRight className="h-5 w-5" />
            </Link>
          </Button>
        </motion.div>

        {/* Mobile Feature Cards */}
        <motion.div 
          className="grid grid-cols-2 gap-3 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.6 }}
        >
          {[
            { icon: Zap, title: "Instant", desc: "AI Analysis" },
            { icon: Eye, title: "Compare", desc: "Products" },
            { icon: TrendingUp, title: "Track", desc: "Trends" },
            { icon: Star, title: "Reviews", desc: "Summary" }
          ].map((feature, index) => (
            <motion.div
              key={index}
              className="bg-card/50 backdrop-blur-sm border rounded-xl p-3 text-center"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              <feature.icon className="h-6 w-6 text-primary mx-auto mb-2" />
              <div className="text-xs font-semibold text-foreground">{feature.title}</div>
              <div className="text-xs text-muted-foreground">{feature.desc}</div>
            </motion.div>
          ))}
        </motion.div>

        {/* Mobile Trust Indicators */}
        <motion.div 
          className="flex items-center justify-center gap-6 text-xs text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.0, duration: 0.6 }}
        >
          <div className="text-center">
            <div className="font-semibold text-foreground">10K+</div>
            <div>Products</div>
          </div>
          <div className="w-px h-8 bg-border"></div>
          <div className="text-center">
            <div className="font-semibold text-foreground">500+</div>
            <div>Videos</div>
          </div>
          <div className="w-px h-8 bg-border"></div>
          <div className="text-center">
            <div className="font-semibold text-foreground">98%</div>
            <div>Accuracy</div>
          </div>
        </motion.div>
      </div>

      {/* Desktop Content */}
      <div className="hidden md:block text-center py-20 relative z-10">
        {/* Icon with enhanced animation */}
        <motion.div 
          className="flex items-center justify-center mb-8"
          initial={{ opacity: 0, scale: 0, rotate: -180 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ 
            duration: 1,
            type: "spring",
            stiffness: 200,
            damping: 15
          }}
        >
          <div className="relative">
            <motion.div 
              className="bg-foreground p-4 rounded-xl shadow-sm hover-lift"
              whileHover={{ 
                scale: 1.1,
                rotate: 5,
                boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
              }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              <Sparkles className="h-12 w-12 text-background" />
            </motion.div>
          </div>
        </motion.div>
        
        {/* Main Heading with Blur Animation */}
        <motion.h1 
          className="text-5xl md:text-7xl font-heading font-bold tracking-tight mb-8 text-foreground"
          initial={{ opacity: 0, filter: "blur(20px)", y: 30 }}
          animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
          transition={{ 
            duration: 1.2, 
            ease: [0.25, 0.4, 0.25, 1],
            delay: 0.3 
          }}
        >
          <motion.span
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.8, duration: 0.8 }}
          >
            Make better{" "}
          </motion.span>
          <motion.span 
            className="bg-gradient-to-r from-primary via-primary/80 to-accent bg-clip-text text-transparent"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0, duration: 0.8 }}
          >
            buying decisions
          </motion.span>
          <motion.span
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1.4, duration: 0.5, type: "spring" }}
            className="inline-block"
          >
            .
          </motion.span>
        </motion.h1>
        
        {/* Subtitle */}
        <motion.p 
          className="text-xl text-muted-foreground max-w-3xl mx-auto mb-12 leading-relaxed"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ 
            delay: 0.6, 
            duration: 0.8,
            ease: "easeOut" 
          }}
        >
          IMO uses AI to replace hours of research with one clear answer.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div 
          className="flex flex-col sm:flex-row items-center justify-center gap-6"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ 
            delay: 1.2, 
            duration: 0.8,
            ease: "easeOut" 
          }}
        >
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            <Button asChild size="lg" className="bg-accent hover:bg-accent/90 rounded-lg px-10 h-12 text-base font-medium border-0 hover-lift">
              <Link to="/search" className="flex items-center space-x-3">
                <Search className="h-5 w-5" />
                <span>Start Searching</span>
                <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
          </motion.div>
          
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            <Button 
              variant="outline" 
              size="lg" 
              className="group relative overflow-hidden rounded-lg px-8 h-12 text-base font-normal transition-all duration-300 ease-in-out hover:bg-foreground hover:text-background motion-reduce:transition-none"
            >
              <motion.div
                className="absolute inset-0 bg-foreground"
                initial={{ scale: 0, opacity: 0 }}
                whileHover={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3 }}
                style={{ borderRadius: "inherit" }}
              />
              <span className="relative z-10 flex items-center">
                <Play className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform duration-200" />
                Watch Video
              </span>
            </Button>
          </motion.div>
        </motion.div>

        {/* Stats with staggered animation */}
        <motion.div 
          className="flex items-center justify-center gap-8 mt-16"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.6, duration: 0.8 }}
        >
          {[
            { value: "10K+", label: "Products Analyzed", delay: 0 },
            { value: "500+", label: "Review Videos", delay: 0.2 },
            { value: "98%", label: "Accuracy Rate", delay: 0.4 }
          ].map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.8 + stat.delay, duration: 0.6 }}
              className="text-center"
            >
              <motion.div 
                className="text-3xl font-medium text-foreground"
                whileHover={{ scale: 1.1 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                {stat.value}
              </motion.div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
              {index < 2 && <div className="w-px h-12 bg-border absolute right-0 top-1/2 transform -translate-y-1/2"></div>}
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};