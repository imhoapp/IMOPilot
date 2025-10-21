import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Brain, Users, CheckCircle } from "lucide-react";

const HowItWorks = () => {
  const steps = [
    {
      step: "01",
      icon: Search,
      title: "Search Any Product",
      description: "Simply type in what you're looking for. Our intelligent search understands natural language and finds exactly what you need.",
      features: ["Smart autocomplete", "Category suggestions", "Visual search coming soon"],
      visualization: "Enter your search query and watch as our AI instantly begins analyzing thousands of products across multiple retailers, understanding context and intent to deliver the most relevant results."
    },
    {
      step: "02", 
      icon: Brain,
      title: "AI Analysis",
      description: "Our advanced AI analyzes thousands of reviews, specifications, and user feedback to provide comprehensive insights.",
      features: ["Sentiment analysis", "Feature extraction", "Price trend analysis"],
      visualization: "Our machine learning models process vast amounts of data in real-time, extracting key insights from customer reviews, technical specifications, and market trends to give you a complete picture."
    },
    {
      step: "03",
      icon: Users,
      title: "Community Insights", 
      description: "Get real user reviews, video demonstrations, and community discussions about each product.",
      features: ["Verified reviews", "Video content", "User ratings breakdown"],
      visualization: "Access curated content from real users including detailed reviews, unboxing videos, and hands-on demonstrations that help you understand exactly what to expect from each product."
    },
    {
      step: "04",
      icon: CheckCircle,
      title: "Make Confident Decisions",
      description: "Armed with comprehensive data and insights, make purchasing decisions you can trust.",
      features: ["Pros & cons summary", "Best alternatives", "Purchase recommendations"],
      visualization: "All the analyzed data is synthesized into clear, actionable insights with personalized recommendations, helping you choose the perfect product for your specific needs and budget."
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Badge variant="secondary" className="mb-4">How It Works</Badge>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
              From Search to
              <span className="block text-primary">Smart Decision</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Discover how IMO transforms your product research experience in four simple steps, 
              powered by AI and community insights.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Steps Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="space-y-12">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isEven = index % 2 === 0;
              
              return (
                <motion.div
                  key={step.step}
                  initial={{ opacity: 0, x: isEven ? -40 : 40 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className={`flex flex-col ${isEven ? 'lg:flex-row' : 'lg:flex-row-reverse'} items-center gap-8 lg:gap-16`}
                >
                  {/* Content */}
                  <div className="flex-1 space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="text-4xl font-bold text-primary/30">{step.step}</div>
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-2xl md:text-3xl font-bold tracking-tight mb-4">
                        {step.title}
                      </h3>
                      <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                        {step.description}
                      </p>
                    </div>

                    <div className="space-y-3">
                      {step.features.map((feature, idx) => (
                        <div key={idx} className="flex items-center gap-3">
                          <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                          <span className="text-muted-foreground">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Visual - Hidden on mobile and tablet */}
                  <div className="flex-1 hidden lg:block">
                    <Card className="h-64 md:h-80 bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
                      <CardContent className="h-full flex items-center justify-center p-8">
                        <div className="text-center">
                          <Icon className="h-12 w-12 text-primary mx-auto mb-6" />
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {step.visualization}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-6">
              Ready to Get Started?
            </h2>
            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
              Join thousands of users who are already making smarter purchasing decisions with IMO.
            </p>
            <motion.a
              href="/search"
              className="inline-block bg-primary text-primary-foreground px-8 py-3 rounded-xl font-semibold hover:bg-primary/90 transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Start Searching Now
            </motion.a>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default HowItWorks;