export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      affiliate_clicks: {
        Row: {
          conversion_value: number | null
          id: string
          product_id: string
          session_id: string | null
          subscription_status: string | null
          timestamp: string
          user_id: string
        }
        Insert: {
          conversion_value?: number | null
          id?: string
          product_id: string
          session_id?: string | null
          subscription_status?: string | null
          timestamp?: string
          user_id: string
        }
        Update: {
          conversion_value?: number | null
          id?: string
          product_id?: string
          session_id?: string | null
          subscription_status?: string | null
          timestamp?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_clicks_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_events: {
        Row: {
          created_at: string
          event_data: Json
          event_name: string
          id: string
          ip_address: unknown | null
          session_id: string | null
          timestamp: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_data?: Json
          event_name: string
          id?: string
          ip_address?: unknown | null
          session_id?: string | null
          timestamp?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_data?: Json
          event_name?: string
          id?: string
          ip_address?: unknown | null
          session_id?: string | null
          timestamp?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      app_config: {
        Row: {
          config_key: string
          config_value: Json
          created_at: string
          description: string | null
          id: string
          updated_at: string
        }
        Insert: {
          config_key: string
          config_value: Json
          created_at?: string
          description?: string | null
          id?: string
          updated_at?: string
        }
        Update: {
          config_key?: string
          config_value?: Json
          created_at?: string
          description?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      background_analysis_tasks: {
        Row: {
          completed_at: string | null
          created_at: string
          heartbeat_at: string
          id: string
          page: number
          products_analyzed: number | null
          query_hash: string
          started_at: string
          status: string
          total_products: number | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          heartbeat_at?: string
          id?: string
          page: number
          products_analyzed?: number | null
          query_hash: string
          started_at?: string
          status?: string
          total_products?: number | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          heartbeat_at?: string
          id?: string
          page?: number
          products_analyzed?: number | null
          query_hash?: string
          started_at?: string
          status?: string
          total_products?: number | null
        }
        Relationships: []
      }
      comments: {
        Row: {
          content: string
          created_at: string
          id: string
          review_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          review_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          review_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "user_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      error_logs: {
        Row: {
          created_at: string
          error_details: Json | null
          error_message: string
          error_type: string
          function_name: string
          id: string
          query_context: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          error_details?: Json | null
          error_message: string
          error_type: string
          function_name: string
          id?: string
          query_context?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          error_details?: Json | null
          error_message?: string
          error_type?: string
          function_name?: string
          id?: string
          query_context?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      likes: {
        Row: {
          created_at: string
          id: string
          review_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          review_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          review_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "likes_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "user_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_transactions: {
        Row: {
          amount: number
          created_at: string
          id: string
          status: string
          stripe_session_id: string | null
          transaction_id: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          status?: string
          stripe_session_id?: string | null
          transaction_id: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          status?: string
          stripe_session_id?: string | null
          transaction_id?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      product_likes: {
        Row: {
          created_at: string
          id: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_likes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_reviews: {
        Row: {
          created_at: string
          external_review_id: string
          id: string
          negative_feedback: number | null
          positive_feedback: number | null
          product_id: string
          rating: number
          review_date: string | null
          review_text: string | null
          reviewer_name: string | null
          source: string | null
          title: string | null
          updated_at: string
          verified_purchase: boolean | null
        }
        Insert: {
          created_at?: string
          external_review_id: string
          id?: string
          negative_feedback?: number | null
          positive_feedback?: number | null
          product_id: string
          rating: number
          review_date?: string | null
          review_text?: string | null
          reviewer_name?: string | null
          source?: string | null
          title?: string | null
          updated_at?: string
          verified_purchase?: boolean | null
        }
        Update: {
          created_at?: string
          external_review_id?: string
          id?: string
          negative_feedback?: number | null
          positive_feedback?: number | null
          product_id?: string
          rating?: number
          review_date?: string | null
          review_text?: string | null
          reviewer_name?: string | null
          source?: string | null
          title?: string | null
          updated_at?: string
          verified_purchase?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_product_reviews_product_id"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          brand: string | null
          bullet_points: string | null
          cons: string[] | null
          created_at: string
          description: string | null
          external_url: string | null
          id: string
          image_url: string | null
          image_urls: string[] | null
          imo_score: number | null
          is_detailed_fetched: boolean | null
          needs_ai_analysis: boolean
          price: number | null
          product_keywords: string[] | null
          product_url: string | null
          pros: string[] | null
          query: string | null
          reviews_count: number | null
          reviews_summary: string | null
          site_rating: number | null
          source: string | null
          source_id: string | null
          title: string
        }
        Insert: {
          brand?: string | null
          bullet_points?: string | null
          cons?: string[] | null
          created_at?: string
          description?: string | null
          external_url?: string | null
          id?: string
          image_url?: string | null
          image_urls?: string[] | null
          imo_score?: number | null
          is_detailed_fetched?: boolean | null
          needs_ai_analysis?: boolean
          price?: number | null
          product_keywords?: string[] | null
          product_url?: string | null
          pros?: string[] | null
          query?: string | null
          reviews_count?: number | null
          reviews_summary?: string | null
          site_rating?: number | null
          source?: string | null
          source_id?: string | null
          title: string
        }
        Update: {
          brand?: string | null
          bullet_points?: string | null
          cons?: string[] | null
          created_at?: string
          description?: string | null
          external_url?: string | null
          id?: string
          image_url?: string | null
          image_urls?: string[] | null
          imo_score?: number | null
          is_detailed_fetched?: boolean | null
          needs_ai_analysis?: boolean
          price?: number | null
          product_keywords?: string[] | null
          product_url?: string | null
          pros?: string[] | null
          query?: string | null
          reviews_count?: number | null
          reviews_summary?: string | null
          site_rating?: number | null
          source?: string | null
          source_id?: string | null
          title?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          access_level: string | null
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"] | null
          subscription_tier: string | null
          updated_at: string
        }
        Insert: {
          access_level?: string | null
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          role?: Database["public"]["Enums"]["user_role"] | null
          subscription_tier?: string | null
          updated_at?: string
        }
        Update: {
          access_level?: string | null
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"] | null
          subscription_tier?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      search_unlocks: {
        Row: {
          created_at: string
          id: string
          payment_amount: number
          search_query: string
          unlock_date: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          payment_amount: number
          search_query: string
          unlock_date?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          payment_amount?: number
          search_query?: string
          unlock_date?: string
          user_id?: string
        }
        Relationships: []
      }
      subscription_events: {
        Row: {
          created_at: string
          event_data: Json | null
          event_type: string
          id: string
          ip_address: string | null
          referrer: string | null
          session_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_data?: Json | null
          event_type: string
          id?: string
          ip_address?: string | null
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_data?: Json | null
          event_type?: string
          id?: string
          ip_address?: string | null
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          plan_type: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_end: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          plan_type: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_end?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          plan_type?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_end?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      usage_logs: {
        Row: {
          count: number | null
          created_at: string
          id: string
          type: string
          user_id: string
        }
        Insert: {
          count?: number | null
          created_at?: string
          id?: string
          type: string
          user_id: string
        }
        Update: {
          count?: number | null
          created_at?: string
          id?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      user_interactions: {
        Row: {
          content_id: string | null
          content_type: string | null
          created_at: string
          id: string
          interaction_type: string
          metadata: Json | null
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          content_id?: string | null
          content_type?: string | null
          created_at?: string
          id?: string
          interaction_type: string
          metadata?: Json | null
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          content_id?: string | null
          content_type?: string | null
          created_at?: string
          id?: string
          interaction_type?: string
          metadata?: Json | null
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_reviews: {
        Row: {
          created_at: string
          description: string | null
          id: string
          product_id: string
          rating: number
          title: string
          user_id: string
          video_url: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          product_id: string
          rating: number
          title: string
          user_id: string
          video_url?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          product_id?: string
          rating?: number
          title?: string
          user_id?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      videos: {
        Row: {
          created_at: string
          description: string | null
          id: string
          likes: number | null
          platform: string
          product_id: string
          thumbnail_url: string | null
          title: string
          video_url: string
          views: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          likes?: number | null
          platform: string
          product_id: string
          thumbnail_url?: string | null
          title: string
          video_url: string
          views?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          likes?: number | null
          platform?: string
          product_id?: string
          thumbnail_url?: string | null
          title?: string
          video_url?: string
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "videos_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_stale_analysis_tasks: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      get_likes_for_products: {
        Args: { product_ids: string[]; user_id?: string }
        Returns: {
          like_count: number
          liked_by_user: boolean
          product_id: string
        }[]
      }
      has_exact_query_matches: {
        Args: {
          max_price?: number
          min_imo_score?: number
          min_price?: number
          min_rating?: number
          search_query: string
        }
        Returns: boolean
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      search_products_paginated: {
        Args: {
          max_price?: number
          min_imo_score?: number
          min_price?: number
          min_rating?: number
          page_num?: number
          page_size?: number
          search_query: string
          sort_by?: string
        }
        Returns: {
          cons: string[]
          created_at: string
          description: string
          id: string
          image_url: string
          image_urls: string[]
          imo_score: number
          price: number
          product_url: string
          pros: string[]
          query: string
          reviews_summary: string
          site_rating: number
          source: string
          source_id: string
          title: string
          total_count: number
        }[]
      }
      search_products_priority: {
        Args: {
          max_price?: number
          min_imo_score?: number
          min_price?: number
          min_rating?: number
          page_num?: number
          page_size?: number
          search_query: string
          sort_by?: string
        }
        Returns: {
          cons: string[]
          created_at: string
          description: string
          id: string
          image_url: string
          image_urls: string[]
          imo_score: number
          price: number
          priority_score: number
          product_url: string
          pros: string[]
          query: string
          reviews_summary: string
          site_rating: number
          source: string
          source_id: string
          title: string
          total_count: number
        }[]
      }
    }
    Enums: {
      user_role: "admin" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      user_role: ["admin", "user"],
    },
  },
} as const
