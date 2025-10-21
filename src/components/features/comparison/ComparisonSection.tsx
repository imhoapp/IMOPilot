import { motion } from "framer-motion";
import { Clock, Layers, CheckCircle } from "lucide-react";

interface ComparisonItem {
  label: string;
  icon: React.ReactNode;
  manual: string;
  withIMO: string;
}

const comparisonData: ComparisonItem[] = [
  {
    label: "Time",
    icon: <Clock className="h-5 w-5 text-primary" />,
    manual: "4–6 hours",
    withIMO: "~15 minutes"
  },
  {
    label: "Sources",
    icon: <Layers className="h-5 w-5 text-primary" />,
    manual: "10+ tabs",
    withIMO: "One clean feed"
  },
  {
    label: "Confidence",
    icon: <CheckCircle className="h-5 w-5 text-primary" />,
    manual: "Guesswork",
    withIMO: "AI-backed clarity"
  }
];

export const ComparisonSection = () => {
  return (
    <section
      aria-labelledby="comparison-title"
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
            id="comparison-title" 
            className="text-4xl font-heading font-normal mb-4"
          >
            How IMO Compares
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="overflow-x-auto"
        >
          <div className="min-w-min">
            <table className="w-full border-separate border-spacing-0 rounded-2xl overflow-hidden">
              <thead>
                <tr>
                  <th scope="col" className="w-1/3 bg-muted/30 px-6 py-4 text-left font-medium text-lg border-b border-border"></th>
                  <motion.th 
                    scope="col" 
                    className="w-1/3 bg-muted/30 px-6 py-4 text-center font-medium text-lg border-b border-border"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                  >
                    Manual Research
                  </motion.th>
                  <motion.th 
                    scope="col" 
                    className="w-1/3 bg-primary text-primary-foreground px-6 py-4 text-center font-medium text-lg border-b border-primary/20"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.5 }}
                  >
                    With IMO
                  </motion.th>
                </tr>
              </thead>
              <tbody>
                {comparisonData.map((item, index) => (
                  <motion.tr 
                    key={item.label}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.2 + (index * 0.15) }}
                  >
                    <th scope="row" className="bg-muted/30 px-6 py-5 text-left font-normal border-b border-border">
                      <div className="flex items-center space-x-3">
                        {item.icon}
                        <span>{item.label}</span>
                      </div>
                    </th>
                    <td className="bg-muted/30 px-6 py-5 text-center border-b border-border">
                      {item.manual}
                    </td>
                    <td className="bg-primary/5 px-6 py-5 text-center font-medium text-primary border-b border-primary/10">
                      {item.withIMO}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </section>
  );
};