import { motion } from "framer-motion";
import { X } from "lucide-react";

export const ProblemStatementSection = () => {
  // Determine if reduced motion is preferred
  const prefersReducedMotion = typeof window !== 'undefined' && 
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Pain points data
  const painPoints = [
    "Endless tabs and fake reviews",
    "Confusing specs and biased advice",
    "Regret after a $400 mistake"
  ];

  return (
    <section 
      aria-labelledby="problem-statement-title"
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
            id="problem-statement-title" 
            className="text-4xl font-heading font-normal mb-4"
          >
            Big Purchases Shouldn't Feel Like a Gamble
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            You want to be smart. But research takes hours. Reviews contradict each other. 
            And you're still unsure what to buy.
          </p>
        </motion.div>

        <motion.ul
          className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          {painPoints.map((point, index) => (
            <motion.li
              key={index}
              initial={{ 
                opacity: 0, 
                y: 30, 
                filter: "blur(8px)"
              }}
              whileInView={{ 
                opacity: 1, 
                y: 0, 
                filter: "blur(0px)"
              }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ 
                duration: 0.6, 
                delay: prefersReducedMotion ? 0 : 0.2 + (index * 0.15),
                ease: [0.25, 0.1, 0.25, 1.0]
              }}
              className="flex flex-col items-center p-6 text-center"
            >
              <div className="flex items-center justify-center mb-4 w-12 h-12 rounded-full bg-destructive/10">
                <X className="h-6 w-6 text-destructive" />
              </div>
              <p className="font-medium text-lg">{point}</p>
            </motion.li>
          ))}
        </motion.ul>
      </div>
    </section>
  );
};