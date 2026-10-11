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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      addresses: {
        Row: {
          city: string
          full_name: string
          id: string
          is_default: boolean
          line1: string
          line2: string | null
          phone: string
          pincode: string
          state: string
          user_id: string
        }
        Insert: {
          city: string
          full_name: string
          id?: string
          is_default?: boolean
          line1: string
          line2?: string | null
          phone: string
          pincode: string
          state: string
          user_id: string
        }
        Update: {
          city?: string
          full_name?: string
          id?: string
          is_default?: boolean
          line1?: string
          line2?: string | null
          phone?: string
          pincode?: string
          state?: string
          user_id?: string
        }
        Relationships: []
      }
      banners: {
        Row: {
          cta_href: string | null
          cta_label: string | null
          ends_at: string | null
          id: string
          image_url: string | null
          is_active: boolean
          placement: string
          sort_order: number
          starts_at: string | null
          subtitle: string | null
          title: string
        }
        Insert: {
          cta_href?: string | null
          cta_label?: string | null
          ends_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          placement: string
          sort_order?: number
          starts_at?: string | null
          subtitle?: string | null
          title: string
        }
        Update: {
          cta_href?: string | null
          cta_label?: string | null
          ends_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          placement?: string
          sort_order?: number
          starts_at?: string | null
          subtitle?: string | null
          title?: string
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          cart_id: string
          created_at: string
          id: string
          qty: number
          updated_at: string
          variant_id: string
        }
        Insert: {
          cart_id: string
          created_at?: string
          id?: string
          qty: number
          updated_at?: string
          variant_id: string
        }
        Update: {
          cart_id?: string
          created_at?: string
          id?: string
          qty?: number
          updated_at?: string
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_cart_id_fkey"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "carts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      carts: {
        Row: {
          created_at: string
          id: string
          session_token: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          session_token?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          session_token?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      festivals: {
        Row: {
          event_date: string | null
          icon_url: string | null
          id: string
          is_active: boolean
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          event_date?: string | null
          icon_url?: string | null
          id?: string
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          event_date?: string | null
          icon_url?: string | null
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      inventory_reservations: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          order_id: string | null
          qty: number
          status: string
          variant_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          order_id?: string | null
          qty: number
          status?: string
          variant_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          order_id?: string | null
          qty?: number
          status?: string
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_reservations_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_subscribers: {
        Row: {
          created_at: string
          discount_code: string | null
          email: string
          id: string
        }
        Insert: {
          created_at?: string
          discount_code?: string | null
          email: string
          id?: string
        }
        Update: {
          created_at?: string
          discount_code?: string | null
          email?: string
          id?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          price_paise: number
          product_id: string | null
          qty: number
          size: string | null
          sku: string | null
          tax_paise: number
          title_snapshot: string
          variant_id: string | null
        }
        Insert: {
          id?: string
          order_id: string
          price_paise: number
          product_id?: string | null
          qty: number
          size?: string | null
          sku?: string | null
          tax_paise?: number
          title_snapshot: string
          variant_id?: string | null
        }
        Update: {
          id?: string
          order_id?: string
          price_paise?: number
          product_id?: string | null
          qty?: number
          size?: string | null
          sku?: string | null
          tax_paise?: number
          title_snapshot?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          currency: string
          discount_paise: number
          email: string | null
          id: string
          idempotency_key: string | null
          order_number: string | null
          payment_status: string
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          shipping_address: Json
          shipping_paise: number
          status: string
          subtotal_paise: number
          tax_paise: number
          total_paise: number
          user_id: string | null
        }
        Insert: {
          created_at?: string
          currency?: string
          discount_paise?: number
          email?: string | null
          id?: string
          idempotency_key?: string | null
          order_number?: string | null
          payment_status?: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          shipping_address: Json
          shipping_paise?: number
          status?: string
          subtotal_paise?: number
          tax_paise?: number
          total_paise: number
          user_id?: string | null
        }
        Update: {
          created_at?: string
          currency?: string
          discount_paise?: number
          email?: string | null
          id?: string
          idempotency_key?: string | null
          order_number?: string | null
          payment_status?: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          shipping_address?: Json
          shipping_paise?: number
          status?: string
          subtotal_paise?: number
          tax_paise?: number
          total_paise?: number
          user_id?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount_paise: number
          created_at: string
          currency: string
          failure_reason: string | null
          id: string
          order_id: string
          provider: string
          provider_order_id: string
          provider_payment_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount_paise: number
          created_at?: string
          currency?: string
          failure_reason?: string | null
          id?: string
          order_id: string
          provider?: string
          provider_order_id: string
          provider_payment_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount_paise?: number
          created_at?: string
          currency?: string
          failure_reason?: string | null
          id?: string
          order_id?: string
          provider?: string
          provider_order_id?: string
          provider_payment_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      product_festivals: {
        Row: {
          festival_id: string
          product_id: string
        }
        Insert: {
          festival_id: string
          product_id: string
        }
        Update: {
          festival_id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_festivals_festival_id_fkey"
            columns: ["festival_id"]
            isOneToOne: false
            referencedRelation: "festivals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_festivals_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          alt: string | null
          id: string
          is_primary: boolean
          product_id: string
          sort_order: number
          url: string
        }
        Insert: {
          alt?: string | null
          id?: string
          is_primary?: boolean
          product_id: string
          sort_order?: number
          url: string
        }
        Update: {
          alt?: string | null
          id?: string
          is_primary?: boolean
          product_id?: string
          sort_order?: number
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          color: string
          id: string
          product_id: string
          size: string
          sku: string | null
          stock: number
          stock_reserved: number
        }
        Insert: {
          color?: string
          id?: string
          product_id: string
          size: string
          sku?: string | null
          stock?: number
          stock_reserved?: number
        }
        Update: {
          color?: string
          id?: string
          product_id?: string
          size?: string
          sku?: string | null
          stock?: number
          stock_reserved?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          audience: string
          badge: string | null
          category_id: string | null
          compare_at_paise: number | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          price_paise: number
          slug: string
          source: string
          title: string
          total_sold: number
          updated_at: string
        }
        Insert: {
          audience?: string
          badge?: string | null
          category_id?: string | null
          compare_at_paise?: number | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          price_paise: number
          slug: string
          source?: string
          title: string
          total_sold?: number
          updated_at?: string
        }
        Update: {
          audience?: string
          badge?: string | null
          category_id?: string | null
          compare_at_paise?: number | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          price_paise?: number
          slug?: string
          source?: string
          title?: string
          total_sold?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          role: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          role?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          role?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          product_id: string
          rating: number
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          product_id: string
          rating: number
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          product_id?: string
          rating?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          created_at: string
          delta: number
          id: string
          reason: string
          ref_id: string | null
          ref_type: string | null
          variant_id: string
        }
        Insert: {
          created_at?: string
          delta: number
          id?: string
          reason: string
          ref_id?: string | null
          ref_type?: string | null
          variant_id: string
        }
        Update: {
          created_at?: string
          delta?: number
          id?: string
          reason?: string
          ref_id?: string | null
          ref_type?: string | null
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_events: {
        Row: {
          created_at: string
          event_id: string
          id: string
          payload: Json
          processed_at: string | null
          provider: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          payload: Json
          processed_at?: string | null
          provider?: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          payload?: Json
          processed_at?: string | null
          provider?: string
        }
        Relationships: []
      }
      wishlist: {
        Row: {
          created_at: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlist_product_id_fkey"
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
      is_admin: { Args: never; Returns: boolean }
      reserve_stock: {
        Args: {
          p_variant_id: string
          p_qty: number
          p_expires_at: string
          p_order_id?: string | null
        }
        Returns: string | null
      }
      release_stock_reservation: {
        Args: {
          p_reservation_id: string
        }
        Returns: boolean
      }
      release_expired_stock_reservations: {
        Args: Record<string, never>
        Returns: number
      }
      finalize_stock_reservation: {
        Args: {
          p_reservation_id: string
        }
        Returns: boolean
      }
      finalize_order_stock: {
        Args: {
          p_order_id: string
        }
        Returns: number
      }
      release_order_reservations: {
        Args: {
          p_order_id: string
        }
        Returns: number
      }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
