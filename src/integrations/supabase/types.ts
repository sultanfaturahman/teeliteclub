export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      cart_items: {
        Row: {
          created_at: string | null
          id: string
          product_id: string | null
          quantity: number
          ukuran: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          product_id?: string | null
          quantity: number
          ukuran?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          product_id?: string | null
          quantity?: number
          ukuran?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_settings: {
        Row: {
          id: string
          is_enabled: boolean
          maintenance_start: string | null
          maintenance_end: string | null
          title: string
          message: string
          countdown_message: string
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          is_enabled?: boolean
          maintenance_start?: string | null
          maintenance_end?: string | null
          title?: string
          message?: string
          countdown_message?: string
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          is_enabled?: boolean
          maintenance_start?: string | null
          maintenance_end?: string | null
          title?: string
          message?: string
          countdown_message?: string
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      maintenance_notifications: {
        Row: {
          id: string
          email: string
          created_at: string | null
          notify_at: string | null
          notified_at: string | null
          admin_message: string | null
        }
        Insert: {
          id?: string
          email: string
          created_at?: string | null
          notify_at?: string | null
          notified_at?: string | null
          admin_message?: string | null
        }
        Update: {
          id?: string
          email?: string
          created_at?: string | null
          notify_at?: string | null
          notified_at?: string | null
          admin_message?: string | null
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string | null
          harga: number
          id: string
          jumlah: number
          order_id: string
          product_id: string
          ukuran: string
        }
        Insert: {
          created_at?: string | null
          harga: number
          id?: string
          jumlah: number
          order_id: string
          product_id: string
          ukuran: string
        }
        Update: {
          created_at?: string | null
          harga?: number
          id?: string
          jumlah?: number
          order_id?: string
          product_id?: string
          ukuran?: string
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
        ]
      }
      orders: {
        Row: {
          created_at: string | null
          email_pembeli: string | null
          id: string
          nama_pembeli: string | null
          order_number: string
          payment_method: string | null
          payment_url: string | null
          shipping_address: string | null
          shipping_method: string | null
          status: string | null
          telepon_pembeli: string | null
          total: number
          tracking_number: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email_pembeli?: string | null
          id?: string
          nama_pembeli?: string | null
          order_number: string
          payment_method?: string | null
          payment_url?: string | null
          shipping_address?: string | null
          shipping_method?: string | null
          status?: string | null
          telepon_pembeli?: string | null
          total: number
          tracking_number?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email_pembeli?: string | null
          id?: string
          nama_pembeli?: string | null
          order_number?: string
          payment_method?: string | null
          payment_url?: string | null
          shipping_address?: string | null
          shipping_method?: string | null
          status?: string | null
          telepon_pembeli?: string | null
          total?: number
          tracking_number?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          order_id: string
          payment_proof: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          order_id: string
          payment_proof?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          order_id?: string
          payment_proof?: string | null
          status?: string | null
          updated_at?: string | null
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
      product_sizes: {
        Row: {
          created_at: string | null
          id: string
          product_id: string
          stok: number | null
          ukuran: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          product_id: string
          stok?: number | null
          ukuran: string
        }
        Update: {
          created_at?: string | null
          id?: string
          product_id?: string
          stok?: number | null
          ukuran?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_sizes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          gambar: string[] | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          price: number
          search_vector: unknown | null
          size_chart: Json | null
          stock_quantity: number | null
          ukuran: string[] | null
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          gambar?: string[] | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          price: number
          search_vector?: unknown | null
          size_chart?: Json | null
          stock_quantity?: number | null
          ukuran?: string[] | null
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          gambar?: string[] | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          price?: number
          search_vector?: unknown | null
          size_chart?: Json | null
          stock_quantity?: number | null
          ukuran?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          alamat: string | null
          created_at: string | null
          email: string | null
          id: string
          nama: string | null
          role: string | null
          telepon: string | null
          updated_at: string | null
        }
        Insert: {
          alamat?: string | null
          created_at?: string | null
          email?: string | null
          id: string
          nama?: string | null
          role?: string | null
          telepon?: string | null
          updated_at?: string | null
        }
        Update: {
          alamat?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          nama?: string | null
          role?: string | null
          telepon?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      role_audit_log: {
        Row: {
          action: string
          changed_at: string | null
          changed_by: string | null
          id: string
          new_role: string
          old_role: string | null
          user_id: string
        }
        Insert: {
          action: string
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          new_role: string
          old_role?: string | null
          user_id: string
        }
        Update: {
          action?: string
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          new_role?: string
          old_role?: string | null
          user_id?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          key: string
          updated_at: string
          value: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_order_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_category_breakdown: {
        Args: Record<PropertyKey, never>
        Returns: {
          category: string
          product_count: number
          total_value: number
        }[]
      }
      get_dashboard_stats: {
        Args: Record<PropertyKey, never>
        Returns: {
          total_products: number
          total_value: number
          low_stock_products: number
          out_of_stock_products: number
          total_categories: number
          recent_products: number
        }[]
      }
      get_recent_activity: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          name: string
          action: string
          date: string
        }[]
      }
      get_user_role: {
        Args: { user_id: string }
        Returns: string
      }
      exec_sql: {
        Args: { sql: string }
        Returns: unknown
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
    Enums: {},
  },
} as const
