// NuOrder entity interfaces

export interface NuOrderAddress {
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
}

export interface NuOrderBuyer {
  email: string;
  firstname?: string;
  lastname?: string;
  title?: string;
  phone?: string;
}

export interface NuOrderCompany {
  _id: string;
  name: string;
  code?: string;
  status?: string;
  type?: string;
  billing_address?: NuOrderAddress;
  shipping_address?: NuOrderAddress;
  buyers?: NuOrderBuyer[];
  rep_email?: string;
  created_at?: string;
  updated_at?: string;
}

export interface NuOrderRetailer {
  _id?: string;
  retailer_name?: string;
  retailer_code?: string;
  buyer_name?: string;
  buyer_email?: string;
  payment_terms?: string;
  shipping_terms?: string;
}

export interface NuOrderOrderItem {
  id?: string;
  product?: { _id?: string; style_number?: string; color?: string; [key: string]: unknown };
  ship_start?: string;
  ship_end?: string;
  sizes?: Array<{ size?: string; quantity?: number; price?: number; retail?: number }>;
  warehouse?: string;
  [key: string]: unknown;
}

export interface NuOrderOrder {
  _id: string;
  order_number?: string;
  status: string;
  retailer?: NuOrderRetailer;
  currency_code?: string;
  total?: number;
  total_quantity?: number;
  discount?: number;
  start_ship?: string;
  end_ship?: string;
  created_on?: string;
  modified_on?: string;
  notes?: string;
  payment_status?: string;
  order_tags?: string[];
  rep_name?: string;
  rep_email?: string;
  creator_name?: string;
  customer_po_number?: string;
  line_items?: NuOrderOrderItem[];
  billing_address?: unknown;
  shipping_address?: unknown;
  locked?: boolean;
  [key: string]: unknown;
}

export interface NuOrderProductVariant {
  sku?: string;
  external_id?: string;
  size?: string;
  color?: string;
  upc?: string;
  unit_price?: number;
  wholesale_price?: number;
  retail_price?: number;
}

export interface NuOrderProduct {
  _id: string;
  name: string;
  external_id?: string;
  style_number?: string;
  description?: string;
  category?: string;
  gender?: string;
  season?: string;
  year?: number;
  currency?: string;
  wholesale_price?: number;
  retail_price?: number;
  variants?: NuOrderProductVariant[];
  images?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface NuOrderInventoryItem {
  sku?: string;
  external_id?: string;
  size?: string;
  quantity: number;
  warehouse?: string;
}

export interface NuOrderInventory {
  _id: string;
  product_id?: string;
  external_id?: string;
  items?: NuOrderInventoryItem[];
  updated_at?: string;
}

export interface NuOrderCatalogEntry {
  product_id: string;
  external_id?: string;
  sort_order?: number;
}

export interface NuOrderCatalog {
  _id: string;
  name: string;
  description?: string;
  season?: string;
  year?: number;
  status?: string;
  entry_count?: number;
  created_at?: string;
  updated_at?: string;
}

// Pagination cursor response wrapper
export interface NuOrderPaginatedResponse<T> {
  data: T[];
  __last_id?: string;
  total?: number;
}

// OAuth credentials
export interface NuOrderCredentials {
  consumerKey: string;
  consumerSecret: string;
  accessToken: string;
  accessTokenSecret: string;
}

// Client request options
export interface NuOrderRequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  body?: unknown;
  params?: Record<string, string | number | boolean>;
}
