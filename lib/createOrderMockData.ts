import type { ProductCatalogItem, SavedAddress, ShippingMethod } from "./types";

// ─── Customer Database (moved from SearchView.tsx for server-component access) ─
export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  store: string;
  orderCount: number;
  orderIds: string[];
  shopperId: string;
}

export const CUSTOMER_DATABASE: Customer[] = [
  {
    id: "CUST-001-melekzribi",
    name: "Melek Zribi",
    email: "mzribi@vista.com",
    phone: "+1-555-0101",
    store: "NA",
    orderCount: 3,
    orderIds: ["VP_LPHSW5Q", "VP_KJH23NM", "VP_QAZ11WS"],
    shopperId: "134266324230942309804284080248",
  },
  {
    id: "CUST-002-jonathanblake",
    name: "Jonathan Blake",
    email: "j.blake@vistaprint.com",
    phone: "+1-555-0102",
    store: "NA",
    orderCount: 2,
    orderIds: ["VP_QRX89PT", "VP_MNL45KJ"],
    shopperId: "234566324230942309804284080249",
  },
  {
    id: "CUST-003-sarahchen",
    name: "Sarah Chen",
    email: "s.chen@cimpress.com",
    phone: "+44-555-0201",
    store: "IE",
    orderCount: 2,
    orderIds: ["VP_WXY12AB", "VP_ZPQ67RS"],
    shopperId: "334566324230942309804284080250",
  },
  {
    id: "CUST-004-arjunsharma",
    name: "Arjun Sharma",
    email: "arjun.sharma@gmail.com",
    phone: "+91-9876543210",
    store: "IN",
    orderCount: 2,
    orderIds: ["VP_BCD34EF", "VP_GHI78JK"],
    shopperId: "434566324230942309804284080251",
  },
  {
    id: "CUST-005-fatimahassan",
    name: "Fatima Al-Hassan",
    email: "f.hassan@outlook.com",
    phone: "+971-555-0301",
    store: "DE",
    orderCount: 1,
    orderIds: ["VP_LMN90OP"],
    shopperId: "534566324230942309804284080252",
  },
  {
    id: "CUST-006-davidpark",
    name: "David Park",
    email: "dpark@yahoo.com",
    phone: "+82-555-0401",
    store: "AU",
    orderCount: 3,
    orderIds: ["VP_QRS12TU", "VP_VWX34YZ", "VP_ABC56DE"],
    shopperId: "634566324230942309804284080253",
  },
  {
    id: "CUST-007-emmawilson",
    name: "Emma Wilson",
    email: "emma.w@example.com",
    phone: "+1-555-0501",
    store: "NA",
    orderCount: 1,
    orderIds: ["VP_FGH78IJ"],
    shopperId: "734566324230942309804284080254",
  },
  {
    id: "CUST-008-carlosmendoza",
    name: "Carlos Mendoza",
    email: "cmendoza@empresa.mx",
    phone: "+52-555-0601",
    store: "IE",
    orderCount: 2,
    orderIds: ["VP_KLM90NO", "VP_PQR12ST"],
    shopperId: "834566324230942309804284080255",
  },
  {
    id: "CUST-009-priyapatel",
    name: "Priya Patel",
    email: "priya.patel@techco.in",
    phone: "+91-8765432109",
    store: "IN",
    orderCount: 1,
    orderIds: ["VP_UVW34XY"],
    shopperId: "934566324230942309804284080256",
  },
  {
    id: "CUST-010-larsnielsen",
    name: "Lars Nielsen",
    email: "l.nielsen@nordic.dk",
    phone: "+45-555-0701",
    store: "DE",
    orderCount: 2,
    orderIds: ["VP_ZAB56CD", "VP_EFG78HI"],
    shopperId: "104566324230942309804284080257",
  },
];

// ─── Product Catalog ──────────────────────────────────────────────────────────

export const MOCK_PRODUCT_CATALOG: ProductCatalogItem[] = [
  {
    id: "CIM-9HC1KU",
    name: "Standard Business Cards",
    category: "Business Cards",
    imageUrl: "https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=64&h=64&fit=crop",
    baseUnitPrice: 0.12,
    pricingTiers: [
      { minQty: 25, maxQty: 99, unitPrice: 0.18 },
      { minQty: 100, maxQty: 499, unitPrice: 0.12, recommended: true },
      { minQty: 500, maxQty: null, unitPrice: 0.09 },
    ],
    attributes: [
      {
        id: "size",
        label: "Size",
        type: "select",
        options: [
          { id: "std", label: '3.5" × 2" (Standard)' },
          { id: "sq", label: '2.5" × 2.5" (Square)' },
          { id: "eu", label: '85mm × 55mm (Euro)' },
        ],
      },
      {
        id: "finish",
        label: "Finish",
        type: "select",
        options: [
          { id: "matte", label: "Matte" },
          { id: "gloss", label: "Gloss" },
          { id: "soft-touch", label: "Soft Touch" },
        ],
      },
      {
        id: "paper",
        label: "Paper Stock",
        type: "select",
        options: [
          { id: "14pt", label: "14pt Cardstock" },
          { id: "16pt", label: "16pt Cardstock" },
          { id: "32pt", label: "32pt Ultra Thick" },
        ],
      },
    ],
    minOrderQty: 25,
    maxOrderQty: 10000,
  },
  {
    id: "CIM-7FP2RT",
    name: "Premium Flyers",
    category: "Flyers",
    imageUrl: "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=64&h=64&fit=crop",
    baseUnitPrice: 0.08,
    pricingTiers: [
      { minQty: 50, maxQty: 249, unitPrice: 0.10 },
      { minQty: 250, maxQty: 999, unitPrice: 0.08, recommended: true },
      { minQty: 1000, maxQty: null, unitPrice: 0.06 },
    ],
    attributes: [
      {
        id: "size",
        label: "Size",
        type: "select",
        options: [
          { id: "a5", label: "A5 (148mm × 210mm)" },
          { id: "a4", label: "A4 (210mm × 297mm)" },
          { id: "letter", label: 'Letter (8.5" × 11")' },
        ],
      },
      {
        id: "sides",
        label: "Printing",
        type: "select",
        options: [
          { id: "single", label: "Single-sided" },
          { id: "double", label: "Double-sided" },
        ],
      },
      {
        id: "paper",
        label: "Paper",
        type: "select",
        options: [
          { id: "100gsm", label: "100gsm" },
          { id: "130gsm", label: "130gsm Gloss" },
          { id: "170gsm", label: "170gsm Silk" },
        ],
      },
    ],
    minOrderQty: 50,
    maxOrderQty: 50000,
  },
  {
    id: "CIM-3BN8LM",
    name: "Vinyl Banner",
    category: "Banners",
    imageUrl: "https://images.unsplash.com/photo-1569017388730-020b5f80a004?w=64&h=64&fit=crop",
    baseUnitPrice: 12.50,
    pricingTiers: [
      { minQty: 1, maxQty: 4, unitPrice: 15.00 },
      { minQty: 5, maxQty: 19, unitPrice: 12.50, recommended: true },
      { minQty: 20, maxQty: null, unitPrice: 10.00 },
    ],
    attributes: [
      {
        id: "size",
        label: "Size",
        type: "select",
        options: [
          { id: "2x4", label: '2\' × 4\'' },
          { id: "3x6", label: '3\' × 6\'' },
          { id: "4x8", label: '4\' × 8\'' },
        ],
      },
      {
        id: "material",
        label: "Material",
        type: "select",
        options: [
          { id: "13oz", label: "13oz Vinyl" },
          { id: "18oz", label: "18oz Heavy-duty Vinyl" },
        ],
      },
      {
        id: "grommets",
        label: "Grommets",
        type: "select",
        options: [
          { id: "corner", label: "Corner only" },
          { id: "every2", label: 'Every 2"' },
          { id: "none", label: "None" },
        ],
      },
    ],
    minOrderQty: 1,
    maxOrderQty: 100,
  },
  {
    id: "CIM-5PC4WX",
    name: "Postcard Mailers",
    category: "Postcards",
    imageUrl: "https://images.unsplash.com/photo-1612838320302-4b3b3996765b?w=64&h=64&fit=crop",
    baseUnitPrice: 0.07,
    pricingTiers: [
      { minQty: 100, maxQty: 499, unitPrice: 0.09 },
      { minQty: 500, maxQty: 1999, unitPrice: 0.07, recommended: true },
      { minQty: 2000, maxQty: null, unitPrice: 0.05 },
    ],
    attributes: [
      {
        id: "size",
        label: "Size",
        type: "select",
        options: [
          { id: "4x6", label: '4" × 6"' },
          { id: "5x7", label: '5" × 7"' },
          { id: "6x9", label: '6" × 9"' },
        ],
      },
      {
        id: "coating",
        label: "Coating",
        type: "select",
        options: [
          { id: "none", label: "Uncoated" },
          { id: "aqueous", label: "Aqueous Gloss" },
          { id: "uv", label: "UV Coating" },
        ],
      },
      {
        id: "corners",
        label: "Corners",
        type: "select",
        options: [
          { id: "square", label: "Square" },
          { id: "rounded", label: "Rounded" },
        ],
      },
      {
        id: "orientation",
        label: "Product Orientation",
        type: "radio",
        options: [
          { id: "vertical", label: "Vertical" },
          { id: "horizontal", label: "Horizontal" },
        ],
      },
    ],
    minOrderQty: 100,
    maxOrderQty: 100000,
  },
  {
    id: "CIM-2LB6NQ",
    name: "Roll Labels",
    category: "Labels & Stickers",
    imageUrl: "https://images.unsplash.com/photo-1574181612567-7e21f4cf2d6c?w=64&h=64&fit=crop",
    baseUnitPrice: 0.04,
    pricingTiers: [
      { minQty: 250, maxQty: 999, unitPrice: 0.05 },
      { minQty: 1000, maxQty: 4999, unitPrice: 0.04, recommended: true },
      { minQty: 5000, maxQty: null, unitPrice: 0.03 },
    ],
    attributes: [
      {
        id: "shape",
        label: "Shape",
        type: "select",
        options: [
          { id: "circle", label: "Circle" },
          { id: "rectangle", label: "Rectangle" },
          { id: "oval", label: "Oval" },
        ],
      },
      {
        id: "material",
        label: "Material",
        type: "select",
        options: [
          { id: "paper", label: "White Paper" },
          { id: "clear", label: "Clear Polypropylene" },
          { id: "silver", label: "Silver Metallic" },
        ],
      },
      {
        id: "finish",
        label: "Finish",
        type: "select",
        options: [
          { id: "matte", label: "Matte" },
          { id: "gloss", label: "Gloss" },
        ],
      },
    ],
    minOrderQty: 250,
    maxOrderQty: 100000,
  },
  {
    id: "CIM-8TH3KP",
    name: "Custom T-Shirt",
    category: "Apparel",
    imageUrl: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=64&h=64&fit=crop",
    baseUnitPrice: 8.50,
    pricingTiers: [
      { minQty: 1, maxQty: 11, unitPrice: 10.00 },
      { minQty: 12, maxQty: 47, unitPrice: 8.50, recommended: true },
      { minQty: 48, maxQty: null, unitPrice: 7.00 },
    ],
    attributes: [
      {
        id: "size",
        label: "Size",
        type: "select",
        options: [
          { id: "s", label: "Small" },
          { id: "m", label: "Medium" },
          { id: "l", label: "Large" },
          { id: "xl", label: "X-Large" },
          { id: "xxl", label: "2X-Large" },
        ],
      },
      {
        id: "color",
        label: "Color",
        type: "select",
        options: [
          { id: "white", label: "White" },
          { id: "black", label: "Black" },
          { id: "navy", label: "Navy Blue" },
          { id: "red", label: "Red" },
        ],
      },
      {
        id: "print",
        label: "Print Location",
        type: "select",
        options: [
          { id: "front", label: "Front Only" },
          { id: "back", label: "Back Only" },
          { id: "both", label: "Front & Back" },
        ],
      },
    ],
    minOrderQty: 1,
    maxOrderQty: 500,
  },
  {
    id: "CIM-4MG7YR",
    name: "Retractable Banner Stand",
    category: "Displays",
    imageUrl: "https://images.unsplash.com/photo-1587614382346-4ec70e388b28?w=64&h=64&fit=crop",
    baseUnitPrice: 45.00,
    pricingTiers: [
      { minQty: 1, maxQty: 2, unitPrice: 55.00 },
      { minQty: 3, maxQty: 9, unitPrice: 45.00, recommended: true },
      { minQty: 10, maxQty: null, unitPrice: 38.00 },
    ],
    attributes: [
      {
        id: "width",
        label: "Width",
        type: "select",
        options: [
          { id: "24in", label: '24" Wide' },
          { id: "33in", label: '33" Wide' },
          { id: "47in", label: '47" Wide' },
        ],
      },
      {
        id: "height",
        label: "Height",
        type: "select",
        options: [
          { id: "72in", label: '72" Tall' },
          { id: "80in", label: '80" Tall' },
        ],
      },
      {
        id: "base",
        label: "Base Type",
        type: "select",
        options: [
          { id: "standard", label: "Standard" },
          { id: "deluxe", label: "Deluxe (with carry bag)" },
        ],
      },
    ],
    minOrderQty: 1,
    maxOrderQty: 50,
  },
  {
    id: "CIM-6RW1HS",
    name: "Folded Greeting Cards",
    category: "Cards & Invitations",
    imageUrl: "https://images.unsplash.com/photo-1607344645866-009c320b63e0?w=64&h=64&fit=crop",
    baseUnitPrice: 0.65,
    pricingTiers: [
      { minQty: 10, maxQty: 49, unitPrice: 0.80 },
      { minQty: 50, maxQty: 199, unitPrice: 0.65, recommended: true },
      { minQty: 200, maxQty: null, unitPrice: 0.50 },
    ],
    attributes: [
      {
        id: "size",
        label: "Size (Folded)",
        type: "select",
        options: [
          { id: "4x5", label: '4" × 5.5"' },
          { id: "5x7", label: '5" × 7"' },
          { id: "5.5x8.5", label: '5.5" × 8.5"' },
        ],
      },
      {
        id: "fold",
        label: "Fold",
        type: "select",
        options: [
          { id: "half", label: "Half Fold" },
          { id: "z", label: "Z-Fold" },
        ],
      },
      {
        id: "paper",
        label: "Paper",
        type: "select",
        options: [
          { id: "80lb-gloss", label: "80lb Gloss" },
          { id: "100lb-silk", label: "100lb Silk" },
          { id: "80lb-matte", label: "80lb Matte" },
        ],
      },
    ],
    minOrderQty: 10,
    maxOrderQty: 5000,
  },
  {
    id: "CIM-7FLY2XP",
    name: "Premium Flyers",
    category: "Flyers & Leaflets",
    imageUrl: "https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=64&h=64&fit=crop",
    baseUnitPrice: 0.10,
    pricingTiers: [
      { minQty: 50, maxQty: 99, unitPrice: 0.14 },
      { minQty: 100, maxQty: 249, unitPrice: 0.10, recommended: true },
      { minQty: 250, maxQty: 499, unitPrice: 0.08 },
      { minQty: 500, maxQty: null, unitPrice: 0.06 },
    ],
    attributes: [
      {
        id: "size",
        label: "Size",
        type: "select",
        options: [
          { id: "a5", label: 'A5 (5.8" × 8.3")' },
          { id: "a4", label: 'A4 (8.3" × 11.7")' },
          { id: "letter", label: 'Letter (8.5" × 11")' },
          { id: "11x17", label: '11" × 17"' },
        ],
      },
      {
        id: "orientation",
        label: "Product Orientation",
        type: "radio",
        options: [
          { id: "vertical", label: "Vertical" },
          { id: "horizontal", label: "Horizontal" },
        ],
      },
      {
        id: "paper_thickness",
        label: "Paper Thickness",
        type: "select",
        options: [
          { id: "standard", label: "Standard" },
          { id: "premium", label: "Premium" },
          { id: "heavy", label: "Heavy" },
        ],
      },
      {
        id: "paper_stock",
        label: "Paper Stock",
        type: "select",
        options: [
          { id: "matte", label: "Matte" },
          { id: "gloss", label: "Gloss" },
          { id: "silk", label: "Silk" },
          { id: "uncoated", label: "Uncoated" },
        ],
      },
    ],
    minOrderQty: 50,
    maxOrderQty: 5000,
    stockQuantity: 250,
    taxRate: 8,
  },
  {
    id: "PRD-5678ZPL",
    name: "Standard Ball Pens",
    category: "Writing instruments",
    imageUrl: "https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=64&h=64&fit=crop",
    baseUnitPrice: 1.53,
    pricingTiers: [
      { minQty: 50, maxQty: 99, unitPrice: 1.59 },
      { minQty: 100, maxQty: 149, unitPrice: 1.53 },
      { minQty: 150, maxQty: 249, unitPrice: 1.46, recommended: true },
      { minQty: 250, maxQty: 299, unitPrice: 1.38 },
      { minQty: 300, maxQty: 350, unitPrice: 1.33 },
    ],
    attributes: [
      {
        id: "barrel_color",
        label: "Select barrel color",
        type: "color",
        options: [
          { id: "black", label: "Black", hexColor: "#15191d" },
          { id: "blue", label: "Blue", hexColor: "#0f68dd" },
          { id: "green", label: "Green", hexColor: "#007e3f" },
          { id: "brown", label: "Brown", hexColor: "#a15e0c" },
          { id: "red", label: "Red", hexColor: "#d10023" },
          { id: "burgundy", label: "Burgundy", hexColor: "#9b1c1c" },
        ],
      },
      {
        id: "ink_color",
        label: "Select ink color",
        type: "color",
        options: [
          { id: "black", label: "Black", hexColor: "#15191d" },
          { id: "blue", label: "Blue", hexColor: "#0f68dd" },
        ],
      },
    ],
    minOrderQty: 50,
    maxOrderQty: 350,
    stockQuantity: 250,
    extraCharges: [
      { id: "logo_change", label: "Logo Change", unitPrice: 10 },
      { id: "setup_change", label: "Setup Change", unitPrice: 10 },
    ],
    taxRate: 5.33,
  },
];

// ─── Saved Addresses ──────────────────────────────────────────────────────────

export const MOCK_SAVED_ADDRESSES: SavedAddress[] = [
  {
    id: "addr-001",
    label: "Default",
    name: "Mayank Sen",
    company: "Cimpress India Pvt. Ltd.",
    lines: ["70 Washington Square,", "South, New York, NY", "10012, United States"],
    phone: "1-587-530-2271",
    isDefault: true,
  },
  {
    id: "addr-002",
    label: "Office",
    name: "Tanishq Bhatia",
    lines: ["99 Park Avenue, Suite 1800", "New York, NY 10016", "United States"],
    phone: "+9 12123012034",
    isDefault: false,
  },
];

// ─── Shipping Methods ─────────────────────────────────────────────────────────

export const MOCK_SHIPPING_METHODS: ShippingMethod[] = [
  {
    id: "rush",
    name: "Rush",
    carrier: "FedEx",
    estimatedDays: 1,
    estimatedDeliveryLabel: "Wed, 26 Nov 2025",
    price: 40.00,
  },
  {
    id: "express",
    name: "Express",
    carrier: "FedEx",
    estimatedDays: 3,
    estimatedDeliveryLabel: "Mon, 1 Dec 2025",
    price: 20.00,
  },
  {
    id: "standard",
    name: "Standard",
    carrier: "UPS",
    estimatedDays: 5,
    estimatedDeliveryLabel: "Wed, 3 Dec 2025",
    price: 10.00,
  },
  {
    id: "economy",
    name: "Economy",
    carrier: "FedEx",
    estimatedDays: 12,
    estimatedDeliveryLabel: "Fri, 12 Dec 2025",
    price: 0,
    originalPrice: 24.99,
  },
];

// ─── Discount Codes ───────────────────────────────────────────────────────────

export const MOCK_DISCOUNT_CODES: Record<string, number> = {
  SAVE10: 10,
  PROMO20: 20,
  VIP15: 15,
  NEWCUST25: 25,
};
