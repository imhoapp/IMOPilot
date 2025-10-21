import { useQuery } from "@tanstack/react-query";
import {
	SUPABASE_PUBLISHABLE_KEY,
	SUPABASE_URL,
	supabase,
} from "@/integrations/supabase/client";

export const useProductBasic = (productId?: string) => {
	return useQuery({
		queryKey: ["product-basic", productId],
		queryFn: async ({ signal }) => {
			if (!productId) throw new Error("Product ID is required");

			// Validate productId format before making the API call
			if (
				productId === "undefined" ||
				productId === "null" ||
				!productId.trim()
			) {
				throw new Error("Invalid product ID format");
			}

			// Basic UUID format validation
			const uuidRegex =
				/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
			if (!uuidRegex.test(productId)) {
				throw new Error("Product ID must be a valid UUID");
			}

			const { data: sessionData } = await supabase.auth.getSession();
			const authToken =
				sessionData.session?.access_token ?? SUPABASE_PUBLISHABLE_KEY;
			const res = await fetch(
				`${SUPABASE_URL}/functions/v1/fetch-product-basic`,
				{
					method: "POST",
					signal,
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${authToken}`,
					},
					body: JSON.stringify({ productId }),
				},
			);
			if (!res.ok) {
				const text = await res.text();
				throw new Error(text || "Failed to fetch product");
			}
			const data = await res.json();
			if (!data?.success)
				throw new Error(data?.error || "Failed to fetch product");
			return data;
		},
		enabled: !!productId && productId !== "undefined" && productId !== "null",
		staleTime: 5 * 60 * 1000,
		refetchOnWindowFocus: false,
		refetchOnReconnect: false,
		refetchOnMount: false,
		placeholderData: (previousData) => previousData,
	});
};

export const useProductReviews = (
	productId?: string,
	enabled: boolean = true,
) => {
	return useQuery({
		queryKey: ["product-reviews", productId],
		queryFn: async ({ signal }) => {
			if (!productId) throw new Error("Product ID is required");

			// Validate productId format
			if (
				productId === "undefined" ||
				productId === "null" ||
				!productId.trim()
			) {
				throw new Error("Invalid product ID format");
			}

			const { data: sessionData } = await supabase.auth.getSession();
			const authToken =
				sessionData.session?.access_token ?? SUPABASE_PUBLISHABLE_KEY;
			const res = await fetch(
				`${SUPABASE_URL}/functions/v1/fetch-product-reviews`,
				{
					method: "POST",
					signal,
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${authToken}`,
					},
					body: JSON.stringify({ productId }),
				},
			);
			if (!res.ok) {
				const text = await res.text();
				throw new Error(text || "Failed to fetch reviews");
			}
			const data = await res.json();
			if (!data?.success)
				throw new Error(data?.error || "Failed to fetch reviews");
			return data;
		},
		enabled:
			!!productId &&
			enabled &&
			productId !== "undefined" &&
			productId !== "null",
		staleTime: 10 * 60 * 1000,
		refetchOnWindowFocus: false,
		refetchOnReconnect: false,
		refetchOnMount: false,
		placeholderData: (previousData) => previousData,
	});
};

export const useProductVideos = (
	productId?: string,
	enabled: boolean = true,
) => {
	return useQuery({
		queryKey: ["product-videos", productId],
		queryFn: async ({ signal }) => {
			if (!productId) throw new Error("Product ID is required");

			// Validate productId format
			if (
				productId === "undefined" ||
				productId === "null" ||
				!productId.trim()
			) {
				throw new Error("Invalid product ID format");
			}

			const { data: sessionData } = await supabase.auth.getSession();
			const authToken =
				sessionData.session?.access_token ?? SUPABASE_PUBLISHABLE_KEY;
			const res = await fetch(
				`${SUPABASE_URL}/functions/v1/fetch-product-videos`,
				{
					method: "POST",
					signal,
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${authToken}`,
					},
					body: JSON.stringify({ productId }),
				},
			);
			if (!res.ok) {
				const text = await res.text();
				throw new Error(text || "Failed to fetch videos");
			}
			const data = await res.json();
			if (!data?.success)
				throw new Error(data?.error || "Failed to fetch videos");
			return data;
		},
		enabled:
			!!productId &&
			enabled &&
			productId !== "undefined" &&
			productId !== "null",
		staleTime: 15 * 60 * 1000,
		refetchOnWindowFocus: false,
		refetchOnReconnect: false,
		refetchOnMount: false,
		placeholderData: (previousData) => previousData,
	});
};
