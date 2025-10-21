import { motion, useInView } from "framer-motion";
import { useRef, useState } from "react";
import { ChevronDown, HelpCircle, Shield, Package, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";

interface FaqItem {
  id: string;
  question: string;
  answer: string;
  icon: React.ComponentType<{ className?: string }>;
}

const faqData: FaqItem[] = [
  {
    id: "different",
    question: "How is IMO different?",
    answer: "IMO combines AI analysis of thousands of reviews with curated video content to give you one clear buying decision. No more tab-switching or second-guessing.",
    icon: HelpCircle,
  },
  {
    id: "reliable",
    question: "Is the AI reliable?",
    answer: "Our AI analyzes verified purchase reviews and professional testing data to provide balanced, unbiased recommendations. It's designed to flag both pros and cons.",
    icon: Shield,
  },
  {
    id: "products",
    question: "What products are included?",
    answer: "We focus on purchases over $250: electronics, appliances, furniture, fitness equipment, and more. If it's a big decision, IMO has you covered.",
    icon: Package,
  },
  {
    id: "free",
    question: "Is it really free?",
    answer: "Yes! You can always browse the top 3 products in any category for free. For deeper insights, unlock specific categories for $4.99 each or go unlimited with our $10.99/month subscription. No hidden fees.",
    icon: DollarSign,
  },
];

export const FaqSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [openItem, setOpenItem] = useState<string | null>("different");

  const toggleItem = (id: string) => {
    setOpenItem(openItem === id ? null : id);
  };

  return (
    <motion.section
      ref={ref}
      initial={{ opacity: 0, y: 50 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-24"
    >
      <div className="text-center mb-16">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-4xl md:text-5xl font-heading font-normal tracking-tight text-foreground mb-4"
        >
          FAQs—Simple Answers, No Jargon
        </motion.h2>
      </div>

      <div className="max-w-3xl mx-auto space-y-4">
        {faqData.map((item, index) => {
          const Icon = item.icon;
          const isOpen = openItem === item.id;

          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ duration: 0.5, delay: 0.1 * index }}
              className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden"
            >
              <button
                onClick={() => toggleItem(item.id)}
                className="w-full px-6 py-6 text-left flex items-center justify-between hover:bg-muted/50 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                aria-expanded={isOpen}
                aria-controls={`faq-content-${item.id}`}
              >
                <div className="flex items-center space-x-4">
                  <div className="bg-primary/10 p-2 rounded-lg">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-lg font-medium text-foreground">
                    {item.question}
                  </h3>
                </div>
                <motion.div
                  animate={{ rotate: isOpen ? 180 : 0 }}
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                >
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                </motion.div>
              </button>

              <motion.div
                id={`faq-content-${item.id}`}
                initial={false}
                animate={{
                  height: isOpen ? "auto" : 0,
                  opacity: isOpen ? 1 : 0,
                }}
                transition={{
                  height: { duration: 0.3, ease: "easeInOut" },
                  opacity: { duration: 0.2, delay: isOpen ? 0.1 : 0 },
                }}
                className="overflow-hidden"
                style={{ 
                  height: isOpen ? "auto" : 0,
                  opacity: isOpen ? 1 : 0,
                }}
              >
                <div className="px-6 py-4 pl-16">
                  <p className="text-muted-foreground leading-relaxed">
                    {item.answer}
                  </p>
                </div>
              </motion.div>
            </motion.div>
          );
        })}
      </div>
    </motion.section>
  );
};