// ─── Event & Order Types (CimCommerce CCv2 model) ───────────────────────────

export type EventCategory = "key_event" | "warning" | "update";

export type ItemStatus =
  | "initial"
  | "sent_to_mcp"
  | "in_production"
  | "production_complete"
  | "shipped"
  | "delivered"
  | "cancel_requested"
  | "cancel_succeeded"
  | "cancel_failed"
  | "on_hold"
  | "delayed"
  | "rejected";

export type StepState = "complete" | "error" | "pending";
export type BadgeTone = "base" | "success" | "info" | "warning" | "critical";

// Icon in the timeline: teal check = success, red X = error
export type EventIconStatus = "success" | "error";

export interface EventDetails {
  subType?: string;
  description: string;
  source: string;
  metadata?: Record<string, string>;
}

export interface OrderEvent {
  id: string;
  eventType: string; // e.g. "line_item.cancel_request_succeeded"
  name: string; // Human-readable label
  timestamp: string; // Formatted for display
  isoTimestamp: string; // ISO 8601 for sorting
  iconStatus: EventIconStatus;
  category: EventCategory;
  details?: EventDetails;
}

export type ShipmentType = "none" | "warning" | "info" | "success";

export interface ShipmentInfo {
  type: ShipmentType;
  title: string;
  subtitle: string;
  showViewDetails?: boolean;
}

export interface LineItem {
  id: string;
  lineItemId: string;
  name: string;
  status: ItemStatus;
  badgeLabel: string;
  badgeTone: BadgeTone;
  imageUrl?: string;
  progressSteps: StepState[];
  summaryText: string;
  summaryTimestamp: string;
  events: OrderEvent[]; // chronological descending (most recent first)
  quantity: number;
  fulfiller: string;
  dateLabel: string;
  dateValue: string;
  tax: string;
  itemTotal: string;
  originalTotal?: string;
  shipment: ShipmentInfo;
  recare?: string;
}

export interface OrderSummary {
  orderId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  estimatedDelivery: string;
  lineItems: LineItem[];
}

// ─── Create Order Types ───────────────────────────────────────────────────────

export interface ProductAttributeOption {
  id: string;
  label: string;
  hexColor?: string; // for color-type attributes
}

export interface ProductAttribute {
  id: string;
  label: string;
  type: "select" | "color" | "radio";
  options: ProductAttributeOption[];
}

export interface ProductExtraCharge {
  id: string;
  label: string;
  unitPrice: number;
}

export interface QuantityPricingTier {
  minQty: number;
  maxQty: number | null; // null = no upper bound
  unitPrice: number; // USD per unit
  recommended?: boolean;
}

export interface ProductCatalogItem {
  id: string; // CIM ID e.g. "CIM-9HC1KU"
  name: string;
  category: string;
  imageUrl: string;
  baseUnitPrice: number;
  pricingTiers: QuantityPricingTier[];
  attributes: ProductAttribute[];
  minOrderQty: number;
  maxOrderQty: number;
  stockQuantity?: number;
  extraCharges?: ProductExtraCharge[];
  taxRate?: number; // percentage e.g. 5.33
}

export interface DraftOrderItemAttribute {
  attributeId: string;
  selectedOptionId: string;
}

export interface DraftOrderItemAccessory {
  id: string;
  label: string;
  quantity: number;
  unitPrice: number;
}

export interface DraftOrderItem {
  draftItemId: string; // client-side UUID
  product: ProductCatalogItem;
  selectedAttributes: DraftOrderItemAttribute[];
  quantity: number;
  artworkType: "upload" | "url" | "none";
  artworkUrl: string;
  artworkFileName: string;
  itemDiscount: number; // percentage 0–100
  unitPrice: number; // resolved from pricing tier
  lineTotal: number; // (unitPrice * qty) * (1 - itemDiscount/100)
  accessories?: DraftOrderItemAccessory[];
}

export interface DraftOrder {
  customerId: string;
  customerName: string;
  customerEmail: string;
  shopperId: string;
  items: DraftOrderItem[];
  subtotal: number;
  shippingEstimate: number;
  taxEstimate: number;
  orderDiscount: number; // percentage 0–100
  discountCode: string;
  overridePrice: number | null; // null = not overriding
  total: number;
}

export type CheckoutStep =
  | "shipping-billing"
  | "shipping-method"
  | "discount"
  | "review"
  | "confirm";

export interface SavedAddress {
  id: string;
  label: string;
  name: string;
  company?: string;
  lines: string[];
  phone: string;
  isDefault: boolean;
}

export interface ShippingMethod {
  id: string;
  name: string;
  carrier: string;
  estimatedDays: number;
  estimatedDeliveryLabel: string;
  price: number; // USD, 0 = free
  originalPrice?: number; // shown as strikethrough when price is 0
}

export interface CheckoutState {
  shippingAddressId: string | null;
  billingAddressId: string | null;
  billingSameAsShipping: boolean;
  shippingMethodId: string | null;
  discountCode: string;
  discountCodeApplied: boolean;
  discountPercent: number; // resolved discount %
  overridePrice: string; // string to allow empty input
  confirmedOrderId: string | null;
}
