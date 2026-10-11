// Migration-derived contract, maintained locally until CLI type generation can
// run against the verified schema. Replace using the documented gen command.
type Timestamps = { created_at: string; updated_at: string };
export type Category = Timestamps & { id: string; slug: string; name: string; is_active: boolean };
export type Product = Timestamps & {
  id: string; category_id: string; slug: string; name: string; description: string;
  status: "draft" | "published" | "archived"; is_active: boolean; is_demo: boolean; published_at: string | null;
};
export type Variant = Timestamps & { id: string; product_id: string; sku: string; size: string; colour: string; price_paise: number | null; stock_quantity: number; is_active: boolean };
export type ProductImage = Timestamps & { id: string; product_id: string; storage_path: string; alt_text: string; sort_order: number; is_published: boolean };
type Table<Row, Required extends keyof Row = never, Relations = []> = {
  Row: Row; Insert: Pick<Row, Required> & Partial<Omit<Row, Required>>; Update: Partial<Row>; Relationships: Relations;
};
export type Database = {
  public: {
    Tables: {
      categories: Table<Category, "slug" | "name">;
      festivals: Table<Category, "slug" | "name">;
      products: Table<Product, "category_id" | "slug" | "name", [{ foreignKeyName: "products_category_id_fkey"; columns: ["category_id"]; isOneToOne: false; referencedRelation: "categories"; referencedColumns: ["id"] }]>;
      product_variants: Table<Variant, "product_id" | "sku" | "size", [{ foreignKeyName: "product_variants_product_id_fkey"; columns: ["product_id"]; isOneToOne: false; referencedRelation: "products"; referencedColumns: ["id"] }]>;
      product_images: Table<ProductImage, "product_id" | "storage_path" | "alt_text", [{ foreignKeyName: "product_images_product_id_fkey"; columns: ["product_id"]; isOneToOne: false; referencedRelation: "products"; referencedColumns: ["id"] }]>;
      product_festivals: Table<{ product_id: string; festival_id: string; created_at: string }, "product_id" | "festival_id", [
        { foreignKeyName: "product_festivals_product_id_fkey"; columns: ["product_id"]; isOneToOne: false; referencedRelation: "products"; referencedColumns: ["id"] },
        { foreignKeyName: "product_festivals_festival_id_fkey"; columns: ["festival_id"]; isOneToOne: false; referencedRelation: "festivals"; referencedColumns: ["id"] }
      ]>;
      profiles: Table<Timestamps & { id: string; display_name: string | null }, "id">;
      addresses: Table<Timestamps & { id: string; user_id: string; recipient: string; line1: string; line2: string; city: string; state: string; postal_code: string; country_code: string }, "user_id" | "recipient" | "line1" | "city" | "state" | "postal_code">;
      wishlist: Table<{ user_id: string; product_id: string; created_at: string }, "user_id" | "product_id">;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
