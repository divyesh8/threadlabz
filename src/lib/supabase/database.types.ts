import type { Database as GeneratedDatabase } from "@/types/database";

export type Database = GeneratedDatabase;

export type TableRow<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];
export type TableInsert<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Insert"];
export type TableUpdate<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Update"];

export type Product = TableRow<"products">;
export type ProductInsert = TableInsert<"products">;
export type ProductUpdate = TableUpdate<"products">;

export type Category = TableRow<"categories">;
export type CategoryInsert = TableInsert<"categories">;
export type CategoryUpdate = TableUpdate<"categories">;

export type Festival = TableRow<"festivals">;
export type FestivalInsert = TableInsert<"festivals">;
export type FestivalUpdate = TableUpdate<"festivals">;

export type ProductVariant = TableRow<"product_variants">;
export type Variant = ProductVariant; // Backwards-compatible alias
export type ProductVariantInsert = TableInsert<"product_variants">;
export type ProductVariantUpdate = TableUpdate<"product_variants">;

export type ProductImage = TableRow<"product_images">;
export type ProductImageInsert = TableInsert<"product_images">;
export type ProductImageUpdate = TableUpdate<"product_images">;

export type Banner = TableRow<"banners">;
export type BannerInsert = TableInsert<"banners">;
export type BannerUpdate = TableUpdate<"banners">;

export type Profile = TableRow<"profiles">;
export type ProfileInsert = TableInsert<"profiles">;
export type ProfileUpdate = TableUpdate<"profiles">;

export type Order = TableRow<"orders">;
export type OrderItem = TableRow<"order_items">;
export type Address = TableRow<"addresses">;
export type NewsletterSubscriber = TableRow<"newsletter_subscribers">;
export type WishlistItem = TableRow<"wishlist">;
export type Review = TableRow<"reviews">;
