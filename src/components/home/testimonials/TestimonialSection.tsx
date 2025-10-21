import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";

interface Testimonial {
  quote: string;
  author: string;
  role: string;
  avatarSrc: string;
  initials: string;
}

const testimonials: Testimonial[] = [
  {
    quote: "IMO saved me 6 hours shopping for a treadmill.",
    author: "Alex P.",
    role: "Beta User",
    avatarSrc: "https://randomuser.me/api/portraits/men/32.jpg",
    initials: "AP"
  },
  {
    quote: "Flagged a hidden issue and saved me $400.",
    author: "Sarah K.",
    role: "Beta User",
    avatarSrc: "https://randomuser.me/api/portraits/women/44.jpg",
    initials: "SK"
  }
];

export const TestimonialSection = () => {
  // Determine if reduced motion is preferred
  const prefersReducedMotion = typeof window !== 'undefined' && 
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    <section
      aria-labelledby="testimonials-title"
      className="py-24"
    >
      <div className="max-w-6xl mx-auto px-4">
        <motion.div
          initial={{ 
            opacity: 0, 
            y: 20,
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
            id="testimonials-title" 
            className="text-4xl font-heading font-normal mb-4"
          >
            Real People. Real Results.
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {testimonials.map((testimonial, index) => (
            <TestimonialCard 
              key={index} 
              testimonial={testimonial} 
              index={index} 
              prefersReducedMotion={prefersReducedMotion}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

interface TestimonialCardProps {
  testimonial: Testimonial;
  index: number;
  prefersReducedMotion: boolean;
}

const TestimonialCard = ({ testimonial, index, prefersReducedMotion }: TestimonialCardProps) => {
  // Calculate delay based on index for staggered animation
  const delay = 0.2 + (index * 0.15);

  return (
    <motion.div
      initial={{ 
        opacity: 0, 
        y: 30,
        filter: "blur(5px)",
        scale: 0.98
      }}
      whileInView={{ 
        opacity: 1, 
        y: 0, 
        filter: "blur(0px)",
        scale: 1
      }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ 
        duration: 0.6, 
        delay: prefersReducedMotion ? 0 : delay,
        ease: [0.25, 0.1, 0.25, 1.0]
      }}
    >
      <Card className="glass-card hover-lift h-full">
        <CardContent className="p-8 flex flex-col h-full">
          <blockquote className="text-lg mb-6 flex-grow">
            "{testimonial.quote}"
          </blockquote>
          
          <div className="flex items-center">
            <Avatar className="h-12 w-12 mr-4">
              <AvatarImage 
                src={testimonial.avatarSrc} 
                alt={testimonial.author} 
              />
              <AvatarFallback>{testimonial.initials}</AvatarFallback>
            </Avatar>
            <div>
              <div className="font-medium">{testimonial.author}</div>
              <div className="text-sm text-muted-foreground">{testimonial.role}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};