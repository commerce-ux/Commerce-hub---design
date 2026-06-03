"use client";

import { useState, useEffect, forwardRef, useImperativeHandle, useRef, useCallback } from "react";
import { Button, Select, SelectItem, TextField, TextArea, Checkbox, Disclosure, Badge, Tooltip, RadioGroup, Radio, Callout, ModalDialog, ModalDialogBody, ModalDialogActions, ToggleButton, ToggleButtonGroup } from "@cimpress-ui/react";
import { IconChevronDownBold } from "@cimpress-ui/react/icons";
import { IconInfoCircle, IconCheckCircleFill, IconChevronDown, IconCloseBold, IconWarning, IconTrash, IconPencil, IconZoomIn, IconZoomOut, IconExternalLink, IconDownload } from "@cimpress-ui/react/icons";
import type { ProductCatalogItem, DraftOrderItem, DraftOrderItemAttribute, QuantityPricingTier } from "@/lib/types";
import { resolvePricingTier as resolveTier, computeIncrementRanges, generateGuideQuantities } from "@/lib/pricingUtils";
import { PreviousArtworkModal } from "./PreviousArtworkModal";
import { AccessoryCard, MOCK_ACCESSORIES } from "./AddAccessoryModal";

export interface OfferCustomizationBreakdown {
  type: "pct" | "unit" | "flat";
  typeName: string;       // "% Based pricing" | "Unit price discount" | "Flat price discount"
  inputLabel: string;     // "Discount percentage" | "New unit price" | "New flat item price"
  inputValue: string;     // "10%" | "1.30 USD" | "130.00 USD"
  newItemPrice: number | null;
  discountAmount: number | null;
  reason: string;         // reason key e.g. "loyalty_discount"
  reasonLabel: string;    // "Loyalty discount"
}

export interface PriceBreakdown {
  quantity: number;
  unitPrice: number;
  basePrice: number;
  discount: number;
  chargesApplied: number;
  extraChargesTotal: number;
  selectedChargeLabel?: string;
  selectedChargePrice?: number;
  hasArtworkCharge: boolean;
  artworkOption: "new" | "customise";
  accessoriesTotal: number;
  accessories: { id: string; label: string; quantity: number; unitPrice: number }[];
  charges: { label: string; price: number }[];
  subtotal: number;
  taxRate: number;
  tax: number;
  totalDue: number;
  offerCustomization?: OfferCustomizationBreakdown;
}

interface ItemConfigurationCardProps {
  product: ProductCatalogItem;
  initialValues?: DraftOrderItem;
  onAddToOrder: (item: DraftOrderItem) => void;
  onLineTotalChange?: (total: number) => void;
  onValidityChange?: (isValid: boolean) => void;
  onPriceBreakdownChange?: (breakdown: PriceBreakdown) => void;
  autoOpenPriceOverride?: boolean;
}

export interface ItemConfigurationCardHandle {
  submit: () => void;
}

interface UpsellSuggestion {
  suggestedQty: number;
  additionalUnits: number;
  additionalCost: number;
}

const resolvePricingTier = resolveTier;

function generateDraftId(): string {
  return Math.random().toString(36).substring(2, 11);
}

function generateQuantityOptions(min: number, max: number, tiers: QuantityPricingTier[]): number[] {
  const opts = new Set<number>([min, max]);
  tiers.forEach((t) => {
    opts.add(t.minQty);
    if (t.maxQty) opts.add(t.maxQty);
  });
  if (max - min <= 500) {
    const step = Math.ceil((max - min) / 6);
    for (let q = min; q <= max; q += step) opts.add(q);
  }
  return [...opts].filter((q) => q >= min && q <= max).sort((a, b) => a - b);
}


function getContextualTiers(
  tiers: QuantityPricingTier[],
  qty: number
): { slice: QuantityPricingTier[]; activeLocalIndex: number } {
  const sorted = [...tiers].sort((a, b) => a.minQty - b.minQty);
  let activeIndex = 0;
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (qty >= sorted[i].minQty) { activeIndex = i; break; }
  }
  const start = Math.max(0, activeIndex - 2);
  const end = Math.min(sorted.length - 1, activeIndex + 2);
  return { slice: sorted.slice(start, end + 1), activeLocalIndex: activeIndex - start };
}

function computeUpsell(product: ProductCatalogItem, qty: number, unlimited = false): UpsellSuggestion | null {
  const currentPrice = resolvePricingTier(product.pricingTiers, qty);
  const sortedTiers = [...product.pricingTiers].sort((a, b) => a.minQty - b.minQty);
  const nextTier = sortedTiers.find((t) => t.minQty > qty && t.unitPrice < currentPrice);
  if (!nextTier) return null;
  const additionalUnits = nextTier.minQty - qty;
  if (!unlimited && additionalUnits > 55) return null;
  const additionalCost = parseFloat((nextTier.minQty * nextTier.unitPrice - qty * currentPrice).toFixed(2));
  return { suggestedQty: nextTier.minQty, additionalUnits, additionalCost };
}

// ── Contextual pricing grid ────────────────────────────────────────────────────
function ContextualPricingGrid({
  tiers,
  quantity,
  onSelect,
}: {
  tiers: QuantityPricingTier[];
  quantity: number;
  onSelect: (qty: number) => void;
}) {
  const { slice, activeLocalIndex } = getContextualTiers(tiers, quantity);
  const sortedAll = [...tiers].sort((a, b) => a.minQty - b.minQty);

  const labelStyle: React.CSSProperties = {
    fontSize: "0.8125rem", fontWeight: 600,
    color: "var(--cim-fg-base, #15191d)", padding: "10px 12px",
    background: "var(--cim-bg-subtle, #f8f9fa)",
    borderRight: "1px solid var(--cim-border-base, #dadcdd)", whiteSpace: "nowrap",
  };
  const cell = (active: boolean): React.CSSProperties => ({
    fontSize: "0.8125rem", color: "var(--cim-fg-base, #15191d)",
    padding: "10px 12px", textAlign: "center",
    background: active ? "var(--cim-bg-info-subtle, #e8f4f8)" : "white",
    borderRight: "1px solid var(--cim-border-base, #dadcdd)", cursor: "pointer",
  });
  const rowBorder = "1px solid var(--cim-border-base, #dadcdd)";

  return (
    <div style={{ borderTop: "1px solid var(--cim-border-subtle, #eaebeb)", overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <tbody>
          <tr style={{ borderBottom: rowBorder }}>
            <td style={labelStyle}>Quantity</td>
            {slice.map((tier, i) => (
              <td key={i} style={cell(i === activeLocalIndex)} onClick={() => onSelect(tier.minQty)}>
                <strong>{tier.minQty}</strong>
              </td>
            ))}
          </tr>
          <tr style={{ borderBottom: rowBorder }}>
            <td style={labelStyle}>Unit Price</td>
            {slice.map((tier, i) => (
              <td key={i} style={cell(i === activeLocalIndex)} onClick={() => onSelect(tier.minQty)}>
                {tier.unitPrice.toFixed(2)} USD
              </td>
            ))}
          </tr>
          <tr style={{ borderBottom: rowBorder }}>
            <td style={labelStyle}>Subtotal</td>
            {slice.map((tier, i) => (
              <td key={i} style={{ ...cell(i === activeLocalIndex), fontWeight: 600 }} onClick={() => onSelect(tier.minQty)}>
                {(tier.minQty * tier.unitPrice).toFixed(2)} USD
              </td>
            ))}
          </tr>
          <tr>
            <td style={labelStyle}>Upsell Offer</td>
            {slice.map((tier, i) => {
              const globalIdx = sortedAll.findIndex((t) => t.minQty === tier.minQty);
              const next = sortedAll[globalIdx + 1];
              return (
                <td key={i} style={{ ...cell(i === activeLocalIndex), color: "var(--cim-fg-subtle, #5f6469)" }} onClick={() => onSelect(tier.minQty)}>
                  {next ? <>{next.minQty - tier.minQty}{" "}<span style={{ fontSize: "0.75rem" }}>@ {next.unitPrice.toFixed(2)}/each</span></> : "—"}
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

const OFFER_REASON_LABELS: Record<string, string> = {
  loyalty_discount: "Loyalty discount",
  bulk_deal: "Bulk deal",
  promotional: "Promotional offer",
  error_correction: "Error correction",
  manager_approval: "Manager approval",
  other: "Other",
};

const OFFER_TYPE_META: Record<"pct" | "unit" | "flat", { typeName: string; inputLabel: string }> = {
  pct:  { typeName: "% Based pricing",     inputLabel: "Discount percentage" },
  unit: { typeName: "Unit price discount",  inputLabel: "New unit price" },
  flat: { typeName: "Flat price discount",  inputLabel: "New flat item price" },
};

const sectionCard: React.CSSProperties = {
  border: "1px solid var(--cim-border-base, #dadcdd)",
  borderRadius: "6px",
  padding: "12px",
  display: "flex",
  flexDirection: "column",
  gap: "12px",
};

const sectionHeading: React.CSSProperties = {
  fontSize: "1rem",
  fontWeight: 600,
  color: "var(--cim-fg-base, #15191d)",
  lineHeight: "24px",
  margin: 0,
};

const radioInputStyle: React.CSSProperties = {
  accentColor: "var(--cim-fg-accent, #0091b8)",
  cursor: "pointer",
  width: "16px",
  height: "16px",
  flexShrink: 0,
};

// ── Artwork preview (shared between New artwork + Customise as before) ─────────
function ArtworkPreview({
  fileName,
  thumbnailUrl,
  productImageUrl,
  onRemove,
  onChanges,
}: {
  fileName: string;
  thumbnailUrl?: string;
  productImageUrl?: string;
  onRemove: () => void;
  onChanges?: () => void;
}) {
  const [zoomOpen, setZoomOpen] = useState(false);
  const [zoomView, setZoomView] = useState<"virtual" | "default">("virtual");
  const [zoomScale, setZoomScale] = useState(1);

  // Default View = the raw artwork the user uploaded
  const artworkSrc = thumbnailUrl ?? "https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=300&h=300&fit=crop";
  // Virtual View = product image with artwork imprint overlay
  const productSrc = productImageUrl ?? "https://images.unsplash.com/photo-1585336261022-680e295ce3fe?w=300&h=300&fit=crop&auto=format&q=80";

  const uploadedDate = "24 Jan 2024";

  const iconBtnStyle: React.CSSProperties = {
    width: "32px", height: "32px",
    background: "white",
    border: "1px solid var(--cim-border-base, #dadcdd)",
    borderRadius: "4px",
    boxShadow: "0px 1px 1px rgba(0,0,0,0.08), 0px 1px 3px rgba(0,0,0,0.04)",
    display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer", flexShrink: 0,
  };

  function ZoomButton({ view }: { view: "virtual" | "default" }) {
    return (
      <div
        role="button"
        aria-label="Zoom in"
        onClick={() => { setZoomView(view); setZoomScale(1); setZoomOpen(true); }}
        style={{ ...iconBtnStyle, position: "absolute", bottom: "8px", right: "8px", width: "30px", height: "30px" }}
      >
        <span style={{ width: "18px", height: "18px", display: "flex", color: "var(--cim-fg-base, #15191d)" }}><IconZoomIn /></span>
      </div>
    );
  }

  const views = [
    { key: "virtual" as const, label: "Virtual View", thumb: productSrc },
    { key: "default" as const, label: "Default View", thumb: artworkSrc },
  ];

  const activeImg = zoomView === "virtual" ? productSrc : artworkSrc;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <span style={{ fontSize: "0.875rem", color: "var(--cim-fg-subtle, #5f6469)", lineHeight: "20px" }}>Preview</span>

      <div style={{ display: "flex", gap: "24px", alignItems: "flex-start" }}>
        {/* Virtual View card */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <div style={{ position: "relative", width: "187px", height: "187px", borderRadius: "6px", border: "1px solid var(--cim-border-subtle, #eaebeb)", overflow: "hidden", background: "white" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={productSrc} alt="Product with imprint" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={artworkSrc} alt="Imprint" style={{ width: "60%", height: "40%", objectFit: "contain", opacity: 0.85, mixBlendMode: "multiply" }} />
            </div>
            <ZoomButton view="virtual" />
          </div>
          <span style={{ fontSize: "0.75rem", color: "var(--cim-fg-subtle, #5f6469)", lineHeight: "16px" }}>Virtual View</span>
        </div>

        {/* Default View card */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <div style={{ position: "relative", width: "187px", height: "187px", borderRadius: "6px", border: "1px solid var(--cim-border-subtle, #eaebeb)", overflow: "hidden", background: "var(--cim-bg-subtle, #f8f9fa)" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={artworkSrc} alt={fileName} style={{ width: "100%", height: "100%", objectFit: "contain", padding: "12px" }} />
            <ZoomButton view="default" />
          </div>
          <span style={{ fontSize: "0.75rem", color: "var(--cim-fg-subtle, #5f6469)", lineHeight: "16px" }}>Default View</span>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", alignItems: "center" }}>
        <Button variant="tertiary" tone="critical" size="small" iconStart={<IconTrash />} onPress={onRemove}>Remove artwork</Button>
        <Button variant="tertiary" size="small" iconStart={<IconPencil />} onPress={onChanges}>Edit artwork</Button>
      </div>

      {/* ── Zoom / Lightbox Modal ── */}
      {zoomOpen && (
        <ModalDialog
          title={fileName}
          isOpen
          onOpenChange={(open) => { if (!open) setZoomOpen(false); }}
          size="medium"
        >
          <ModalDialogBody>
            <div style={{ display: "flex", flexDirection: "column", gap: "0", height: "100%" }}>
              {/* Modal body */}
              <div style={{ display: "flex", flex: 1, overflow: "hidden", minHeight: "500px" }}>
                {/* Left sidebar — view thumbnails */}
                <div style={{ width: "160px", flexShrink: 0, borderRight: "1px solid var(--cim-border-subtle, #eaebeb)", padding: "16px 12px", display: "flex", flexDirection: "column", gap: "12px", overflowY: "auto" }}>
                  {views.map((v) => (
                    <button
                      key={v.key}
                      onClick={() => { setZoomView(v.key); setZoomScale(1); }}
                      style={{
                        border: zoomView === v.key ? "2px solid var(--cim-fg-accent, #007798)" : "1px solid var(--cim-border-base, #dadcdd)",
                        borderRadius: "6px",
                        overflow: "hidden",
                        cursor: "pointer",
                        background: "none",
                        padding: 0,
                        display: "flex",
                        flexDirection: "column",
                        gap: "4px",
                      }}
                    >
                      <div style={{ width: "100%", height: "100px", overflow: "hidden", background: "var(--cim-bg-subtle, #f8f9fa)" }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={v.thumb} alt={v.label} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      </div>
                      <span style={{ fontSize: "0.75rem", color: zoomView === v.key ? "var(--cim-fg-accent, #007798)" : "var(--cim-fg-subtle, #5f6469)", padding: "4px 8px 6px", fontWeight: zoomView === v.key ? 600 : 400, textAlign: "center" }}>
                        {v.label}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Main image area */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column", position: "relative", background: "var(--cim-bg-subtle, #f8f9fa)", overflow: "hidden" }}>
                  {/* Top-right: date + actions */}
                  <div style={{ position: "absolute", top: "12px", right: "12px", display: "flex", alignItems: "center", gap: "8px", zIndex: 2 }}>
                    <span style={{ fontSize: "0.75rem", color: "var(--cim-fg-subtle, #5f6469)" }}>Uploaded on: {uploadedDate}</span>
                    <button aria-label="Open in new tab" style={iconBtnStyle}><span style={{ width: "16px", height: "16px", display: "flex" }}><IconExternalLink /></span></button>
                    <button aria-label="Download" style={iconBtnStyle}><span style={{ width: "16px", height: "16px", display: "flex" }}><IconDownload /></span></button>
                  </div>

                  {/* Image */}
                  <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", padding: "48px 16px 48px" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={activeImg}
                      alt={zoomView === "virtual" ? "Virtual View" : "Default View"}
                      style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", transform: `scale(${zoomScale})`, transition: "transform 0.2s ease", transformOrigin: "center" }}
                    />
                  </div>

                  {/* Bottom-right: zoom controls */}
                  <div style={{ position: "absolute", bottom: "12px", right: "12px", display: "flex", gap: "4px", zIndex: 2 }}>
                    <button aria-label="Zoom in" onClick={() => setZoomScale(s => Math.min(s + 0.25, 3))} style={iconBtnStyle}><span style={{ width: "16px", height: "16px", display: "flex" }}><IconZoomIn /></span></button>
                    <button aria-label="Zoom out" onClick={() => setZoomScale(s => Math.max(s - 0.25, 0.5))} style={iconBtnStyle}><span style={{ width: "16px", height: "16px", display: "flex" }}><IconZoomOut /></span></button>
                  </div>
                </div>
              </div>
            </div>
          </ModalDialogBody>
        </ModalDialog>
      )}
    </div>
  );
}

// ── Color swatch with tooltip ─────────────────────────────────────────────────
function SwatchButton({
  label, hexColor, isSelected, onClick,
}: { label: string; hexColor: string; isSelected: boolean; onClick: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  return (
    <Tooltip label={label} isOpen={open} onOpenChange={setOpen} triggerRef={ref} placement="top">
      <button
        ref={ref}
        aria-label={label}
        aria-pressed={isSelected}
        onClick={onClick}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        style={{
          width: "24px",
          height: "24px",
          borderRadius: "50%",
          background: hexColor,
          border: isSelected ? "2px solid var(--cim-fg-accent, #0091b8)" : "2px solid transparent",
          outline: isSelected ? "1px solid var(--cim-fg-accent, #0091b8)" : "none",
          outlineOffset: "2px",
          cursor: "pointer",
          flexShrink: 0,
          padding: 0,
        }}
      />
    </Tooltip>
  );
}

export const ItemConfigurationCard = forwardRef<ItemConfigurationCardHandle, ItemConfigurationCardProps>(
  ({ product, initialValues, onAddToOrder, onLineTotalChange, onValidityChange, onPriceBreakdownChange, autoOpenPriceOverride }, ref) => {
    const attributesRef = useRef<HTMLDivElement>(null);
    const quantityRef = useRef<HTMLDivElement>(null);
    const artworkRef = useRef<HTMLDivElement>(null);
    const extraChargesRef = useRef<HTMLDivElement>(null);
    const addOnsRef = useRef<HTMLDivElement>(null);
    const itemPriceRef = useRef<HTMLDivElement>(null);
    const customiseOfferRef = useRef<HTMLDivElement>(null);

    const defaultAttributes: DraftOrderItemAttribute[] = product.attributes.map((attr) => ({
      attributeId: attr.id,
      // No pre-selection — start empty unless editing an existing item
      selectedOptionId:
        initialValues?.selectedAttributes.find((a) => a.attributeId === attr.id)?.selectedOptionId ?? "",
    }));

    const [selectedAttributes, setSelectedAttributes] = useState<DraftOrderItemAttribute[]>(defaultAttributes);
    const [quantity, setQuantity] = useState<number>(initialValues?.quantity ?? 0);
    const [upsellApplied, setUpsellApplied] = useState(false);
    const [preUpsellQuantity, setPreUpsellQuantity] = useState<number | null>(null);
    const [upsellInfo, setUpsellInfo] = useState<UpsellSuggestion | null>(null);
    const [quantityInput, setQuantityInput] = useState<string>(initialValues?.quantity != null ? String(initialValues.quantity) : "");

    // Per-size quantity state (for quantityMode === "per-size" products)
    const [sizeQuantities, setSizeQuantities] = useState<Record<string, number>>(
      initialValues?.sizeQuantities ?? {}
    );
    const [artworkOption, setArtworkOption] = useState<"new" | "customise" | null>(
      initialValues ? (initialValues.artworkType === "upload" ? "new" : "customise") : null
    );
    const [artworkFileName, setArtworkFileName] = useState<string>(initialValues?.artworkFileName ?? "");
    const [artworkThumbnailUrl, setArtworkThumbnailUrl] = useState<string>("");
    const [isArtworkModalOpen, setIsArtworkModalOpen] = useState(false);
    const waitingForStudio = useRef(false);

    useEffect(() => {
      let wentHidden = false;
      function handleVisibility() {
        if (document.visibilityState === "hidden") {
          wentHidden = true;
        } else if (document.visibilityState === "visible" && wentHidden && waitingForStudio.current) {
          wentHidden = false;
          waitingForStudio.current = false;
          setArtworkFileName("studio-artwork-design.pdf");
        }
      }
      function handleFocus() {
        if (waitingForStudio.current) {
          waitingForStudio.current = false;
          setArtworkFileName("studio-artwork-design.pdf");
        }
      }
      document.addEventListener("visibilitychange", handleVisibility);
      window.addEventListener("focus", handleFocus);
      return () => {
        document.removeEventListener("visibilitychange", handleVisibility);
        window.removeEventListener("focus", handleFocus);
      };
    }, []);
    const [selectedChargeId, setSelectedChargeId] = useState<string | null>(null);
    const [isCustomQty, setIsCustomQty] = useState(false);
    const [customQtyInput, setCustomQtyInput] = useState("");
    const [pricingGuideSelected, setPricingGuideSelected] = useState<number | null>(null);
    const [isQtyInfoOpen, setIsQtyInfoOpen] = useState(false);
    const qtyInfoBtnRef = useRef<HTMLButtonElement>(null);
    const pricingGuideScrollRef = useRef<HTMLDivElement>(null);
    const pricingGuideRowRefs = useRef<Map<number, HTMLButtonElement>>(new Map());
    const [addedAccessories, setAddedAccessories] = useState<import("@/lib/types").DraftOrderItemAccessory[]>(initialValues?.accessories ?? []);
    const [showAllAccessories, setShowAllAccessories] = useState(false);
    const [isChargesExpanded, setIsChargesExpanded] = useState(false);
    const [isAccessoriesExpanded, setIsAccessoriesExpanded] = useState(false);
    const [isRemoveAccessoriesConfirmOpen, setIsRemoveAccessoriesConfirmOpen] = useState(false);
    const [isCustomizedOfferExpanded, setIsCustomizedOfferExpanded] = useState(false);
    const [accOfferTypes, setAccOfferTypes] = useState<Record<string, "pct" | "unit" | "flat" | null>>({});
    const [accPctInputs, setAccPctInputs] = useState<Record<string, string>>({});
    const [accItemPriceInputs, setAccItemPriceInputs] = useState<Record<string, string>>({});
    const [accUnitPriceInputs, setAccUnitPriceInputs] = useState<Record<string, string>>({});
    const initDiscount = initialValues?.itemDiscount ?? 0;
    const [newPriceInput, setNewPriceInput] = useState<string>("");
    const [newUnitPriceInput, setNewUnitPriceInput] = useState<string>("");
    const [pctBasedInput, setPctBasedInput] = useState<string>(initDiscount > 0 ? String(initDiscount) : "");
    const [overrideReason, setOverrideReason] = useState<string>("");
    const [offerDiscountPct, setOfferDiscountPct] = useState<number>(initDiscount);
    const [activeOfferType, setActiveOfferType] = useState<"pct" | "unit" | "flat" | null>(null);
    const [savedOfferDiscountPct, setSavedOfferDiscountPct] = useState<number>(initDiscount);
    const [savedNewPriceInput, setSavedNewPriceInput] = useState<string>("");
    const [isPriceOverrideOpen, setIsPriceOverrideOpen] = useState(false);
    const [priceOverrideUnitPrice, setPriceOverrideUnitPrice] = useState<string>("");
    const [priceOverrideReason, setPriceOverrideReason] = useState<string>("");
    const [savedPriceOverrideUnitPrice, setSavedPriceOverrideUnitPrice] = useState<number>(0);
    const [isPriceOverrideExpanded, setIsPriceOverrideExpanded] = useState(false);
    const [priceOverrideAccessoryPrices, setPriceOverrideAccessoryPrices] = useState<Record<string, string>>({});
    const [savedAccessoryOverridePrices, setSavedAccessoryOverridePrices] = useState<Record<string, number>>({});
    const [priceOverrideQty, setPriceOverrideQty] = useState<string>("");
    const [priceOverrideAccessoryQuantities, setPriceOverrideAccessoryQuantities] = useState<Record<string, string>>({});
    const [priceOverrideChargePrices, setPriceOverrideChargePrices] = useState<Record<string, string>>({});
    const [priceOverrideItemPriceInput, setPriceOverrideItemPriceInput] = useState<string>("");
    const [priceOverrideAccessoryItemPrices, setPriceOverrideAccessoryItemPrices] = useState<Record<string, string>>({});
    const [isEditChargesOpen, setIsEditChargesOpen] = useState(false);
    const [savedWaivedChargeIds, setSavedWaivedChargeIds] = useState<string[]>([]);
    const [savedWaiveReason, setSavedWaiveReason] = useState<string>("");
    const [modalWaivedIds, setModalWaivedIds] = useState<string[]>([]);
    const [waiveReason, setWaiveReason] = useState<string>("");

    const unitPrice = resolvePricingTier(product.pricingTiers, quantity);
    // basePrice is 0 until the user has entered a quantity
    const basePrice = quantityInput ? parseFloat((unitPrice * quantity).toFixed(2)) : 0;

    // Pricing guide — one row per computed-step within each pricing tier range
    const recommendedTier = product.pricingTiers.find((t) => t.recommended);
    const incrementRanges = computeIncrementRanges(product.pricingTiers, product.minOrderQty, product.maxOrderQty);
    const allGuideRows = (() => {
      const seen = new Set<number>();
      const rows: { qty: number; unitPrice: number; recommended: boolean; step: number; isRangeStart: boolean }[] = [];
      for (const range of incrementRanges) {
        for (let q = range.from; q < range.to; q += range.step) {
          if (q >= product.minOrderQty && q <= product.maxOrderQty && !seen.has(q)) {
            seen.add(q);
            rows.push({
              qty: q,
              unitPrice: resolvePricingTier(product.pricingTiers, q),
              recommended: recommendedTier ? q === recommendedTier.minQty : false,
              step: range.step,
              isRangeStart: q === range.from,
            });
          }
        }
      }
      // Always include maxOrderQty as the final row
      if (!seen.has(product.maxOrderQty)) {
        const lastRange = incrementRanges[incrementRanges.length - 1];
        rows.push({
          qty: product.maxOrderQty,
          unitPrice: resolvePricingTier(product.pricingTiers, product.maxOrderQty),
          recommended: recommendedTier ? product.maxOrderQty === recommendedTier.minQty : false,
          step: lastRange?.step ?? 50,
          isRangeStart: false,
        });
      }
      return rows.sort((a, b) => a.qty - b.qty);
    })();
    const sortedTiersAll = allGuideRows;

    // Effective stock is capped at maxOrderQty — you can't order more than MOQ regardless of stock
    const effectiveStock = product.stockQuantity !== undefined
      ? Math.min(product.stockQuantity, product.maxOrderQty)
      : undefined;

    // Upsell nudge: next pricing tier above current qty, capped by effectiveStock and maxOrderQty
    const upsellCap = effectiveStock ?? product.maxOrderQty;
    const nextTier = quantity > 0
      ? product.pricingTiers
          .slice()
          .sort((a, b) => a.minQty - b.minQty)
          .find((t) => t.minQty > quantity && t.minQty <= upsellCap && t.unitPrice < unitPrice)
      : null;
    const upsellUnits = nextTier ? nextTier.minQty - quantity : 0;
    const upsellCost = nextTier ? parseFloat((upsellUnits * nextTier.unitPrice).toFixed(2)) : 0;

    const selectedCharge = (product.extraCharges ?? []).find((c) => c.id === selectedChargeId);
    // Artwork charge only applies once the user has selected an artwork option
    const artworkCharge = artworkOption !== null ? 10 : 0;
    const allExtraCharges = product.extraCharges ?? [];
    const waivedChargesTotal = parseFloat(allExtraCharges
      .filter((c) => savedWaivedChargeIds.includes(c.id))
      .reduce((sum, c) => sum + c.unitPrice, 0).toFixed(2));
    // All product extra charges are applied by default; waived ones are subtracted
    const allExtraChargesSubtotal = parseFloat(allExtraCharges.reduce((sum, c) => sum + c.unitPrice, 0).toFixed(2));
    const extraChargesTotal = parseFloat((allExtraChargesSubtotal + artworkCharge - waivedChargesTotal).toFixed(2));
    const activeExtraChargesCount = allExtraCharges.filter((c) => !savedWaivedChargeIds.includes(c.id)).length;
    const chargesApplied = activeExtraChargesCount + (artworkOption !== null ? 1 : 0);
    const accessoriesTotal = parseFloat(addedAccessories.reduce((sum, a) => {
      const price = savedAccessoryOverridePrices[a.id] ?? a.unitPrice;
      return sum + a.quantity * price;
    }, 0).toFixed(2));
    const newPriceParsed = newPriceInput !== "" ? parseFloat(newPriceInput) : NaN;
    const newPriceValid = !isNaN(newPriceParsed) && newPriceParsed >= 0 && (basePrice === 0 || newPriceParsed <= basePrice);
    const newPriceInvalid = newPriceInput !== "" && !isNaN(newPriceParsed) && basePrice > 0 && newPriceParsed > basePrice;
    const savedNewPriceParsed = savedNewPriceInput !== "" ? parseFloat(savedNewPriceInput) : NaN;
    const savedNewPriceValid = !isNaN(savedNewPriceParsed) && savedNewPriceParsed >= 0 && (basePrice === 0 || savedNewPriceParsed <= basePrice);
    const priceOverrideDiscountAmount = savedPriceOverrideUnitPrice > 0 && quantity > 0
      ? parseFloat((basePrice - savedPriceOverrideUnitPrice * quantity).toFixed(2))
      : 0;
    // Main item offer discount
    const mainItemOfferDiscount = priceOverrideDiscountAmount > 0
      ? priceOverrideDiscountAmount
      : (() => {
          if (savedOfferDiscountPct > 0 && activeOfferType === "pct")
            return parseFloat((basePrice * savedOfferDiscountPct / 100).toFixed(2));
          if (savedNewPriceInput !== "" && (activeOfferType === "unit" || activeOfferType === "flat")) {
            const p = parseFloat(savedNewPriceInput);
            if (!isNaN(p) && p >= 0) return parseFloat((basePrice - p).toFixed(2));
          }
          return 0;
        })();
    // Per-accessory offer discounts (from Offer customization section)
    const totalAccOfferDiscount = parseFloat(addedAccessories.reduce((sum, acc) => {
      const aType = accOfferTypes[acc.id] ?? null;
      const aOrigTotal = parseFloat((acc.quantity * (savedAccessoryOverridePrices[acc.id] ?? acc.unitPrice)).toFixed(2));
      if (aType === "pct") {
        const pct = parseFloat(accPctInputs[acc.id] ?? "");
        if (pct > 0) return sum + parseFloat((aOrigTotal * pct / 100).toFixed(2));
      } else if (aType === "unit") {
        const up = parseFloat(accUnitPriceInputs[acc.id] ?? "");
        if (!isNaN(up) && acc.quantity > 0) return sum + parseFloat((aOrigTotal - up * acc.quantity).toFixed(2));
      } else if (aType === "flat") {
        const ip = parseFloat(accItemPriceInputs[acc.id] ?? "");
        if (!isNaN(ip) && ip >= 0) return sum + parseFloat((aOrigTotal - ip).toFixed(2));
      }
      return sum;
    }, 0).toFixed(2));
    const discountAmount = parseFloat((mainItemOfferDiscount + totalAccOfferDiscount).toFixed(2));
    const subtotal = parseFloat((basePrice - discountAmount + extraChargesTotal + accessoriesTotal).toFixed(2));
    const taxRate = product.taxRate ?? 8;
    const tax = parseFloat((subtotal * (taxRate / 100)).toFixed(2));
    const totalDue = parseFloat((subtotal + tax).toFixed(2));

    const isValid = quantity >= product.minOrderQty && quantity <= product.maxOrderQty;

    function handleQuantityChange(newQty: number, fromCustom = false) {
      setQuantity(newQty);
      setUpsellApplied(false);
      setPreUpsellQuantity(null);
      setUpsellInfo(computeUpsell(product, newQty, fromCustom));
    }

    function handleAddUpsell() {
      if (!upsellInfo) return;
      setPreUpsellQuantity(quantity);
      setQuantity(upsellInfo.suggestedQty);
      setUpsellApplied(true);
      setIsCustomQty(false);
    }

    function handleRemoveUpsell() {
      if (preUpsellQuantity !== null) setQuantity(preUpsellQuantity);
      setUpsellApplied(false);
      setPreUpsellQuantity(null);
      setUpsellInfo(upsellInfo ? computeUpsell(product, preUpsellQuantity ?? product.minOrderQty) : null);
    }

    useEffect(() => {
      onLineTotalChange?.(totalDue);

      // Compute offer customization to surface in notes template
      let offerCustomization: OfferCustomizationBreakdown | undefined;
      if (activeOfferType !== null) {
        const meta = OFFER_TYPE_META[activeOfferType];
        let inputValue = "";
        let newItemPriceVal: number | null = null;
        let discountAmountVal: number | null = null;
        if (activeOfferType === "pct") {
          const pct = parseFloat(pctBasedInput);
          inputValue = pctBasedInput ? `${pctBasedInput}%` : "";
          if (!isNaN(pct) && pct > 0 && basePrice > 0) {
            discountAmountVal = parseFloat((basePrice * pct / 100).toFixed(2));
            newItemPriceVal = parseFloat((basePrice - discountAmountVal).toFixed(2));
          }
        } else if (activeOfferType === "unit") {
          const up = parseFloat(newUnitPriceInput);
          inputValue = newUnitPriceInput ? `${parseFloat(newUnitPriceInput).toFixed(2)} USD` : "";
          if (!isNaN(up) && quantity > 0) {
            newItemPriceVal = parseFloat((up * quantity).toFixed(2));
            discountAmountVal = basePrice > 0 ? parseFloat((basePrice - newItemPriceVal).toFixed(2)) : null;
          }
        } else if (activeOfferType === "flat") {
          const p = parseFloat(newPriceInput);
          inputValue = newPriceInput ? `${parseFloat(newPriceInput).toFixed(2)} USD` : "";
          if (!isNaN(p)) {
            newItemPriceVal = parseFloat(p.toFixed(2));
            discountAmountVal = basePrice > 0 ? parseFloat((basePrice - p).toFixed(2)) : null;
          }
        }
        offerCustomization = {
          type: activeOfferType,
          typeName: meta.typeName,
          inputLabel: meta.inputLabel,
          inputValue,
          newItemPrice: newItemPriceVal,
          discountAmount: discountAmountVal,
          reason: overrideReason,
          reasonLabel: OFFER_REASON_LABELS[overrideReason] ?? overrideReason,
        };
      }

      onPriceBreakdownChange?.({
        quantity,
        unitPrice,
        basePrice,
        discount: discountAmount,
        chargesApplied,
        extraChargesTotal,
        selectedChargeLabel: selectedCharge?.label,
        selectedChargePrice: selectedCharge?.unitPrice,
        hasArtworkCharge: artworkOption === "customise",
        artworkOption: artworkOption ?? "new",
        accessoriesTotal,
        accessories: addedAccessories.map((a) => ({ id: a.id, label: a.label, quantity: a.quantity, unitPrice: a.unitPrice })),
        charges: [
          ...allExtraCharges
            .filter((c) => !savedWaivedChargeIds.includes(c.id))
            .map((c) => ({ label: c.label, price: c.unitPrice })),
          ...(artworkOption !== null ? [{ label: "Artwork charge", price: 10 }] : []),
        ],
        subtotal,
        taxRate,
        tax,
        totalDue,
        offerCustomization,
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [totalDue, onLineTotalChange, onPriceBreakdownChange, activeOfferType, overrideReason]);

    useEffect(() => {
      onValidityChange?.(isValid);
    }, [isValid, onValidityChange]);

    useEffect(() => {
      const startQty = initialValues?.quantity ?? 0;
      setSelectedAttributes(defaultAttributes);
      setQuantity(startQty);
      setUpsellApplied(false);
      setPreUpsellQuantity(null);
      setUpsellInfo(null);
      setQuantityInput(initialValues?.quantity != null ? String(initialValues.quantity) : "");
      setArtworkOption(initialValues ? (initialValues.artworkType === "upload" ? "new" : "customise") : null);
      setArtworkFileName(initialValues?.artworkFileName ?? "");
      setArtworkThumbnailUrl("");
      setSelectedChargeId(null);
      setPricingGuideSelected(null);
      setAddedAccessories(initialValues?.accessories ?? []);
      setShowAllAccessories(false);
      setSizeQuantities(initialValues?.sizeQuantities ?? {});
      const restoredDiscount = initialValues?.itemDiscount ?? 0;
      setOfferDiscountPct(restoredDiscount);
      setSavedOfferDiscountPct(restoredDiscount);
      setPctBasedInput(restoredDiscount > 0 ? String(restoredDiscount) : "");
      setNewPriceInput("");
      setNewUnitPriceInput("");
      setSavedNewPriceInput("");
      setAccOfferTypes({});
      setAccPctInputs({});
      setAccItemPriceInputs({});
      setAccUnitPriceInputs({});
      setActiveOfferType(null as "pct" | "unit" | "flat" | null);
      setOverrideReason("");
      setSavedPriceOverrideUnitPrice(0);
      setPriceOverrideUnitPrice("");
      setPriceOverrideReason("");
      setPriceOverrideAccessoryPrices({});
      setSavedAccessoryOverridePrices({});
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [product.id]);

    // Scroll pricing guide to the nearest row when quantity changes
    useEffect(() => {
      if (!quantity) return;
      let nearest = sortedTiersAll[0];
      let minDiff = Math.abs((sortedTiersAll[0]?.qty ?? 0) - quantity);
      for (const row of sortedTiersAll) {
        const diff = Math.abs(row.qty - quantity);
        if (diff < minDiff) { minDiff = diff; nearest = row; }
      }
      if (!nearest) return;
      const el = pricingGuideRowRefs.current.get(nearest.qty);
      el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [quantity]);

    // Sync aggregated total quantity from per-size inputs
    useEffect(() => {
      if (product.quantityMode === "per-size") {
        const total = Object.values(sizeQuantities).reduce((sum, q) => sum + (q || 0), 0);
        setQuantity(total);
        setQuantityInput(total > 0 ? String(total) : "");
        if (total > 0) {
          setUpsellInfo(computeUpsell(product, total));
        }
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sizeQuantities, product.quantityMode]);

    // Auto-save offer customization whenever inputs change (no explicit save button needed)
    useEffect(() => {
      if (activeOfferType === "pct") {
        const pct = parseFloat(pctBasedInput) || 0;
        setSavedOfferDiscountPct(pct);
        setSavedNewPriceInput("");
      } else if (activeOfferType === "unit") {
        const up = parseFloat(newUnitPriceInput);
        if (!isNaN(up) && up >= 0 && quantity > 0) {
          setSavedNewPriceInput((up * quantity).toFixed(2));
          setSavedOfferDiscountPct(0);
        }
      } else if (activeOfferType === "flat") {
        const p = parseFloat(newPriceInput);
        if (!isNaN(p) && p >= 0) {
          setSavedNewPriceInput(newPriceInput);
          setSavedOfferDiscountPct(0);
        }
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeOfferType, pctBasedInput, newPriceInput, newUnitPriceInput, quantity]);

    // Auto-open price override modal when navigated via "Edit price override" menu
    useEffect(() => {
      if (autoOpenPriceOverride) setIsPriceOverrideOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [autoOpenPriceOverride]);

    // Initialise price override modal fields with original prices when modal opens
    useEffect(() => {
      if (isPriceOverrideOpen) {
        setPriceOverrideUnitPrice(unitPrice.toFixed(2));
        setPriceOverrideItemPriceInput(basePrice.toFixed(2));
        // Pre-fill accessory unit + item prices with their originals
        const unitPrices: Record<string, string> = {};
        const itemPrices: Record<string, string> = {};
        addedAccessories.forEach((acc) => {
          unitPrices[acc.id] = acc.unitPrice.toFixed(2);
          itemPrices[acc.id] = (acc.unitPrice * acc.quantity).toFixed(2);
        });
        setPriceOverrideAccessoryPrices(unitPrices);
        setPriceOverrideAccessoryItemPrices(itemPrices);
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isPriceOverrideOpen]);

const handleSubmit = useCallback(() => {
      const item: DraftOrderItem = {
        draftItemId: initialValues?.draftItemId ?? generateDraftId(),
        product,
        selectedAttributes,
        quantity,
        ...(product.quantityMode === "per-size" ? { sizeQuantities } : {}),
        artworkType: artworkOption === "new" ? "upload" : artworkOption === "customise" ? "url" : "none",
        artworkUrl: "",
        artworkFileName,
        itemDiscount: savedOfferDiscountPct,
        unitPrice,
        // lineTotal is the pre-tax subtotal; tax is computed separately downstream
        lineTotal: subtotal,
        accessories: addedAccessories,
      };
      onAddToOrder(item);
    }, [product, selectedAttributes, quantity, sizeQuantities, artworkOption, artworkFileName, unitPrice, subtotal, addedAccessories, onAddToOrder, initialValues, savedOfferDiscountPct]);

    useImperativeHandle(ref, () => ({ submit: handleSubmit }), [handleSubmit]);

    function handleAttributeChange(attributeId: string, selectedOptionId: string) {
      setSelectedAttributes((prev) =>
        prev.map((a) => (a.attributeId === attributeId ? { ...a, selectedOptionId } : a))
      );
    }

    return (
      <>
        <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>

          {/* Product info row */}
          {(() => {
            const colorAttr = product.attributes.find((a) => a.type === "color");
            const selectedColorId = colorAttr
              ? selectedAttributes.find((a) => a.attributeId === colorAttr.id)?.selectedOptionId
              : undefined;
            const selectedColorOption = colorAttr?.options.find((o) => o.id === selectedColorId);
            const displayImageUrl = product.imageUrl;
            return (
          <div style={{ display: "flex", gap: "16px", alignItems: "flex-start", padding: "4px 0 12px" }}>
            <div style={{ width: "60px", height: "60px", borderRadius: "6px", overflow: "hidden", background: "var(--cim-bg-subtle, #f8f9fa)", flexShrink: 0 }}>
              {displayImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={displayImageUrl} alt={selectedColorOption?.label ?? product.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <rect x="3" y="3" width="18" height="18" rx="2" stroke="var(--cim-fg-muted)" strokeWidth="1.5" />
                    <path d="M3 16l5-5 4 4 3-3 5 4" stroke="var(--cim-fg-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}
            </div>
            <div style={{ flex: 1, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: "1rem", fontWeight: 600, color: "var(--cim-fg-base, #15191d)", lineHeight: "24px" }}>{product.name}</p>
                <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--cim-fg-subtle, #5f6469)", lineHeight: "20px" }}>{product.description ?? product.category}</p>
              </div>
              <span style={{ fontSize: "0.875rem", color: "var(--cim-fg-subtle, #5f6469)", whiteSpace: "nowrap", flexShrink: 0 }}>{product.id}</span>
            </div>
          </div>
            );
          })()}

          {/* Combined Attributes + Quantity section */}
          <div ref={attributesRef} style={{ ...sectionCard, border: "none", padding: "0" }}>
            {/* Attributes */}
            {product.attributes.length > 0 && (
              <>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <p style={sectionHeading}>Attributes</p>
                  <button
                    onClick={() => {
                      setSelectedAttributes(product.attributes.map((attr) => ({ attributeId: attr.id, selectedOptionId: "" })));
                      setQuantityInput("");
                      setQuantity(0);
                      setSizeQuantities({});
                      setUpsellApplied(false);
                      setPreUpsellQuantity(null);
                      setUpsellInfo(null);
                      setPricingGuideSelected(null);
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      padding: 0,
                      color: "var(--cim-fg-accent, #007798)",
                      fontSize: "0.875rem",
                      cursor: "pointer",
                      textDecoration: "underline",
                      flexShrink: 0,
                    }}
                  >
                    Reset All Attributes
                  </button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {product.attributes.map((attr) => {
                    const currentVal = selectedAttributes.find((a) => a.attributeId === attr.id)?.selectedOptionId ?? "";
                    if (attr.type === "color") {
                      return (
                        <div key={attr.id} style={{ maxWidth: "463px" }}>
                          <Select
                            label={attr.label}
                            selectedKey={currentVal}
                            onSelectionChange={(val) => handleAttributeChange(attr.id, String(val))}
                            isRequired
                          >
                            {attr.options.map((opt) => (
                              <SelectItem key={opt.id} id={opt.id}>{opt.hexColor ?? opt.label}</SelectItem>
                            ))}
                          </Select>
                        </div>
                      );
                    }
                    if (attr.type === "radio") {
                      return (
                        <div key={attr.id} style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                          <span style={{ fontSize: "0.875rem", color: "var(--cim-fg-base, #15191d)" }}>
                            {attr.label}<span style={{ color: "var(--cim-fg-critical, #d10023)", marginLeft: "2px" }}>*</span>
                          </span>
                          <div style={{ display: "flex", gap: "24px", alignItems: "center" }}>
                            {attr.options.map((opt) => {
                              const isSelected = currentVal === opt.id;
                              return (
                                <label
                                  key={opt.id}
                                  style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}
                                >
                                  <input
                                    type="radio"
                                    name={`attr-${attr.id}`}
                                    value={opt.id}
                                    checked={isSelected}
                                    onChange={() => handleAttributeChange(attr.id, opt.id)}
                                    style={radioInputStyle}
                                  />
                                  <span style={{ fontSize: "1rem", color: "var(--cim-fg-base, #15191d)", lineHeight: "24px" }}>{opt.label}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div key={attr.id} style={{ width: "378px", maxWidth: "100%" }}>
                        <Select
                          label={attr.label}
                          selectedKey={currentVal}
                          onSelectionChange={(val) => handleAttributeChange(attr.id, String(val))}
                          isRequired
                        >
                          {attr.options.map((opt) => (
                            <SelectItem key={opt.id} id={opt.id}>{opt.label}</SelectItem>
                          ))}
                        </Select>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* Quantity */}
            <div ref={quantityRef} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>

              {/* Per-size quantity grid */}
              {product.quantityMode === "per-size" && product.availableSizes ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <span style={{ fontSize: "0.875rem", color: "var(--cim-fg-base, #15191d)" }}>
                    Size and quantity<span style={{ color: "var(--cim-fg-critical, #d10023)", marginLeft: "2px" }}>*</span>
                  </span>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "16px" }}>
                    {product.availableSizes.map((size) => {
                      const qty = sizeQuantities[size] ?? 0;
                      const stock = product.stockBySize?.[size];
                      const isOver = stock !== undefined && qty > stock;
                      return (
                        <div key={size} style={{ display: "flex", flexDirection: "column", gap: "4px", width: "150px" }}>
                          {/* Input box: size prefix inside + number value */}
                          <div style={{
                            display: "flex",
                            alignItems: "center",
                            minHeight: "40px",
                            border: isOver
                              ? "1px solid var(--cim-border-critical, #d10023)"
                              : "1px solid var(--cim-border-base, #dadcdd)",
                            borderRadius: "4px",
                            background: "white",
                            overflow: "hidden",
                          }}>
                            {/* Size label prefix */}
                            <span style={{
                              padding: "0 4px 0 12px",
                              fontSize: "1rem",
                              color: "var(--cim-fg-subtle, #5f6469)",
                              userSelect: "none",
                              flexShrink: 0,
                            }}>
                              {size}
                            </span>
                            {/* Number input */}
                            <input
                              type="number"
                              min={0}
                              max={stock}
                              value={qty === 0 ? "" : qty}
                              placeholder="0"
                              onChange={(e) => {
                                const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                                setSizeQuantities((prev) => ({ ...prev, [size]: val }));
                              }}
                              style={{
                                flex: 1,
                                minWidth: 0,
                                border: "none",
                                outline: "none",
                                fontSize: "1rem",
                                fontWeight: qty > 0 ? 600 : 400,
                                color: qty > 0
                                  ? (isOver ? "var(--cim-fg-critical, #d10023)" : "var(--cim-fg-base, #15191d)")
                                  : "var(--cim-fg-subtle, #5f6469)",
                                background: "transparent",
                                padding: "0 12px 0 4px",
                                MozAppearance: "textfield",
                              } as React.CSSProperties}
                            />
                          </div>
                          {/* Stock hint / error */}
                          {stock !== undefined && (
                            <span style={{ fontSize: "0.75rem", color: isOver ? "var(--cim-fg-critical, #d10023)" : "var(--cim-fg-subtle, #5f6469)" }}>
                              Only {stock} left
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {/* Total Quantity read-only */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px", maxWidth: "382px" }}>
                    <TextField
                      label="Total Quantity"
                      value={quantity > 0 ? String(quantity) : ""}
                      placeholder="0"
                      isReadOnly
                      isRequired
                      description={`Minimum ${product.minOrderQty} units`}
                      isInvalid={quantity > 0 && quantity < product.minOrderQty}
                      error={quantity > 0 && quantity < product.minOrderQty ? `Minimum is ${product.minOrderQty}` : undefined}
                    />
                  </div>
                  {effectiveStock !== undefined && (
                    (() => {
                      const overStock = quantity > 0 && quantity > effectiveStock;
                      return (
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ color: overStock ? "var(--cim-fg-critical, #d10023)" : "var(--cim-fg-success, #007e3f)", display: "flex" }}>
                            <IconCheckCircleFill />
                          </span>
                          <span style={{ fontSize: "0.875rem", color: overStock ? "var(--cim-fg-critical, #d10023)" : "var(--cim-fg-base, #15191d)" }}>
                            In stock - {effectiveStock}
                          </span>
                        </div>
                      );
                    })()
                  )}
                </div>
              ) : (
                /* Standard single quantity field */
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxWidth: "463px" }}>
                  <TextField
                    label="Enter quantity"
                    isRequired
                    value={quantityInput}
                    onChange={(val) => {
                      setQuantityInput(val);
                      const n = parseInt(val, 10);
                      if (!isNaN(n) && n > 0) handleQuantityChange(n);
                      else if (val === "") { setQuantity(0); }
                    }}
                    placeholder={`${product.minOrderQty} – ${product.maxOrderQty}`}
                    description={`Quantity has to be between ${product.minOrderQty} - ${product.maxOrderQty}`}
                    isInvalid={quantityInput !== "" && (isNaN(parseInt(quantityInput)) || parseInt(quantityInput) < product.minOrderQty || parseInt(quantityInput) > product.maxOrderQty)}
                    error={quantityInput !== "" && parseInt(quantityInput, 10) < product.minOrderQty ? `Minimum is ${product.minOrderQty}` : quantityInput !== "" && parseInt(quantityInput, 10) > product.maxOrderQty ? `Maximum is ${product.maxOrderQty}` : undefined}
                  />
                  {effectiveStock !== undefined && (
                    (() => {
                      const overStock = quantity > 0 && quantity > effectiveStock;
                      return (
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ color: overStock ? "var(--cim-fg-critical, #d10023)" : "var(--cim-fg-success, #007e3f)", display: "flex" }}>
                            <IconCheckCircleFill />
                          </span>
                          <span style={{ fontSize: "0.875rem", color: overStock ? "var(--cim-fg-critical, #d10023)" : "var(--cim-fg-base, #15191d)" }}>
                            In stock - {effectiveStock}
                          </span>
                        </div>
                      );
                    })()
                  )}
                  <div style={{ border: "1px solid var(--cim-border-subtle, #eaebeb)", borderRadius: "4px", overflow: "hidden" }}>
                      <div ref={pricingGuideScrollRef} style={{ maxHeight: "200px", overflowY: "auto", scrollbarWidth: "thin" }}>
                        {sortedTiersAll.map((row) => {
                          const isSelected = pricingGuideSelected === row.qty || quantity === row.qty;
                          const outOfStock = effectiveStock !== undefined && row.qty > effectiveStock;
                          const rowTotal = (row.qty * row.unitPrice).toFixed(2);
                          const fgColor = outOfStock ? "var(--cim-fg-muted, #94979b)" : "var(--cim-fg-base, #15191d)";
                          return (
                            <button
                              key={row.qty}
                              ref={(el) => { if (el) pricingGuideRowRefs.current.set(row.qty, el); else pricingGuideRowRefs.current.delete(row.qty); }}
                              disabled={outOfStock}
                              onClick={() => {
                                if (outOfStock) return;
                                setPricingGuideSelected(row.qty);
                                setQuantityInput(String(row.qty));
                                handleQuantityChange(row.qty);
                              }}
                              style={{ display: "flex", alignItems: "center", width: "100%", minHeight: "40px", background: isSelected ? "var(--cim-bg-info-subtle, #e8f4f8)" : "white", border: "none", borderBottom: "1px solid var(--cim-border-base, #dadcdd)", cursor: outOfStock ? "not-allowed" : "pointer", padding: 0, textAlign: "left", opacity: outOfStock ? 0.6 : 1 }}
                            >
                              <div style={{ width: "40px", minHeight: "40px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                <div style={{ width: "16px", height: "16px", borderRadius: "999px", border: isSelected ? "5px solid var(--cim-fg-base, #15191d)" : `1px solid ${outOfStock ? "var(--cim-fg-muted, #94979b)" : "var(--cim-fg-base, #15191d)"}`, background: "white", boxSizing: "border-box", flexShrink: 0 }} />
                              </div>
                              <div style={{ flex: 1, padding: "0 12px", minWidth: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                                <span style={{ fontSize: "0.875rem", color: fgColor, lineHeight: "20px" }}>{row.qty}</span>
                                {row.recommended && !outOfStock && <Badge tone="base">Recommended</Badge>}
                                {outOfStock && <Badge tone="critical">Out of stock</Badge>}
                              </div>
                              <div style={{ padding: "0 12px", flexShrink: 0 }}>
                                <span style={{ fontSize: "0.875rem", fontWeight: 600, color: fgColor, whiteSpace: "nowrap" }}>{rowTotal} USD</span>
                              </div>
                              <div style={{ padding: "0 12px", flexShrink: 0 }}>
                                <span style={{ fontSize: "0.75rem", color: outOfStock ? "var(--cim-fg-muted, #94979b)" : "var(--cim-fg-subtle, #5f6469)", whiteSpace: "nowrap" }}>{row.unitPrice.toFixed(2)} / unit</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                </div>
              )}

            </div>
          </div>

          {/* Item total row */}
          <div style={{ ...sectionCard, flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", width: "100%" }}>
              <span style={{ fontSize: "1rem", fontWeight: 600, color: "var(--cim-fg-subtle, #5f6469)" }}>Item total</span>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                {quantityInput && (
                  <span style={{ fontSize: "0.75rem", color: "var(--cim-fg-base, #15191d)", lineHeight: "16px" }}>
                    ({quantity} x {unitPrice.toFixed(2)} / unit)
                  </span>
                )}
                <span style={{ fontSize: "1rem", fontWeight: 600, color: quantityInput ? "var(--cim-fg-base, #15191d)" : "var(--cim-fg-muted, #94979b)", lineHeight: "24px" }}>
                  {quantityInput ? `${basePrice.toFixed(2)} USD` : "—"}
                </span>
              </div>
            </div>
            {/* Upsell nudge — always visible; disabled when no qty or no next tier */}
            <div style={{
              display: "flex", alignItems: "center", gap: "8px",
              background: "var(--cim-bg-subtle, #f8f9fa)",
              borderRadius: "6px",
              padding: "12px",
            }}>
              <Button
                size="small"
                isDisabled={!nextTier}
                onPress={() => {
                  if (!nextTier) return;
                  // Only capture the original qty on the first upsell so Remove always reverts there
                  if (!upsellApplied) setPreUpsellQuantity(quantity);
                  setUpsellApplied(true);
                  setQuantity(nextTier.minQty);
                  setQuantityInput(String(nextTier.minQty));
                  setUpsellInfo(computeUpsell(product, nextTier.minQty));
                  setPricingGuideSelected(nextTier.minQty);
                }}
              >Add upsell</Button>
              <span style={{ fontSize: "0.75rem", color: "var(--cim-fg-base, #15191d)" }}>
                {nextTier ? `${upsellUnits} more for ${upsellCost.toFixed(2)} USD` : "0 more for 0.00 USD"}
              </span>
              {/* Remove upsell link — right-aligned inside the nudge row */}
              {upsellApplied && (
                <button
                  onClick={() => {
                    const revertQty = preUpsellQuantity ?? 0;
                    setUpsellApplied(false);
                    setPreUpsellQuantity(null);
                    setQuantityInput(revertQty > 0 ? String(revertQty) : "");
                    if (revertQty > 0) {
                      handleQuantityChange(revertQty);
                      setPricingGuideSelected(revertQty);
                    }
                  }}
                  style={{
                    marginLeft: "auto",
                    background: "none",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                    fontSize: "0.875rem",
                    color: "var(--cim-fg-critical, #d10023)",
                    textDecoration: "underline",
                    textUnderlineOffset: "2px",
                    flexShrink: 0,
                  }}
                >
                  Remove upsell
                </button>
              )}
            </div>
          </div>

          {/* Imprint section */}
          <div ref={artworkRef} style={{ ...sectionCard }}>
            {/* Header row: title + charge note | Refresh Artwork link */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1 }}>
                <p style={sectionHeading}>Imprint</p>
                <span style={{ fontSize: "0.75rem", color: "var(--cim-fg-base, #15191d)" }}>
                  ( An extra charge of 10.00 USD will be applicable )
                </span>
              </div>
              <button
                onClick={() => { setArtworkFileName(""); setArtworkThumbnailUrl(""); setArtworkOption(null); }}
                style={{
                  background: "none", border: "none", cursor: "pointer", fontSize: "0.875rem",
                  color: artworkFileName ? "var(--cim-fg-accent, #007798)" : "var(--cim-fg-muted, #94979b)",
                  textDecoration: "underline", padding: 0, whiteSpace: "nowrap",
                }}
              >
                Refresh Artwork
              </button>
            </div>

            {/* Buttons row — always visible */}
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <a
                href="https://pens.experience.cimpress.io/us/studio/?key=PRD-ZQO1BK4YA&productVersion=4&locale=en-us"
                target="_blank"
                rel="noopener noreferrer"
                style={{ textDecoration: "none" }}
                onClick={() => { setArtworkOption("new"); waitingForStudio.current = true; }}
              >
                <Button variant="secondary" size="medium">Add new imprint</Button>
              </a>
              <Button
                variant="tertiary"
                size="medium"
                onPress={() => { setArtworkOption("customise"); setIsArtworkModalOpen(true); }}
              >
                Customise as before
              </Button>
            </div>

            {/* Artwork preview (only when file selected) */}
            {artworkFileName && (
              <ArtworkPreview
                fileName={artworkFileName}
                thumbnailUrl={artworkThumbnailUrl || undefined}
                productImageUrl={product.imageUrl}
                onRemove={() => { setArtworkFileName(""); setArtworkThumbnailUrl(""); }}
                onChanges={() => setIsArtworkModalOpen(true)}
              />
            )}
          </div>

          {/* Extra charges section — hidden from view */}
          {false && (product.extraCharges ?? []).length > 0 && (
            <div ref={extraChargesRef} style={{ position: "relative", border: "1px solid var(--cim-border-base, #dadcdd)", borderRadius: "6px", overflow: "hidden" }}>
              <Disclosure title="Extra charges" variant="subtle">
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", padding: "4px 16px 16px" }}>
                  {(product.extraCharges ?? []).map((charge) => {
                    const isSelected = selectedChargeId === charge.id;
                    return (
                      <label
                        key={charge.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "12px",
                          borderRadius: "6px",
                          border: isSelected
                            ? "1.5px solid var(--cim-border-accent, #0091b8)"
                            : "1px solid var(--cim-border-base, #dadcdd)",
                          background: isSelected ? "var(--cim-bg-info-subtle, #e8f4f8)" : "white",
                          cursor: "pointer",
                          gap: "12px",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <input
                            type="radio"
                            name="extraCharge"
                            value={charge.id}
                            checked={isSelected}
                            onChange={() => setSelectedChargeId(isSelected ? null : charge.id)}
                            onClick={() => { if (isSelected) setSelectedChargeId(null); }}
                            style={radioInputStyle}
                          />
                          <span style={{ fontSize: "0.875rem", color: "var(--cim-fg-base, #15191d)" }}>
                            {charge.label}
                          </span>
                        </div>
                        <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--cim-fg-base, #15191d)", whiteSpace: "nowrap" }}>
                          {charge.unitPrice.toFixed(2)} USD
                        </span>
                      </label>
                    );
                  })}
                </div>
              </Disclosure>
              {selectedChargeId && (
                <div style={{ position: "absolute", right: "12px", top: 0, height: "48px", display: "flex", alignItems: "center", pointerEvents: "none" }}>
                  <Badge tone="base">1 ({(selectedCharge?.unitPrice ?? 0).toFixed(2)} USD)</Badge>
                </div>
              )}
            </div>
          )}

          {/* Add-ons section — hidden for Apparel products */}
          {product.category !== "Apparel" && (() => {
            const addedCount = addedAccessories.length;
            const visibleAccessories = showAllAccessories ? MOCK_ACCESSORIES : MOCK_ACCESSORIES.slice(0, 4);
            return (
              <div ref={addOnsRef} style={{ border: "1px solid var(--cim-border-base, #dadcdd)", borderRadius: "6px", overflow: "hidden" }}>
                <Disclosure title={`Add Accessory (${addedCount})`} variant="subtle">
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px", padding: "4px 16px 16px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px" }}>
                      {visibleAccessories.map((acc) => {
                        const isAdded = addedAccessories.some((a) => a.id === acc.id);
                        return (
                          <AccessoryCard
                            key={acc.id}
                            item={acc}
                            isAdded={isAdded}
                            mainItemQty={quantity}
                            onAdd={(added) => setAddedAccessories((prev) => [...prev, added])}
                            onRemove={() => setAddedAccessories((prev) => prev.filter((a) => a.id !== acc.id))}
                          />
                        );
                      })}
                    </div>
                    {MOCK_ACCESSORIES.length > 4 && (
                      <button
                        onClick={() => setShowAllAccessories((prev) => !prev)}
                        style={{
                          background: "none", border: "none", padding: 0,
                          color: "var(--cim-fg-accent, #007798)", cursor: "pointer",
                          textDecoration: "underline", fontSize: "1rem",
                          alignSelf: "flex-start",
                        }}
                      >
                        {showAllAccessories ? "Hide all accessories" : "View all accessories"}
                      </button>
                    )}
                  </div>
                </Disclosure>
              </div>
            );
          })()}

          {/* Apply discount section */}
          <div ref={customiseOfferRef} style={{
            background: "white",
            border: "1px solid var(--cim-border-base, #dadcdd)",
            borderRadius: "6px",
            padding: "12px",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}>
            {/* Title + Clear */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "1rem", fontWeight: 600, color: "var(--cim-fg-base, #15191d)", lineHeight: "24px" }}>Apply discount</span>
              <Button
                variant="tertiary"
                size="small"
                isDisabled={!pctBasedInput}
                onPress={() => { setPctBasedInput(""); setOfferDiscountPct(0); setActiveOfferType(null); setOverrideReason(""); }}
              >
                Clear
              </Button>
            </div>

            {/* 1–10% preset toggle chips */}
            <ToggleButtonGroup
              selectionMode="single"
              selectedKeys={pctBasedInput ? new Set([pctBasedInput]) : new Set()}
              onSelectionChange={(keys) => {
                const selected = [...keys][0]?.toString() ?? "";
                setPctBasedInput(selected);
                setOfferDiscountPct(parseFloat(selected) || 0);
                if (selected) setActiveOfferType("pct");
                else setActiveOfferType(null);
              }}
              wrap
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                <ToggleButton key={n} value={String(n)}>{n}%</ToggleButton>
              ))}
            </ToggleButtonGroup>

            {/* Reason for providing discount */}
            <Select
              label="Reason for providing discount"
              isRequired
              selectedKey={overrideReason || null}
              onSelectionChange={(key) => setOverrideReason(key as string)}
              placeholder="Select"
              UNSAFE_style={{ maxWidth: "320px" }}
            >
              <SelectItem id="promotional">Promotional offer</SelectItem>
              <SelectItem id="loyalty_discount">Loyalty discount</SelectItem>
              <SelectItem id="bulk_deal">Bulk deal</SelectItem>
              <SelectItem id="error_correction">Error correction</SelectItem>
              <SelectItem id="manager_approval">Manager approval</SelectItem>
              <SelectItem id="other">Other</SelectItem>
            </Select>



          </div>

          {/* Item price section */}

          <div ref={itemPriceRef} style={{
            background: "white",
            border: "1px solid var(--cim-border-base, #dadcdd)",
            borderRadius: "6px",
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}>
            <p style={sectionHeading}>Price breakdown</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>

              {/* Base price */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "1rem", color: "var(--cim-fg-base, #15191d)" }}>
                <span>
                  Item Price{savedPriceOverrideUnitPrice > 0 && quantity > 0
                    ? ` (${quantity} qty × ${unitPrice.toFixed(2)} unit)`
                    : ""}
                </span>
                <span>{basePrice.toFixed(2)} USD</span>
              </div>

              {/* Price override row — shown when a price override has been confirmed */}
              {priceOverrideDiscountAmount > 0 && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", fontSize: "1rem", color: "var(--cim-fg-base, #15191d)" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <button
                        onClick={() => setIsPriceOverrideExpanded((v) => !v)}
                        style={{ display: "flex", alignItems: "center", gap: "8px", background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: "1rem", color: "var(--cim-fg-base, #15191d)" }}
                      >
                        Price override
                        <span style={{ display: "flex", color: "var(--cim-fg-subtle, #5f6469)", transform: isPriceOverrideExpanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.15s" }}>
                          <IconChevronDown size={16} />
                        </span>
                      </button>
                      <button
                        onClick={() => { setSavedPriceOverrideUnitPrice(0); setPriceOverrideUnitPrice(""); setPriceOverrideReason(""); setSavedAccessoryOverridePrices({}); setPriceOverrideAccessoryPrices({}); }}
                        style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: "0.875rem", color: "var(--cim-fg-accent, #007798)", textDecoration: "underline" }}
                      >
                        Remove
                      </button>
                    </span>
                    <span style={{ color: "var(--cim-fg-success, #007e3f)" }}>-{priceOverrideDiscountAmount.toFixed(2)} USD</span>
                  </div>
                  {isPriceOverrideExpanded && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "2px", marginTop: "6px", paddingLeft: "12px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem", color: "var(--cim-fg-subtle, #5f6469)" }}>
                        <span>Override unit price</span>
                        <span>{savedPriceOverrideUnitPrice.toFixed(2)} USD / unit</span>
                      </div>
                      {priceOverrideReason && (
                        <div style={{ fontSize: "0.875rem", color: "var(--cim-fg-subtle, #5f6469)" }}>
                          Reason: {priceOverrideReason}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Total charges applied — collapsible, shown when product has extra charges or artwork charge */}
              {(allExtraCharges.length > 0 || artworkOption !== null) && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", fontSize: "1rem", color: "var(--cim-fg-base, #15191d)" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <button
                        onClick={() => setIsChargesExpanded((v) => !v)}
                        style={{ display: "flex", alignItems: "center", gap: "8px", background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: "1rem", color: "var(--cim-fg-base, #15191d)" }}
                      >
                        Total charges applied ({chargesApplied})
                        <span style={{ display: "flex", color: "var(--cim-fg-subtle, #5f6469)", transform: isChargesExpanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.15s" }}>
                          <IconChevronDown size={16} />
                        </span>
                      </button>
                    </span>
                    <span>{extraChargesTotal.toFixed(2)} USD</span>
                  </div>
                  {isChargesExpanded && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "6px", paddingLeft: "12px" }}>
                      {allExtraCharges.map((charge) => {
                        const isWaived = savedWaivedChargeIds.includes(charge.id);
                        return (
                          <div key={charge.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem", color: isWaived ? "var(--cim-fg-muted, #94979b)" : "var(--cim-fg-subtle, #5f6469)" }}>
                            <span style={{ textDecoration: isWaived ? "line-through" : "none" }}>{charge.label}</span>
                            <span style={{ textDecoration: isWaived ? "line-through" : "none" }}>{charge.unitPrice.toFixed(2)} USD</span>
                          </div>
                        );
                      })}
                      {artworkOption !== null && (
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem", color: "var(--cim-fg-subtle, #5f6469)" }}>
                          <span>{artworkOption === "customise" ? "Artwork customisation" : "New artwork charge"}</span>
                          <span>10.00 USD</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Accessory added — collapsible, only when accessories exist */}
              {addedAccessories.length > 0 && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", fontSize: "1rem", color: "var(--cim-fg-base, #15191d)" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <button
                        onClick={() => setIsAccessoriesExpanded((v) => !v)}
                        style={{ display: "flex", alignItems: "center", gap: "8px", background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: "1rem", color: "var(--cim-fg-base, #15191d)" }}
                      >
                        Accessory added ({addedAccessories.length})
                        <span style={{ display: "flex", color: "var(--cim-fg-subtle, #5f6469)", transform: isAccessoriesExpanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.15s" }}>
                          <IconChevronDown size={16} />
                        </span>
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setIsRemoveAccessoriesConfirmOpen(true); }}
                        aria-label="Remove all accessories"
                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--cim-fg-subtle, #5f6469)", display: "flex", alignItems: "center", padding: "2px" }}
                      >
                        <IconTrash size={16} />
                      </button>
                    </span>
                    <span>{accessoriesTotal.toFixed(2)} USD</span>
                  </div>
                  {isAccessoriesExpanded && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "6px", paddingLeft: "12px" }}>
                      {addedAccessories.map((acc) => (
                        <div key={acc.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem", color: "var(--cim-fg-subtle, #5f6469)" }}>
                          <span>{acc.label} × {acc.quantity}</span>
                          <span>{(acc.quantity * acc.unitPrice).toFixed(2)} USD</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Customized offer — only shown when a pct/price discount has been saved (no price override active) */}
              {/* Custom discount row — shown when a % discount is applied */}
              {discountAmount > 0 && priceOverrideDiscountAmount === 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "1rem", color: "var(--cim-fg-success, #007e3f)" }}>
                  <span>
                    Custom discount{savedOfferDiscountPct > 0 ? ` (${savedOfferDiscountPct}%)` : ""}
                  </span>
                  <span>-{discountAmount.toFixed(2)} USD</span>
                </div>
              )}

              {/* Subtotal */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "1rem", color: "var(--cim-fg-base, #15191d)" }}>
                <span>Subtotal</span>
                <span>{subtotal.toFixed(2)} USD</span>
              </div>

              {/* Tax */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "1rem", color: "var(--cim-fg-base, #15191d)" }}>
                <span>Tax ({taxRate}%)</span>
                <span>{tax.toFixed(2)} USD</span>
              </div>

              {/* Divider */}
              <div style={{ height: "1px", background: "var(--cim-border-base, #dadcdd)" }} />

              {/* Total due */}
              {(() => {
                const originalSubtotal = parseFloat((basePrice + extraChargesTotal + accessoriesTotal).toFixed(2));
                const originalTax = parseFloat((originalSubtotal * (taxRate / 100)).toFixed(2));
                const originalTotalDue = parseFloat((originalSubtotal + originalTax).toFixed(2));
                const hasDiscount = discountAmount > 0 || priceOverrideDiscountAmount > 0;
                return (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "12px" }}>
                    <span style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--cim-fg-base, #15191d)", lineHeight: "28px" }}>Total due</span>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "2px" }}>
                      <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
                        {hasDiscount && (
                          <span style={{ fontSize: "1.125rem", fontWeight: 400, color: "var(--cim-fg-subtle, #5f6469)", textDecoration: "line-through", lineHeight: "28px" }}>
                            {originalTotalDue.toFixed(2)} USD
                          </span>
                        )}
                        <span style={{ fontSize: "1.75rem", fontWeight: 600, color: "var(--cim-fg-base, #15191d)", lineHeight: "36px" }}>
                          {totalDue.toFixed(2)} USD
                        </span>
                      </div>
                      {hasDiscount && (
                        <span style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--cim-fg-success, #007e3f)" }}>
                          Total discount of {(originalTotalDue - totalDue).toFixed(2)} USD
                        </span>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Info banner — "Need more than 10% discount? Use price override" */}
              <div style={{
                background: "white",
                border: "1px solid var(--cim-border-base, #dadcdd)",
                borderRadius: "8px",
                padding: "9px 13px",
                display: "flex",
                alignItems: "center",
                gap: "16px",
              }}>
                <span style={{ display: "flex", flexShrink: 0, color: "var(--cim-fg-base, #15191d)" }}><IconInfoCircle /></span>
                <span style={{ flex: 1, fontSize: "0.875rem", color: "var(--cim-fg-base, #15191d)", lineHeight: "20px" }}>
                  Need more than 10% discount ? Use price override
                </span>
                <Button
                  variant="tertiary"
                  size="medium"
                  onPress={() => setIsPriceOverrideOpen(true)}
                >
                  Create price override
                </Button>
              </div>

            </div>
          </div>

        </div>

        {/* Remove Accessories Confirmation Modal */}
        {isRemoveAccessoriesConfirmOpen && (
          <ModalDialog
            title="Remove accessories"
            size="small"
            isOpen
            onOpenChange={(open) => { if (!open) setIsRemoveAccessoriesConfirmOpen(false); }}
          >
            <ModalDialogBody>
              <p style={{ margin: 0, fontSize: "1rem", color: "var(--cim-fg-base, #15191d)", lineHeight: "24px" }}>
                Are you sure you want to remove all {addedAccessories.length} accessory item{addedAccessories.length !== 1 ? "s" : ""} from this order?
              </p>
            </ModalDialogBody>
            <ModalDialogActions>
              <Button variant="secondary" onPress={() => setIsRemoveAccessoriesConfirmOpen(false)}>Cancel</Button>
              <Button
                tone="critical"
                onPress={() => {
                  setAddedAccessories([]);
                  setIsAccessoriesExpanded(false);
                  setIsRemoveAccessoriesConfirmOpen(false);
                }}
              >
                Remove accessories
              </Button>
            </ModalDialogActions>
          </ModalDialog>
        )}

        {/* Edit Applied Charges Modal */}
        {isEditChargesOpen && (() => {
          // Only show charges that haven't already been saved as waived
          const allCharges = (product.extraCharges ?? []).filter((c) => !savedWaivedChargeIds.includes(c.id));
          const allWaived = allCharges.length > 0 && allCharges.every((c) => modalWaivedIds.includes(c.id));
          const someWaived = !allWaived && allCharges.some((c) => modalWaivedIds.includes(c.id));
          const waivedTotal = parseFloat(allCharges.filter((c) => modalWaivedIds.includes(c.id)).reduce((sum, c) => sum + c.unitPrice, 0).toFixed(2));
          const currentTotal = parseFloat((basePrice - discountAmount + extraChargesTotal + accessoriesTotal).toFixed(2));
          const newTotal = parseFloat((currentTotal + waivedChargesTotal - waivedTotal).toFixed(2));
          const savings = parseFloat((waivedTotal - waivedChargesTotal).toFixed(2));
          const hasChange = waivedTotal !== waivedChargesTotal;
          return (
            <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "64px" }}>
              <div style={{ background: "white", borderRadius: "8px", width: "min(100%, 864px)", maxHeight: "calc(100vh - 128px)", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0px 2px 8px rgba(0,0,0,0.12), 0px 8px 16px rgba(0,0,0,0.11), 0px 16px 24px rgba(0,0,0,0.10), 0px 16px 32px rgba(0,0,0,0.09), 0px 24px 48px rgba(0,0,0,0.08)" }}>
                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "24px 24px 16px", borderBottom: "1px solid var(--cim-border-base, #dadcdd)" }}>
                  <span style={{ fontSize: "1.125rem", fontWeight: 600, color: "var(--cim-fg-base, #15191d)" }}>Edit applied charges</span>
                  <button onClick={() => setIsEditChargesOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--cim-fg-base, #15191d)", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, width: "32px", height: "32px", borderRadius: "4px" }}>
                    <IconCloseBold size={16} />
                  </button>
                </div>
                {/* Body */}
                <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "0 16px" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "24px", padding: "16px 0" }}>
                    {/* Checkboxes */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px", padding: "16px", borderRadius: "6px" }}>
                      <Checkbox
                        isIndeterminate={someWaived}
                        isSelected={allWaived}
                        onChange={(checked) => {
                          setModalWaivedIds(checked ? allCharges.map((c) => c.id) : []);
                        }}
                      >
                        Select all charges
                      </Checkbox>
                      {allCharges.map((charge) => (
                        <Checkbox
                          key={charge.id}
                          isSelected={modalWaivedIds.includes(charge.id)}
                          onChange={(checked) => {
                            setModalWaivedIds((prev) =>
                              checked ? [...prev, charge.id] : prev.filter((id) => id !== charge.id)
                            );
                          }}
                        >
                          {charge.label} ({charge.unitPrice.toFixed(2)} USD)
                        </Checkbox>
                      ))}
                    </div>
                    {/* Reason */}
                    <Select
                      label="Reason for waiving charge"
                      isRequired
                      selectedKey={waiveReason || null}
                      onSelectionChange={(key) => setWaiveReason(String(key))}
                      placeholder="Select a reason..."
                    >
                      <SelectItem id="customer-goodwill">Customer goodwill gesture</SelectItem>
                      <SelectItem id="billing-error">Billing error correction</SelectItem>
                      <SelectItem id="service-failure">Service failure compensation</SelectItem>
                      <SelectItem id="loyalty-exception">Loyalty exception</SelectItem>
                      <SelectItem id="manager-approval">Manager approved waiver</SelectItem>
                      <SelectItem id="promotional">Promotional offer</SelectItem>
                    </Select>
                  </div>
                </div>
                {/* Footer */}
                <div style={{ borderTop: "1px solid var(--cim-border-base, #dadcdd)", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                    <span style={{ fontSize: "0.75rem", color: "var(--cim-fg-muted, #94979b)" }}>new item total</span>
                    {hasChange ? (
                      <>
                        <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
                          <span style={{ fontSize: "1rem", color: "var(--cim-fg-subtle, #5f6469)", textDecoration: "line-through" }}>{currentTotal.toFixed(2)} USD</span>
                          <span style={{ fontSize: "1.125rem", fontWeight: 600, color: "var(--cim-fg-base, #15191d)" }}>{newTotal.toFixed(2)} USD</span>
                        </div>
                        {savings > 0 && (
                          <span style={{ fontSize: "0.75rem", color: "var(--cim-fg-success, #007e3f)" }}>{savings.toFixed(2)} USD in savings due to certain charges being waived</span>
                        )}
                      </>
                    ) : (
                      <>
                        <span style={{ fontSize: "1.125rem", fontWeight: 600, color: "var(--cim-fg-muted, #94979b)" }}>{currentTotal.toFixed(2)} USD</span>
                        <span style={{ fontSize: "0.75rem", color: "var(--cim-fg-muted, #94979b)" }}>No changes selected</span>
                      </>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: "16px", flexShrink: 0 }}>
                    <Button variant="secondary" onPress={() => setIsEditChargesOpen(false)}>Cancel</Button>
                    <Button
                      isDisabled={!waiveReason.trim()}
                      onPress={() => {
                        setSavedWaivedChargeIds(modalWaivedIds);
                        setSavedWaiveReason(waiveReason);
                        setIsEditChargesOpen(false);
                      }}
                    >
                      Confirm
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Price Override Modal */}
        {isPriceOverrideOpen && (() => {
          const overrideParsed = priceOverrideUnitPrice !== "" ? parseFloat(priceOverrideUnitPrice) : NaN;
          const overrideValid = !isNaN(overrideParsed) && overrideParsed >= 0;
          const modalQtyParsed = priceOverrideQty !== "" ? parseInt(priceOverrideQty, 10) : quantity;
          const modalQty = !isNaN(modalQtyParsed) && modalQtyParsed > 0 ? modalQtyParsed : quantity;
          const modalOrigBase = basePrice; // always fixed: original qty × original unit price
          const modalNewBase = overrideValid ? parseFloat((overrideParsed * modalQty).toFixed(2)) : modalOrigBase;
          const modalDiscount = overrideValid ? parseFloat((modalOrigBase - modalNewBase).toFixed(2)) : 0;
          const hasModalCustomization = overrideValid && (overrideParsed !== unitPrice || modalQty !== quantity);
          const fieldRow: React.CSSProperties = { display: "flex", gap: "8px", alignItems: "flex-end", width: "100%" };
          const eqSign: React.CSSProperties = { fontSize: "0.75rem", color: "var(--cim-fg-success, #007e3f)", alignSelf: "stretch", display: "flex", alignItems: "center", flexShrink: 0, paddingBottom: "8px" };
          return (
            <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "64px" }}>
              <div style={{ background: "white", borderRadius: "8px", width: "min(100%, 864px)", maxHeight: "calc(100vh - 128px)", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0px 2px 8px rgba(0,0,0,0.12), 0px 8px 16px rgba(0,0,0,0.11), 0px 16px 24px rgba(0,0,0,0.10), 0px 16px 32px rgba(0,0,0,0.09), 0px 24px 48px rgba(0,0,0,0.08)" }}>
                {/* Header */}
                <div style={{ borderBottom: "1px solid var(--cim-border-base, #dadcdd)" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px 16px" }}>
                    <span style={{ fontSize: "1.125rem", fontWeight: 600, color: "var(--cim-fg-base, #15191d)" }}>Apply price override</span>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <button
                        onClick={() => { setPriceOverrideUnitPrice(""); setPriceOverrideItemPriceInput(""); setPriceOverrideReason(""); setPriceOverrideAccessoryPrices({}); setPriceOverrideAccessoryItemPrices({}); setPriceOverrideChargePrices({}); }}
                        style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.875rem", color: "var(--cim-fg-accent, #007798)", textDecoration: "underline", padding: 0 }}
                      >
                        Clear all
                      </button>
                      <button onClick={() => setIsPriceOverrideOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--cim-fg-base, #15191d)", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, width: "32px", height: "32px", borderRadius: "4px" }}>
                        <IconCloseBold size={16} />
                      </button>
                    </div>
                  </div>
                  {/* Amber warning — only shown when a discount is currently active */}
                  {(pctBasedInput || savedOfferDiscountPct > 0) && (
                    <div style={{ padding: "0 24px 16px" }}>
                      <span style={{ fontSize: "0.875rem", color: "var(--cim-fg-warning, #a15e0c)", lineHeight: "20px" }}>
                        Price override will remove any previous discounts and require a approval workflow
                      </span>
                    </div>
                  )}
                </div>
                {/* Body */}
                <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "0 24px" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px", padding: "16px 0" }}>

                    {/* ── Main item card ── */}
                    {(() => {
                      const itemPrice = overrideValid ? modalNewBase : basePrice;
                      const itemDiscount = overrideValid ? Math.max(0, modalDiscount) : 0;
                      return (
                        <div style={{ border: "1px solid var(--cim-border-base, #dadcdd)", borderRadius: "6px", padding: "16px" }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <span style={{ fontWeight: 600, fontSize: "1rem", color: "var(--cim-fg-base, #15191d)" }}>{product.name}</span>
                              <span style={{ fontSize: "0.75rem", color: "var(--cim-fg-subtle, #5f6469)" }}>(Main item)</span>
                            </div>
                            <button onClick={() => { setPriceOverrideUnitPrice(""); setPriceOverrideItemPriceInput(""); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.875rem", color: "var(--cim-fg-accent, #007798)", textDecoration: "underline", padding: 0 }}>Clear</button>
                          </div>
                          <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
                            <div style={{ width: "64px", height: "64px", borderRadius: "4px", overflow: "hidden", background: "var(--cim-bg-subtle, #f8f9fa)", flexShrink: 0, border: "1px solid var(--cim-border-base, #dadcdd)" }}>
                              {product.imageUrl && <img src={product.imageUrl} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                            </div>
                            <div style={{ flex: 1 }}>
                              <p style={{ margin: "0 0 4px", fontSize: "0.875rem", color: "var(--cim-fg-base, #15191d)" }}>Original price: {basePrice.toFixed(2)} USD</p>
                              <p style={{ margin: "0 0 16px", fontSize: "0.875rem", color: "var(--cim-fg-subtle, #5f6469)" }}>({quantity} x {unitPrice.toFixed(2)}/unit)</p>
                              <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr 1fr", gap: "8px", alignItems: "end" }}>
                                <TextField
                                  label="Discounted unit price"
                                  value={priceOverrideUnitPrice}
                                  onChange={(val) => {
                                    setPriceOverrideUnitPrice(val);
                                    // Sync → item price
                                    const p = parseFloat(val);
                                    setPriceOverrideItemPriceInput(!isNaN(p) ? (p * modalQty).toFixed(2) : "");
                                  }}
                                  type="number"
                                />
                                <span style={eqSign}>=</span>
                                <TextField
                                  label="Discounted item price"
                                  value={priceOverrideItemPriceInput !== "" ? priceOverrideItemPriceInput : itemPrice.toFixed(2)}
                                  prefix="USD"
                                  onChange={(val) => {
                                    setPriceOverrideItemPriceInput(val);
                                    // Sync → unit price
                                    const p = parseFloat(val);
                                    setPriceOverrideUnitPrice((!isNaN(p) && modalQty > 0) ? (p / modalQty).toFixed(4) : "");
                                  }}
                                />
                                <TextField
                                  label="Discount"
                                  value={itemDiscount.toFixed(2)}
                                  prefix="USD"
                                  isReadOnly
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* ── Accessory cards ── */}
                    {addedAccessories.map((acc) => {
                      const accCatalog = MOCK_ACCESSORIES.find((m) => m.id === acc.id);
                      const accInputPrice = priceOverrideAccessoryPrices[acc.id] ?? "";
                      const accParsed = accInputPrice !== "" ? parseFloat(accInputPrice) : NaN;
                      const accValid = !isNaN(accParsed) && accParsed >= 0;
                      const accOrigPackaged = parseFloat((acc.unitPrice * acc.quantity).toFixed(2));
                      const accPackaged = accValid ? parseFloat((accParsed * acc.quantity).toFixed(2)) : accOrigPackaged;
                      const accDiscount = accValid ? Math.max(0, parseFloat((accOrigPackaged - accPackaged).toFixed(2))) : 0;
                      return (
                        <div key={acc.id} style={{ border: "1px solid var(--cim-border-base, #dadcdd)", borderRadius: "6px", padding: "16px" }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <span style={{ fontWeight: 600, fontSize: "1rem", color: "var(--cim-fg-base, #15191d)" }}>{acc.label}</span>
                              <span style={{ fontSize: "0.75rem", color: "var(--cim-fg-subtle, #5f6469)" }}>(Accessory)</span>
                            </div>
                            <button onClick={() => { setPriceOverrideAccessoryPrices((prev) => ({ ...prev, [acc.id]: "" })); setPriceOverrideAccessoryItemPrices((prev) => ({ ...prev, [acc.id]: "" })); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.875rem", color: "var(--cim-fg-accent, #007798)", textDecoration: "underline", padding: 0 }}>Clear</button>
                          </div>
                          <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
                            <div style={{ width: "64px", height: "64px", borderRadius: "4px", overflow: "hidden", background: "var(--cim-bg-subtle, #f8f9fa)", flexShrink: 0, border: "1px solid var(--cim-border-base, #dadcdd)" }}>
                              {accCatalog?.imageUrl && <img src={accCatalog.imageUrl} alt={acc.label} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                            </div>
                            <div style={{ flex: 1 }}>
                              <p style={{ margin: "0 0 4px", fontSize: "0.875rem", color: "var(--cim-fg-base, #15191d)" }}>Original price: {accOrigPackaged.toFixed(2)} USD</p>
                              <p style={{ margin: "0 0 16px", fontSize: "0.875rem", color: "var(--cim-fg-subtle, #5f6469)" }}>({acc.quantity} x {acc.unitPrice.toFixed(2)}/unit)</p>
                              <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr 1fr", gap: "8px", alignItems: "end" }}>
                                <TextField
                                  label="Discounted unit price"
                                  value={accInputPrice}
                                  onChange={(val) => {
                                    setPriceOverrideAccessoryPrices((prev) => ({ ...prev, [acc.id]: val }));
                                    // Sync → item price
                                    const p = parseFloat(val);
                                    setPriceOverrideAccessoryItemPrices((prev) => ({ ...prev, [acc.id]: !isNaN(p) ? (p * acc.quantity).toFixed(2) : "" }));
                                  }}
                                  type="number"
                                />
                                <span style={eqSign}>=</span>
                                <TextField
                                  label="Discounted item price"
                                  value={(priceOverrideAccessoryItemPrices[acc.id] !== undefined && priceOverrideAccessoryItemPrices[acc.id] !== "") ? priceOverrideAccessoryItemPrices[acc.id] : accPackaged.toFixed(2)}
                                  prefix="USD"
                                  onChange={(val) => {
                                    setPriceOverrideAccessoryItemPrices((prev) => ({ ...prev, [acc.id]: val }));
                                    // Sync → unit price
                                    const p = parseFloat(val);
                                    setPriceOverrideAccessoryPrices((prev) => ({ ...prev, [acc.id]: (!isNaN(p) && acc.quantity > 0) ? (p / acc.quantity).toFixed(4) : "" }));
                                  }}
                                />
                                <TextField label="Discount" value={accDiscount.toFixed(2)} prefix="USD" isReadOnly />
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* ── Extra charge cards ── */}
                    {allExtraCharges.filter((c) => !savedWaivedChargeIds.includes(c.id)).map((charge) => {
                      const chargeInput = priceOverrideChargePrices[charge.id] ?? "";
                      const chargeParsed = chargeInput !== "" ? parseFloat(chargeInput) : NaN;
                      const chargeValid = !isNaN(chargeParsed) && chargeParsed >= 0;
                      const chargeDiscount = chargeValid ? Math.max(0, parseFloat((charge.unitPrice - chargeParsed).toFixed(2))) : 0;
                      return (
                        <div key={charge.id} style={{ border: "1px solid var(--cim-border-base, #dadcdd)", borderRadius: "6px", padding: "16px" }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <span style={{ fontWeight: 600, fontSize: "1rem", color: "var(--cim-fg-base, #15191d)" }}>{charge.label}</span>
                              <span style={{ fontSize: "0.75rem", color: "var(--cim-fg-subtle, #5f6469)" }}>(Extra charges)</span>
                            </div>
                            <button onClick={() => setPriceOverrideChargePrices((prev) => ({ ...prev, [charge.id]: "" }))} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.875rem", color: "var(--cim-fg-accent, #007798)", textDecoration: "underline", padding: 0 }}>Clear</button>
                          </div>
                          <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
                            <div style={{ width: "64px", height: "64px", borderRadius: "4px", overflow: "hidden", background: "var(--cim-bg-subtle, #f8f9fa)", flexShrink: 0, border: "1px solid var(--cim-border-base, #dadcdd)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <span style={{ fontSize: "1.5rem" }}>🏷️</span>
                            </div>
                            <div style={{ flex: 1 }}>
                              <p style={{ margin: "0 0 16px", fontSize: "0.875rem", color: "var(--cim-fg-base, #15191d)" }}>Original price: {charge.unitPrice.toFixed(2)} USD</p>
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", alignItems: "end" }}>
                                <TextField
                                  label="Discounted price"
                                  value={chargeInput}
                                  onChange={(val) => setPriceOverrideChargePrices((prev) => ({ ...prev, [charge.id]: val }))}
                                  prefix="USD"
                                  type="number"
                                />
                                <TextField label="Discount" value={chargeDiscount.toFixed(2)} prefix="USD" isReadOnly />
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* ── Reason ── */}
                    <Select
                      label="Select reason for offer customization"
                      isRequired
                      selectedKey={priceOverrideReason || null}
                      onSelectionChange={(key) => setPriceOverrideReason(String(key))}
                      placeholder="Select an item"
                    >
                      <SelectItem id="customer-loyalty">Customer loyalty discount</SelectItem>
                      <SelectItem id="volume-discount">Volume discount</SelectItem>
                      <SelectItem id="competitive-match">Competitive price match</SelectItem>
                      <SelectItem id="promotional">Promotional pricing</SelectItem>
                      <SelectItem id="executive-approval">Executive approval</SelectItem>
                      <SelectItem id="error-correction">Error correction</SelectItem>
                    </Select>

                    {/* ── Internal notes ── */}
                    {(() => {
                      const accNotesLines = addedAccessories.map((acc) => {
                        const accInput = priceOverrideAccessoryPrices[acc.id] ?? "";
                        const accParsed = parseFloat(accInput);
                        const newPkg = !isNaN(accParsed) ? (accParsed * acc.quantity).toFixed(2) : (acc.unitPrice * acc.quantity).toFixed(2);
                        return `${acc.label}: ${acc.quantity} * $${(acc.unitPrice * acc.quantity).toFixed(2)} and New package price $${newPkg}`;
                      });
                      const chargeLines = allExtraCharges.filter((c) => !savedWaivedChargeIds.includes(c.id)).map((c) => {
                        const cInput = priceOverrideChargePrices[c.id] ?? "";
                        const cParsed = parseFloat(cInput);
                        const newPkg = !isNaN(cParsed) ? cParsed.toFixed(2) : c.unitPrice.toFixed(2);
                        return `${c.label}: 1 * $${c.unitPrice.toFixed(2)} and New package price $${newPkg}`;
                      });
                      const mainNewPkg = overrideValid ? modalNewBase.toFixed(2) : basePrice.toFixed(2);
                      const totalOverride = parseFloat((
                        (overrideValid ? modalNewBase : basePrice)
                        + addedAccessories.reduce((s, acc) => {
                          const p = parseFloat(priceOverrideAccessoryPrices[acc.id] ?? "");
                          return s + (!isNaN(p) ? p * acc.quantity : acc.unitPrice * acc.quantity);
                        }, 0)
                        + allExtraCharges.filter((c) => !savedWaivedChargeIds.includes(c.id)).reduce((s, c) => {
                          const p = parseFloat(priceOverrideChargePrices[c.id] ?? "");
                          return s + (!isNaN(p) ? p : c.unitPrice);
                        }, 0)
                      ).toFixed(2));
                      const notesText = [
                        `Reason for price query:`,
                        `Supervisor Approved:`,
                        `Quote ID:`,
                        `Main Item Qty & Package Price:`,
                        `${quantity} * $${basePrice.toFixed(2)} and New package price $${mainNewPkg}`,
                        ...(addedAccessories.length > 0 ? [`Accessories Qty & Package Price:`, ...accNotesLines] : []),
                        ...(chargeLines.length > 0 ? [`Fixed Charges:`, ...chargeLines] : []),
                        `Shipping:`,
                        `Item Total (excluding shipping and tax):`,
                        `${totalOverride.toFixed(2)} USD`,
                      ].join("\n");
                      return (
                        <Disclosure title="Internal notes">
                          <pre style={{ margin: "0", fontSize: "0.8125rem", color: "var(--cim-fg-base, #15191d)", lineHeight: "20px", whiteSpace: "pre-wrap", fontFamily: "inherit" }}>
                            {notesText}
                          </pre>
                        </Disclosure>
                      );
                    })()}

                  </div>
                </div>
                {/* Footer */}
                {(() => {
                  const footerNew = parseFloat((
                    (overrideValid ? modalNewBase : basePrice)
                    + addedAccessories.reduce((s, acc) => {
                      const p = parseFloat(priceOverrideAccessoryPrices[acc.id] ?? "");
                      return s + (!isNaN(p) ? p * acc.quantity : acc.unitPrice * acc.quantity);
                    }, 0)
                    + allExtraCharges.filter((c) => !savedWaivedChargeIds.includes(c.id)).reduce((s, c) => {
                      const p = parseFloat(priceOverrideChargePrices[c.id] ?? "");
                      return s + (!isNaN(p) ? p : c.unitPrice);
                    }, 0)
                  ).toFixed(2));
                  // Always compare against TRUE catalog prices — not previously-saved overrides or pct discounts
                  const footerOrig = parseFloat((
                    unitPrice * quantity
                    + addedAccessories.reduce((s, a) => s + a.unitPrice * a.quantity, 0)
                    + allExtraCharges.filter((c) => !savedWaivedChargeIds.includes(c.id)).reduce((s, c) => s + c.unitPrice, 0)
                  ).toFixed(2));
                  const footerDiscount = parseFloat((footerOrig - footerNew).toFixed(2));
                  const canConfirm = overrideValid && priceOverrideReason.trim();
                  return (
                    <div style={{ borderTop: "1px solid var(--cim-border-base, #dadcdd)", padding: "16px 24px" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                          <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
                            <span style={{ fontSize: "1.125rem", fontWeight: 600, color: "var(--cim-fg-base, #15191d)" }}>{footerNew.toFixed(2)} USD</span>
                            <span style={{ fontSize: "0.75rem", color: "var(--cim-fg-subtle, #5f6469)" }}>(Exc tax)</span>
                          </div>
                          {footerDiscount > 0 && (
                            <span style={{ fontSize: "0.875rem", color: "var(--cim-fg-success, #007e3f)" }}>Total discount of {footerDiscount.toFixed(2)} USD</span>
                          )}
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "8px" }}>
                          <div style={{ display: "flex", gap: "12px" }}>
                            <Button variant="secondary" onPress={() => setIsPriceOverrideOpen(false)}>Cancel</Button>
                            <Button
                              variant="primary"
                              isDisabled={!canConfirm}
                              onPress={() => {
                                setSavedPriceOverrideUnitPrice(overrideParsed);
                                const newAccPrices: Record<string, number> = {};
                                addedAccessories.forEach((a) => {
                                  const p = parseFloat(priceOverrideAccessoryPrices[a.id] ?? "");
                                  if (!isNaN(p) && p >= 0) newAccPrices[a.id] = p;
                                });
                                setSavedAccessoryOverridePrices(newAccPrices);
                                setSavedOfferDiscountPct(0);
                                setOfferDiscountPct(0);
                                setPctBasedInput("");
                                setNewPriceInput("");
                                setNewUnitPriceInput("");
                                setSavedNewPriceInput("");
                                setOverrideReason("");
                                setIsPriceOverrideOpen(false);
                                // Copy internal notes to clipboard
                                const mainNewPkg = overrideValid ? modalNewBase.toFixed(2) : basePrice.toFixed(2);
                                const notes = [
                                  `Reason for price query:`,
                                  `Supervisor Approved:`,
                                  `Quote ID:`,
                                  `Main Item Qty & Package Price:`,
                                  `${quantity} * $${basePrice.toFixed(2)} and New package price $${mainNewPkg}`,
                                  ...addedAccessories.map((acc) => {
                                    const p = parseFloat(priceOverrideAccessoryPrices[acc.id] ?? "");
                                    const newPkg = !isNaN(p) ? (p * acc.quantity).toFixed(2) : (acc.unitPrice * acc.quantity).toFixed(2);
                                    return `${acc.label}: ${acc.quantity} * $${(acc.unitPrice * acc.quantity).toFixed(2)} and New package price $${newPkg}`;
                                  }),
                                  ...allExtraCharges.filter((c) => !savedWaivedChargeIds.includes(c.id)).map((c) => {
                                    const p = parseFloat(priceOverrideChargePrices[c.id] ?? "");
                                    return `${c.label}: 1 * $${c.unitPrice.toFixed(2)} and New package price $${!isNaN(p) ? p.toFixed(2) : c.unitPrice.toFixed(2)}`;
                                  }),
                                  `Shipping:`,
                                  `Item Total (excluding shipping and tax):`,
                                  `${footerNew.toFixed(2)} USD`,
                                ].join("\n");
                                navigator.clipboard?.writeText(notes).catch(() => {});
                              }}
                            >
                              Confirm discount
                            </Button>
                          </div>
                          <span style={{ fontSize: "0.75rem", color: "var(--cim-fg-subtle, #5f6469)" }}>Confirming will copy the notes to your clipboard</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          );
        })()}

        {isArtworkModalOpen && (
          <PreviousArtworkModal
            onConfirm={(artwork) => {
              setArtworkFileName(artwork.name);
              setArtworkThumbnailUrl(artwork.thumbnailUrl);
              setIsArtworkModalOpen(false);
            }}
            onCancel={() => {
              setArtworkOption(null);
              setArtworkFileName("");
              setArtworkThumbnailUrl("");
              setIsArtworkModalOpen(false);
            }}
          />
        )}
      </>
    );
  }
);

ItemConfigurationCard.displayName = "ItemConfigurationCard";
