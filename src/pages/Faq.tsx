import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { FaqSection } from "@/components/home/faq";

const Faq = () => {
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
            <Badge variant="secondary" className="mb-4">FAQ</Badge>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
              Frequently Asked
              <span className="block text-primary">Questions</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Find answers to the most common questions about IMO, our features, pricing, and how to get the most out of our platform.
            </p>
          </motion.div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <FaqSection />
        </div>
      </section>

      {/* Still Have Questions */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-6">
              Still Have Questions?
            </h2>
            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
              Can't find what you're looking for? Our support team is here to help.
            </p>
            <motion.a
              href="/contact"
              className="inline-block bg-primary text-primary-foreground px-8 py-3 rounded-xl font-semibold hover:bg-primary/90 transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Contact Support
            </motion.a>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default Faq;