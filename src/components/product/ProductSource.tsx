import { Badge } from "@/components/ui/badge";
import { ShoppingBag, Package, Home, Search } from "lucide-react";

interface ProductSourceProps {
  source: 'Amazon' | 'Walmart' | 'Home Depot' | 'HomeDepot' | 'Google';
  className?: string;
}

const sourceConfig = {
  Amazon: {
    icon: ShoppingBag,
    label: "Amazon",
    variant: "secondary" as const,
    className: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
  },
  Walmart: {
    icon: Package,
    label: "Walmart",
    variant: "secondary" as const,
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
  },
  "Home Depot": {
    icon: Home,
    label: "Home Depot",
    variant: "secondary" as const,
    className: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
  },
  HomeDepot: {
    icon: Home,
    label: "Home Depot",
    variant: "secondary" as const,
    className: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
  },
  Google: {
    icon: Search,
    label: "Google Shopping",
    variant: "secondary" as const,
    className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
  }
};

export const ProductSource = ({ source, className }: ProductSourceProps) => {
  const config = sourceConfig[source];

  // Fallback if source is not recognized
  if (!config) {
    console.warn(`Unknown product source: ${source}`);
    return (
      <Badge
        variant="secondary"
        className={`bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200 ${className || ''} flex items-center gap-1`}
      >
        <Search className="h-3 w-3" />
        {source || 'Unknown'}
      </Badge>
    );
  }

  const Icon = config.icon;

  return (
    <Badge
      variant={config.variant}
      className={`${config.className} ${className || ''} flex items-center gap-1`}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
};