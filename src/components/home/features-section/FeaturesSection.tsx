import { motion } from "framer-motion";
import { Search, Sparkles, Eye } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  index: number;
}

const FeatureCard = ({ icon, title, description, index }: FeatureCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.1 + (index * 0.2) }}
      viewport={{ once: true }}
    >
      <Card className="glass-card hover-lift group h-full">
        <CardContent className="p-8 text-center h-full">
          <div className="bg-muted w-16 h-16 rounded-lg flex items-center justify-center mx-auto mb-6">
            {icon}
          </div>
          <h3 className="text-xl font-heading font-normal mb-4">{title}</h3>
          <p className="text-muted-foreground leading-relaxed">
            {description}
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export const FeaturesSection = () => {
  const features = [
    {
      icon: <Sparkles className="h-8 w-8 text-muted-foreground" />,
      title: "AI Summaries",
      description: "Instantly see what thousands of buyers are saying."
    },
    {
      icon: <Eye className="h-8 w-8 text-muted-foreground" />,
      title: "Short Reels",
      description: "Watch honest reviews, not sponsored promos."
    },
    {
      icon: <Search className="h-8 w-8 text-muted-foreground" />,
      title: "IMO Score",
      description: "One number. Everything considered. No noise."
    }
  ];

  return (
    <section 
      aria-labelledby="features-title"
      className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-20"
    >
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        viewport={{ once: true }}
        className="text-center mb-16"
      >
        <Badge variant="secondary" className="mb-4 px-4 py-2 text-sm font-normal">
          Features
        </Badge>
        <h2 
          id="features-title"
          className="text-3xl font-heading font-normal mb-4"
        >
          Clarity. Confidence. All in One Place.
        </h2>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          AI does the reading. You get the insight.
        </p>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        viewport={{ once: true }}
        className="grid md:grid-cols-3 gap-8"
      >
        {features.map((feature, index) => (
          <FeatureCard
            key={index}
            icon={feature.icon}
            title={feature.title}
            description={feature.description}
            index={index}
          />
        ))}
      </motion.div>
    </section>
  );
};