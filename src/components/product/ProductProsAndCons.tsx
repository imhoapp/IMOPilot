import { Card, CardContent } from "@/components/ui/card";

interface ProductProsAndConsProps {
  pros?: string[];
  cons?: string[];
}

export const ProductProsAndCons = ({ pros, cons }: ProductProsAndConsProps) => {
  if (!pros?.length && !cons?.length) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {pros && pros.length > 0 && (
        <Card className="glass-card">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-green-600 dark:text-green-400 mb-4">
              Pros
            </h3>
            <ul className="space-y-2">
              {pros.map((pro, i) => (
                <li key={i} className="flex items-start">
                  <span className="text-green-500 mr-3 mt-1">•</span>
                  <span className="text-sm">{pro}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {cons && cons.length > 0 && (
        <Card className="glass-card">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-4">
              Cons
            </h3>
            <ul className="space-y-2">
              {cons.map((con, i) => (
                <li key={i} className="flex items-start">
                  <span className="text-red-500 mr-3 mt-1">•</span>
                  <span className="text-sm">{con}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
};