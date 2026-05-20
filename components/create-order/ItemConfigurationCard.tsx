"use client";

import { useState, useEffect, forwardRef, useImperativeHandle, useRef, useCallback } from "react";
import { Button, Select, SelectItem, TextField, Disclosure, Badge, Tooltip, RadioGroup, Radio } from "@cimpress-ui/react";
import { IconChevronDownBold } from "@cimpress-ui/react/icons";
import { IconInfoCircle, IconCheckCircleFill, IconChevronDown, IconTrash } from "@cimpress-ui/react/icons";
import type { ProductCatalogItem, DraftOrderItem, DraftOrderItemAttribute, QuantityPricingTier } from "@/lib/types";
import { resolvePricingTier as resolveTier, computeIncrementRanges, generateGuideQuantities } from "@/lib/pricingUtils";
import { PreviousArtworkModal } from "./PreviousArtworkModal";
import { AccessoryCard, MOCK_ACCESSORIES } from "./AddAccessoryModal";

const TAB_LABELS = [
  "Attributes",
  "Quantity",
  "Artwork",
  "Extra charges",
  "Add-ons",
  "Item price",
] as const;
type TabLabel = (typeof TAB_LABELS)[number];

export interface PriceBreakdown {
  quantity: number;
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
  subtotal: number;
  taxRate: number;
  tax: number;
  totalDue: number;
}

interface ItemConfigurationCardProps {
  product: ProductCatalogItem;
  initialValues?: DraftOrderItem;
  onAddToOrder: (item: DraftOrderItem) => void;
  onLineTotalChange?: (total: number) => void;
  onValidityChange?: (isValid: boolean) => void;
  onPriceBreakdownChange?: (breakdown: PriceBreakdown) => void;
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
  onRemove,
  onChanges,
}: {
  fileName: string;
  onRemove: () => void;
  onChanges?: () => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {/* Thumbnail */}
      <div style={{
        width: "187px",
        height: "187px",
        borderRadius: "6px",
        overflow: "hidden",
        background: "var(--cim-bg-subtle, #f8f9fa)",
      }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=300&h=300&fit=crop"
          alt={fileName}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </div>
      {/* Actions row */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <Button tone="critical" size="small" onPress={onRemove}>
          Remove artwork
        </Button>
        {onChanges && (
          <Button variant="secondary" size="small" onPress={onChanges}>
            Change artwork
          </Button>
        )}
        <span style={{
          fontSize: "0.875rem",
          color: "var(--cim-fg-base, #15191d)",
          flex: 1,
          minWidth: 0,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}>
          {fileName}
        </span>
      </div>
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
  ({ product, initialValues, onAddToOrder, onLineTotalChange, onValidityChange, onPriceBreakdownChange }, ref) => {
    const [activeTab, setActiveTab] = useState<TabLabel>("Attributes");

    const attributesRef = useRef<HTMLDivElement>(null);
    const quantityRef = useRef<HTMLDivElement>(null);
    const artworkRef = useRef<HTMLDivElement>(null);
    const extraChargesRef = useRef<HTMLDivElement>(null);
    const addOnsRef = useRef<HTMLDivElement>(null);
    const itemPriceRef = useRef<HTMLDivElement>(null);
    const customiseOfferRef = useRef<HTMLDivElement>(null);

    const sectionRefs: Record<TabLabel, React.RefObject<HTMLDivElement | null>> = {
      Attributes: attributesRef,
      Quantity: quantityRef,
      Artwork: artworkRef,
      "Extra charges": extraChargesRef,
      "Add-ons": addOnsRef,
      "Item price": itemPriceRef,
    };

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
    const initDiscount = initialValues?.itemDiscount ?? 0;
    const [newPriceInput, setNewPriceInput] = useState<string>("");
    const [pctBasedInput, setPctBasedInput] = useState<string>(initDiscount > 0 ? String(initDiscount) : "");
    const [overrideReason, setOverrideReason] = useState<string>("");
    const [offerDiscountPct, setOfferDiscountPct] = useState<number>(initDiscount);
    const [activeOfferType, setActiveOfferType] = useState<"pct" | "price">("pct");
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
    const extraChargesTotal = parseFloat(((selectedCharge?.unitPrice ?? 0) + artworkCharge).toFixed(2));
    const chargesApplied = (selectedCharge ? 1 : 0) + (artworkOption !== null ? 1 : 0);
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
    const discountAmount = priceOverrideDiscountAmount > 0
      ? priceOverrideDiscountAmount
      : (savedNewPriceValid && savedNewPriceInput !== ""
        ? parseFloat((basePrice - savedNewPriceParsed).toFixed(2))
        : (savedOfferDiscountPct > 0 ? parseFloat((basePrice * savedOfferDiscountPct / 100).toFixed(2)) : 0));
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
      onPriceBreakdownChange?.({
        quantity,
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
        subtotal,
        taxRate,
        tax,
        totalDue,
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [totalDue, onLineTotalChange, onPriceBreakdownChange]);

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
      setSavedNewPriceInput("");
      setActiveOfferType("pct");
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

    function scrollToSection(tab: TabLabel) {
      setActiveTab(tab);
      sectionRefs[tab].current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    function handleAttributeChange(attributeId: string, selectedOptionId: string) {
      setSelectedAttributes((prev) =>
        prev.map((a) => (a.attributeId === attributeId ? { ...a, selectedOptionId } : a))
      );
    }

    const visibleTabs = TAB_LABELS.filter((tab) => {
      if (tab === "Attributes" && product.attributes.length === 0) return false;
      if (tab === "Extra charges") return false;
      if (tab === "Add-ons" && product.category === "Apparel") return false;
      return true;
    });

    return (
      <div style={{ background: "white", border: "1px solid var(--cim-border-base, #dadcdd)", borderRadius: "6px", overflow: "hidden" }}>
        {/* Tab bar */}
        <div style={{ borderBottom: "1px solid var(--cim-border-base, #dadcdd)", display: "flex", alignItems: "center", padding: "0 8px", overflowX: "auto" }}>
          {visibleTabs.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => scrollToSection(tab)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: "48px",
                  padding: "0 4px",
                  marginRight: "16px",
                  border: "none",
                  borderBottom: isActive ? "2px solid var(--cim-border-accent, #0091b8)" : "2px solid transparent",
                  cursor: "pointer",
                  background: "none",
                  flexShrink: 0,
                  outline: "none",
                }}
              >
                <span style={{
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  color: isActive ? "var(--cim-fg-accent, #007798)" : "var(--cim-fg-base, #15191d)",
                  whiteSpace: "nowrap",
                }}>
                  {tab}
                </span>
              </button>
            );
          })}
        </div>

        {/* Scrollable content */}
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
                    Clear all selections
                  </button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {product.attributes.map((attr) => {
                    const currentVal = selectedAttributes.find((a) => a.attributeId === attr.id)?.selectedOptionId ?? "";
                    if (attr.type === "color") {
                      return (
                        <div key={attr.id} style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                          <span style={{ fontSize: "0.875rem", color: "var(--cim-fg-base, #15191d)" }}>
                            {attr.label}<span style={{ color: "var(--cim-fg-critical, #d10023)", marginLeft: "2px" }}>*</span>
                          </span>
                          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                            {attr.options.map((opt) => {
                              const isSelected = currentVal === opt.id;
                              return (
                                <SwatchButton
                                  key={opt.id}
                                  label={opt.label}
                                  hexColor={opt.hexColor ?? "#ccc"}
                                  isSelected={isSelected}
                                  onClick={() => handleAttributeChange(attr.id, opt.id)}
                                />
                              );
                            })}
                          </div>
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
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxWidth: "420px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Select
                        label="Select Quantity"
                        selectedKey={quantityInput || null}
                        isRequired
                        onSelectionChange={(val) => {
                          const n = Number(val);
                          setQuantityInput(n > 0 ? String(n) : "");
                          if (n > 0) handleQuantityChange(n);
                        }}
                        description={`Quantity has to be between ${product.minOrderQty} - ${product.maxOrderQty}`}
                      >
                        {allGuideRows.map((row) => {
                          const outOfStock = effectiveStock !== undefined && row.qty > effectiveStock;
                          return (
                            <SelectItem key={String(row.qty)} id={String(row.qty)} isDisabled={outOfStock}>
                              {row.qty}{outOfStock ? " (out of stock)" : ""}
                            </SelectItem>
                          );
                        })}
                      </Select>
                    </div>
                    <div style={{ position: "relative", marginTop: "20px", flexShrink: 0 }}>
                      <button
                        ref={qtyInfoBtnRef}
                        aria-label="Quantity increment information"
                        aria-expanded={isQtyInfoOpen}
                        onClick={() => setIsQtyInfoOpen((o) => !o)}
                        onBlur={(e) => {
                          if (!e.currentTarget.parentElement?.contains(e.relatedTarget as Node)) {
                            setIsQtyInfoOpen(false);
                          }
                        }}
                        style={{
                          display: "flex", alignItems: "center", justifyContent: "center",
                          background: "none", border: "none", cursor: "pointer",
                          color: "var(--cim-fg-subtle, #5f6469)", padding: "4px",
                        }}
                      >
                        <IconInfoCircle size={24} />
                      </button>
                      {isQtyInfoOpen && (
                        <div
                          role="tooltip"
                          style={{
                            position: "absolute",
                            top: "calc(100% + 6px)",
                            left: "50%",
                            transform: "translateX(-50%)",
                            background: "var(--cim-bg-inverse, #15191d)",
                            color: "var(--cim-fg-on-dark, #ffffff)",
                            borderRadius: "6px",
                            padding: "10px 14px",
                            fontSize: "0.8125rem",
                            lineHeight: "1.5",
                            whiteSpace: "nowrap",
                            zIndex: 50,
                            boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                            pointerEvents: "none",
                          }}
                        >
                          <p style={{ margin: "0 0 6px", fontWeight: 600, fontSize: "0.75rem", opacity: 0.75, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                            Qty increments
                          </p>
                          {incrementRanges.map((range, i) => (
                            <p key={i} style={{ margin: i < incrementRanges.length - 1 ? "0 0 2px" : "0" }}>
                              {range.from} – {range.to} &nbsp;→&nbsp; every {range.step} units
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
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
              )}

              {/* Pricing guide — hidden for Apparel products */}
              {product.category !== "Apparel" && <div style={{
                display: "flex", flexDirection: "column", gap: "16px",
                width: "100%",
              }}>
                <div style={{
                  border: "1px solid var(--cim-border-subtle, #eaebeb)",
                  borderRadius: "4px",
                  overflow: "hidden",
                  width: "100%",
                }}>
                  <div
                    ref={pricingGuideScrollRef}
                    style={{ maxHeight: "200px", overflowY: "auto", scrollbarWidth: "thin" }}
                  >
                    {sortedTiersAll.map((row) => {
                      const isSelected = pricingGuideSelected === row.qty;
                      const outOfStock = effectiveStock !== undefined && row.qty > effectiveStock;
                      const rowTotal = (row.qty * row.unitPrice).toFixed(2);
                      const fgColor = outOfStock ? "var(--cim-fg-muted, #94979b)" : "var(--cim-fg-base, #15191d)";
                      return (
                        <button
                          key={row.qty}
                          ref={(el) => {
                            if (el) pricingGuideRowRefs.current.set(row.qty, el);
                            else pricingGuideRowRefs.current.delete(row.qty);
                          }}
                          disabled={outOfStock}
                          onClick={() => {
                            if (outOfStock) return;
                            setPricingGuideSelected(row.qty);
                            setQuantityInput(String(row.qty));
                            handleQuantityChange(row.qty);
                          }}
                          style={{
                            display: "flex", alignItems: "center",
                            width: "100%", minHeight: "40px",
                            background: outOfStock ? "var(--cim-bg-subtle, #f8f9fa)" : "white",
                            border: "none",
                            borderBottom: "1px solid var(--cim-border-base, #dadcdd)",
                            cursor: outOfStock ? "not-allowed" : "pointer",
                            padding: 0,
                            textAlign: "left",
                            opacity: outOfStock ? 0.6 : 1,
                          }}
                        >
                          {/* Radio */}
                          <div style={{
                            width: "40px", minHeight: "40px",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            flexShrink: 0,
                          }}>
                            <div style={{
                              width: "16px", height: "16px",
                              borderRadius: "999px",
                              border: isSelected
                                ? "5px solid var(--cim-fg-base, #15191d)"
                                : `1px solid ${outOfStock ? "var(--cim-fg-muted, #94979b)" : "var(--cim-fg-base, #15191d)"}`,
                              background: "white",
                              boxSizing: "border-box",
                              flexShrink: 0,
                            }} />
                          </div>
                          {/* Qty */}
                          <div style={{ flex: 1, padding: "0 12px", minWidth: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ fontSize: "0.875rem", color: fgColor, lineHeight: "20px" }}>
                              {row.qty}
                            </span>
                            {row.recommended && !outOfStock && (
                              <Badge tone="base">Recommended</Badge>
                            )}
                            {outOfStock && (
                              <Badge tone="critical">Out of stock</Badge>
                            )}
                          </div>
                          {/* Total price */}
                          <div style={{ padding: "0 12px", flexShrink: 0 }}>
                            <span style={{ fontSize: "0.875rem", fontWeight: 600, color: fgColor, whiteSpace: "nowrap", lineHeight: "20px" }}>
                              {rowTotal} USD
                            </span>
                          </div>
                          {/* Unit price */}
                          <div style={{ padding: "0 12px", flexShrink: 0 }}>
                            <span style={{ fontSize: "0.75rem", color: outOfStock ? "var(--cim-fg-muted, #94979b)" : "var(--cim-fg-subtle, #5f6469)", whiteSpace: "nowrap", lineHeight: "16px" }}>
                              {row.unitPrice.toFixed(2)} / unit
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>}
            </div>
          </div>

          {/* Item total row */}
          <div style={{ ...sectionCard, flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
              <span style={{ fontSize: "1rem", fontWeight: 600, color: "var(--cim-fg-subtle, #5f6469)" }}>Item total</span>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "2px" }}>
                <span style={{ fontSize: "1.25rem", fontWeight: 600, color: quantityInput ? "var(--cim-fg-base, #15191d)" : "var(--cim-fg-muted, #94979b)" }}>
                  {quantityInput ? `${basePrice.toFixed(2)} USD` : "—"}
                </span>
                {quantityInput && (
                  <span style={{ fontSize: "0.75rem", color: "var(--cim-fg-subtle, #5f6469)" }}>
                    {quantity} x {unitPrice.toFixed(2)} / unit
                  </span>
                )}
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

          {/* Artwork section */}
          <div ref={artworkRef} style={sectionCard}>
            <p style={sectionHeading}>Artwork</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                <input
                  type="radio"
                  name="artworkOption"
                  value="new"
                  checked={artworkOption === "new"}
                  onChange={() => { setArtworkOption("new"); setArtworkFileName(""); }}
                  style={radioInputStyle}
                />
                <span style={{ fontSize: "1rem", color: "var(--cim-fg-base, #15191d)" }}>New artwork</span>
                <span style={{ fontSize: "0.75rem", color: "var(--cim-fg-base, #15191d)" }}>
                  (A extra charge of USD 10.00 will be applicable)
                </span>
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", flexWrap: "wrap" }}>
                <input
                  type="radio"
                  name="artworkOption"
                  value="customise"
                  checked={artworkOption === "customise"}
                  onChange={() => { setArtworkOption("customise"); setIsArtworkModalOpen(true); }}
                  style={radioInputStyle}
                  onClick={() => { if (artworkOption !== "customise") setIsArtworkModalOpen(true); }}
                />
                <span style={{ fontSize: "1rem", color: "var(--cim-fg-base, #15191d)" }}>Customise as before</span>
                <span style={{ fontSize: "0.75rem", color: "var(--cim-fg-subtle, #5f6469)" }}>
                  (A extra charge of USD 10.00 will be applicable)
                </span>
              </label>
            </div>
            {artworkOption === "new" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <span style={{ fontSize: "0.875rem", color: "var(--cim-fg-base, #15191d)" }}>Add new artwork</span>
                  <span style={{ fontSize: "0.875rem", color: "var(--cim-fg-critical, #d10023)" }}>*</span>
                </div>
                {artworkFileName ? (
                  <ArtworkPreview fileName={artworkFileName} onRemove={() => setArtworkFileName("")} />
                ) : (
                  <a
                    href="https://pens.experience.cimpress.io/us/studio/?key=PRD-ZQO1BK4YA&productVersion=4&locale=en-us&selectedOptions=%7B%22Substrate%20Color%22%3A%22%23000000%22%7D&fullBleedElected=true&mpvId=portAuthorityWomensBrickJacketClone&qty=%7b%22S%22%3a0%2c%22M%22%3a0%2c%223XL%22%3a0%2c%22XS%22%3a5%7d"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ textDecoration: "none", display: "inline-flex" }}
                    onClick={() => { waitingForStudio.current = true; }}
                  >
                    <Button variant="secondary" size="small">Add artwork</Button>
                  </a>
                )}
              </div>
            )}
            {artworkOption === "customise" && artworkFileName && (
              <ArtworkPreview
                fileName={artworkFileName}
                onRemove={() => { setArtworkFileName(""); }}
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
            const addedTotal = addedAccessories.reduce((sum, a) => sum + a.quantity * a.unitPrice, 0);
            const visibleAccessories = showAllAccessories ? MOCK_ACCESSORIES : MOCK_ACCESSORIES.slice(0, 3);
            return (
              <div ref={addOnsRef} style={{ position: "relative", border: "1px solid var(--cim-border-base, #dadcdd)", borderRadius: "6px", overflow: "hidden" }}>
                <Disclosure title="Add accessory" variant="subtle" defaultExpanded>
                  <div style={{ display: "flex", flexDirection: "column", gap: "16px", padding: "4px 16px 16px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
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
                    {MOCK_ACCESSORIES.length > 3 && (
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
                {/* Badge overlay — pinned to the right of the 48px disclosure header */}
                {addedCount > 0 && (
                  <div style={{
                    position: "absolute",
                    right: "12px",
                    top: 0,
                    height: "48px",
                    display: "flex",
                    alignItems: "center",
                    pointerEvents: "none",
                  }}>
                    <Badge tone="base">
                      {addedCount} (USD {addedTotal.toFixed(2)})
                    </Badge>
                  </div>
                )}
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
            <p style={sectionHeading}>Apply discount</p>

            <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
              {/* % chips */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15].map((pct) => {
                  const isSelected = pctBasedInput === String(pct);
                  return (
                    <button
                      key={pct}
                      onClick={() => {
                        if (isSelected && pct !== 0) { setPctBasedInput(""); setOfferDiscountPct(0); }
                        else { setPctBasedInput(String(pct)); setOfferDiscountPct(pct); setNewPriceInput(""); }
                      }}
                      style={{
                        background: isSelected ? "var(--cim-bg-accent-subtle, #eaf8fb)" : "white",
                        border: isSelected ? "1px solid var(--cim-border-accent, #0091b8)" : "1px solid var(--cim-border-base, #dadcdd)",
                        borderRadius: "6px",
                        boxShadow: "0px 1px 1px 0px rgba(0,0,0,0.08), 0px 1px 3px 0px rgba(0,0,0,0.04)",
                        padding: "7px 17px",
                        minHeight: "40px",
                        fontSize: "1rem",
                        fontWeight: 600,
                        color: "var(--cim-fg-accent, #007798)",
                        cursor: "pointer",
                      }}
                    >
                      {pct}%
                    </button>
                  );
                })}
              </div>

              {/* Reason for providing discount */}
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <div style={{ display: "flex", gap: "4px", alignItems: "center", fontSize: "0.875rem", lineHeight: "20px" }}>
                  <span style={{ color: "var(--cim-fg-base, #15191d)" }}>Reason for providing discount</span>
                  <span style={{ color: "var(--cim-fg-critical, #d10023)" }}>*</span>
                </div>
                <Select
                  aria-label="Reason for providing discount"
                  selectedKey={overrideReason || null}
                  onSelectionChange={(key) => setOverrideReason(key as string)}
                  placeholder="Select an item"
                >
                  <SelectItem id="loyalty_discount">Loyalty discount</SelectItem>
                  <SelectItem id="bulk_deal">Bulk deal</SelectItem>
                  <SelectItem id="promotional">Promotional offer</SelectItem>
                  <SelectItem id="error_correction">Error correction</SelectItem>
                  <SelectItem id="manager_approval">Manager approval</SelectItem>
                  <SelectItem id="other">Other</SelectItem>
                </Select>
              </div>
            </div>

            {/* Divider + new item total summary */}
            {(() => {
              const hasCustomization = offerDiscountPct > 0;
              const discountedBase = hasCustomization ? basePrice * (1 - offerDiscountPct / 100) : basePrice;
              const newItemPreTax = parseFloat((discountedBase + extraChargesTotal + accessoriesTotal).toFixed(2));
              const baseItemPreTax = parseFloat((basePrice + extraChargesTotal + accessoriesTotal).toFixed(2));
              const savings = hasCustomization ? parseFloat((baseItemPreTax - newItemPreTax).toFixed(2)) : 0;
              return (
                <>
                  <div style={{ height: "1px", background: "var(--cim-border-base, #dadcdd)", margin: "0 -12px" }} />
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                      <span style={{ fontSize: "0.75rem", lineHeight: "16px", color: "var(--cim-fg-muted, #94979b)" }}>new item total</span>
                      {hasCustomization ? (
                        <>
                          <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
                            <span style={{ fontSize: "1rem", lineHeight: "24px", color: "var(--cim-fg-subtle, #5f6469)", textDecoration: "line-through" }}>
                              {baseItemPreTax.toFixed(2)} USD
                            </span>
                            <span style={{ fontSize: "1.125rem", fontWeight: 600, lineHeight: "24px", color: "var(--cim-fg-base, #15191d)" }}>
                              {newItemPreTax.toFixed(2)} USD
                            </span>
                            <span style={{ fontSize: "0.75rem", lineHeight: "16px", color: "var(--cim-fg-base, #15191d)" }}>(exc. tax)</span>
                          </div>
                          <span style={{ fontSize: "0.75rem", lineHeight: "16px", color: "var(--cim-fg-success, #007e3f)" }}>
                            {savings.toFixed(2)} USD saving due to {offerDiscountPct}% discount
                          </span>
                        </>
                      ) : (
                        <>
                          <span style={{ fontSize: "1.125rem", fontWeight: 600, lineHeight: "24px", color: "var(--cim-fg-muted, #94979b)" }}>USD 0.00</span>
                          <span style={{ fontSize: "0.75rem", lineHeight: "16px", color: "var(--cim-fg-muted, #94979b)" }}>No price customization selected</span>
                        </>
                      )}
                    </div>
                    <div style={{ flexShrink: 0 }}>
                      <Button variant="secondary" size="small" isDisabled={!overrideReason || !hasCustomization} onPress={() => {
                        setSavedOfferDiscountPct(offerDiscountPct);
                        setSavedNewPriceInput("");
                      }}>
                        Save changes to price
                      </Button>
                    </div>
                  </div>
                </>
              );
            })()}
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
            <p style={sectionHeading}>Item Price</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>

              {/* Base price */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "1rem", color: "var(--cim-fg-base, #15191d)" }}>
                <span>
                  Price{savedPriceOverrideUnitPrice > 0 && quantity > 0
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

              {/* Customized offer — only shown when a pct discount has been saved (no price override active) */}
              {discountAmount > 0 && priceOverrideDiscountAmount === 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "1rem", color: "var(--cim-fg-base, #15191d)" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    {savedNewPriceValid && savedNewPriceInput !== ""
                      ? "Customized offer (New price)"
                      : `Customized offer (${savedOfferDiscountPct}% Discount)`}
                    <button
                      onClick={() => {
                        setSavedOfferDiscountPct(0);
                        setSavedNewPriceInput("");
                        setOfferDiscountPct(0);
                        setPctBasedInput("");
                        setNewPriceInput("");
                      }}
                      style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: "1rem", color: "var(--cim-fg-accent, #007798)", textDecoration: "underline" }}
                    >
                      Remove
                    </button>
                  </span>
                  <span>- {discountAmount.toFixed(2)} USD</span>
                </div>
              )}

              {/* Selected extra charge — shown as its own direct line */}
              {selectedCharge && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "1rem", color: "var(--cim-fg-base, #15191d)" }}>
                  <span>{selectedCharge.label}</span>
                  <span>{selectedCharge.unitPrice.toFixed(2)} USD</span>
                </div>
              )}

              {/* Total charges applied — collapsible, only shown when at least one charge applies */}
              {chargesApplied > 0 && (
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
                      <button
                        onClick={() => { setSelectedChargeId(null); setArtworkOption(null); setArtworkFileName(""); }}
                        style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: "0.875rem", color: "var(--cim-fg-accent, #007798)", textDecoration: "underline" }}
                      >
                        Remove
                      </button>
                    </span>
                    <span>{extraChargesTotal.toFixed(2)} USD</span>
                  </div>
                  {isChargesExpanded && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "6px", paddingLeft: "12px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem", color: "var(--cim-fg-subtle, #5f6469)" }}>
                        <span>{artworkOption === "customise" ? "Artwork customisation" : "New artwork charge"}</span>
                        <span>10.00 USD</span>
                      </div>
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
                        onClick={() => setAddedAccessories([])}
                        style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: "0.875rem", color: "var(--cim-fg-accent, #007798)", textDecoration: "underline" }}
                      >
                        Remove
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

              {/* Action buttons */}
              <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                <Button variant="secondary" size="small" onPress={() => {
                  if (savedPriceOverrideUnitPrice > 0) setPriceOverrideUnitPrice(savedPriceOverrideUnitPrice.toFixed(2));
                  setPriceOverrideQty(quantity > 0 ? String(quantity) : "");
                  const initAcc: Record<string, string> = {};
                  const initAccQty: Record<string, string> = {};
                  addedAccessories.forEach((a) => {
                    initAcc[a.id] = (savedAccessoryOverridePrices[a.id] ?? a.unitPrice).toFixed(2);
                    initAccQty[a.id] = String(a.quantity);
                  });
                  setPriceOverrideAccessoryPrices(initAcc);
                  setPriceOverrideAccessoryQuantities(initAccQty);
                  setIsPriceOverrideOpen(true);
                }}>
                  Price override
                </Button>
                <Button variant="secondary" size="small" onPress={() => scrollToSection("Extra charges")}>
                  Edit applied charges
                </Button>
              </div>

              {/* Admin approval warning — shown when price override is active */}
              {priceOverrideDiscountAmount > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: "12px", border: "1px solid #f59e0b", borderRadius: "6px", padding: "12px 16px" }}>
                  <span style={{ color: "#f59e0b", fontSize: "1.125rem", flexShrink: 0 }}>⚠</span>
                  <span style={{ fontSize: "0.875rem", color: "var(--cim-fg-base, #15191d)" }}>This price will require admin approval</span>
                </div>
              )}

              {/* Divider */}
              <div style={{ height: "1px", background: "var(--cim-border-base, #dadcdd)" }} />

              {/* Total due */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--cim-fg-base, #15191d)", lineHeight: "28px" }}>Total due</span>
                <span style={{ fontSize: "1.75rem", fontWeight: 600, color: "var(--cim-fg-base, #15191d)", lineHeight: "36px" }}>
                  {totalDue.toFixed(2)} USD
                </span>
              </div>

            </div>
          </div>

        </div>

        {/* Price Override Modal */}
        {isPriceOverrideOpen && (() => {
          const overrideParsed = priceOverrideUnitPrice !== "" ? parseFloat(priceOverrideUnitPrice) : NaN;
          const overrideValid = !isNaN(overrideParsed) && overrideParsed >= 0;
          const modalQtyParsed = priceOverrideQty !== "" ? parseInt(priceOverrideQty, 10) : quantity;
          const modalQty = !isNaN(modalQtyParsed) && modalQtyParsed > 0 ? modalQtyParsed : quantity;
          const modalOrigBase = parseFloat((unitPrice * modalQty).toFixed(2));
          const modalNewBase = overrideValid ? parseFloat((overrideParsed * modalQty).toFixed(2)) : modalOrigBase;
          const modalDiscount = overrideValid ? parseFloat((modalOrigBase - modalNewBase).toFixed(2)) : 0;
          const hasModalCustomization = overrideValid && overrideParsed !== unitPrice;
          return (
            <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ background: "white", borderRadius: "8px", width: "min(90vw, 760px)", maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", borderBottom: "1px solid var(--cim-border-base, #dadcdd)" }}>
                  <span style={{ fontSize: "1.125rem", fontWeight: 600, color: "var(--cim-fg-base, #15191d)" }}>Price override</span>
                  <button onClick={() => setIsPriceOverrideOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.375rem", color: "var(--cim-fg-base, #15191d)", lineHeight: 1, display: "flex", alignItems: "center", padding: "4px" }}>×</button>
                </div>
                {/* Body */}
                <div style={{ flex: 1, overflowY: "auto", padding: "24px", display: "flex", flexDirection: "column", gap: "24px" }}>
                  {/* Product row */}
                  <div style={{ display: "flex", gap: "24px", alignItems: "flex-start" }}>
                    <div style={{ width: "120px", height: "96px", borderRadius: "6px", overflow: "hidden", background: "var(--cim-bg-subtle, #f8f9fa)", flexShrink: 0, border: "1px solid var(--cim-border-base, #dadcdd)" }}>
                      {product.imageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={product.imageUrl} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      )}
                    </div>
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "4px" }}>
                      <p style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "var(--cim-fg-base, #15191d)" }}>{product.name}</p>
                      <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--cim-fg-subtle, #5f6469)" }}>
                        {basePrice.toFixed(2)} USD ({quantity} qty × {unitPrice.toFixed(2)}/unit)
                      </p>
                      {/* Fields */}
                      <div style={{ display: "flex", gap: "8px", alignItems: "flex-end", marginTop: "12px", flexWrap: "wrap" }}>
                        {/* Quantity */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                          <label style={{ fontSize: "0.875rem", color: "var(--cim-fg-base, #15191d)" }}>Quantity</label>
                          <input
                            type="number"
                            min={1}
                            step={1}
                            value={priceOverrideQty}
                            onChange={(e) => setPriceOverrideQty(e.target.value)}
                            placeholder={String(quantity)}
                            style={{ border: "1px solid var(--cim-border-base, #dadcdd)", borderRadius: "4px", padding: "8px 12px", fontSize: "1rem", minHeight: "40px", minWidth: "90px", outline: "none", fontFamily: "inherit", color: "var(--cim-fg-base, #15191d)" }}
                          />
                        </div>
                        {/* Unit price */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                          <label style={{ fontSize: "0.875rem", color: "var(--cim-fg-base, #15191d)" }}>Unit price</label>
                          <input
                            type="number"
                            min={0}
                            step={0.01}
                            value={priceOverrideUnitPrice}
                            onChange={(e) => setPriceOverrideUnitPrice(e.target.value)}
                            placeholder={unitPrice.toFixed(2)}
                            style={{ border: "1px solid var(--cim-border-base, #dadcdd)", borderRadius: "4px", padding: "8px 12px", fontSize: "1rem", minHeight: "40px", minWidth: "110px", outline: "none", fontFamily: "inherit", color: "var(--cim-fg-base, #15191d)" }}
                          />
                        </div>
                        {/* = */}
                        <span style={{ fontSize: "1rem", color: "var(--cim-fg-subtle, #5f6469)", paddingBottom: "8px" }}>=</span>
                        {/* Packaged price */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                          <label style={{ fontSize: "0.875rem", color: "var(--cim-fg-base, #15191d)" }}>Packaged price</label>
                          <div style={{ border: "1px solid var(--cim-border-base, #dadcdd)", borderRadius: "4px", padding: "8px 12px", minHeight: "40px", minWidth: "130px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", background: "var(--cim-bg-subtle, #f8f9fa)", fontSize: "1rem", color: "var(--cim-fg-base, #15191d)" }}>
                            <span>{modalNewBase.toFixed(2)}</span>
                            <span style={{ color: "var(--cim-fg-subtle, #5f6469)", fontSize: "0.875rem" }}>USD</span>
                          </div>
                        </div>
                        {/* Discount */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                          <label style={{ fontSize: "0.875rem", color: "var(--cim-fg-base, #15191d)" }}>Discount</label>
                          <div style={{ border: "1px solid var(--cim-border-base, #dadcdd)", borderRadius: "4px", padding: "8px 12px", minHeight: "40px", minWidth: "110px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", background: "var(--cim-bg-subtle, #f8f9fa)", fontSize: "1rem", color: "var(--cim-fg-base, #15191d)" }}>
                            <span>{modalDiscount > 0 ? modalDiscount.toFixed(2) : "0.00"}</span>
                            <span style={{ color: "var(--cim-fg-subtle, #5f6469)", fontSize: "0.875rem" }}>USD</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Accessory rows */}
                  {addedAccessories.map((acc) => {
                    const accCatalog = MOCK_ACCESSORIES.find((m) => m.id === acc.id);
                    const accInputPrice = priceOverrideAccessoryPrices[acc.id] ?? "";
                    const accInputQty = priceOverrideAccessoryQuantities[acc.id] ?? String(acc.quantity);
                    const accParsed = accInputPrice !== "" ? parseFloat(accInputPrice) : NaN;
                    const accQtyParsed = parseInt(accInputQty, 10);
                    const accQty = !isNaN(accQtyParsed) && accQtyParsed > 0 ? accQtyParsed : acc.quantity;
                    const accValid = !isNaN(accParsed) && accParsed >= 0;
                    const accOrigPackaged = parseFloat((acc.unitPrice * accQty).toFixed(2));
                    const accPackaged = accValid ? parseFloat((accParsed * accQty).toFixed(2)) : accOrigPackaged;
                    const accDiscount = accValid ? parseFloat((accOrigPackaged - accPackaged).toFixed(2)) : 0;
                    return (
                      <div key={acc.id}>
                        <div style={{ height: "1px", background: "var(--cim-border-base, #dadcdd)", margin: "0 0 24px" }} />
                        <div style={{ display: "flex", gap: "24px", alignItems: "flex-start" }}>
                          <div style={{ width: "120px", height: "96px", borderRadius: "6px", overflow: "hidden", background: "var(--cim-bg-subtle, #f8f9fa)", flexShrink: 0, border: "1px solid var(--cim-border-base, #dadcdd)" }}>
                            {accCatalog?.imageUrl && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={accCatalog.imageUrl} alt={acc.label} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            )}
                          </div>
                          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "4px" }}>
                            <p style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "var(--cim-fg-base, #15191d)" }}>{acc.label}</p>
                            <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--cim-fg-subtle, #5f6469)" }}>
                              {parseFloat((acc.unitPrice * acc.quantity).toFixed(2)).toFixed(2)} USD ({acc.quantity} qty × {acc.unitPrice.toFixed(2)}/unit)
                            </p>
                            <div style={{ display: "flex", gap: "8px", alignItems: "flex-end", marginTop: "12px", flexWrap: "wrap" }}>
                              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                <label style={{ fontSize: "0.875rem", color: "var(--cim-fg-base, #15191d)" }}>Quantity</label>
                                <input
                                  type="number"
                                  min={1}
                                  step={1}
                                  value={accInputQty}
                                  onChange={(e) => setPriceOverrideAccessoryQuantities((prev) => ({ ...prev, [acc.id]: e.target.value }))}
                                  placeholder={String(acc.quantity)}
                                  style={{ border: "1px solid var(--cim-border-base, #dadcdd)", borderRadius: "4px", padding: "8px 12px", fontSize: "1rem", minHeight: "40px", minWidth: "90px", outline: "none", fontFamily: "inherit", color: "var(--cim-fg-base, #15191d)" }}
                                />
                              </div>
                              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                <label style={{ fontSize: "0.875rem", color: "var(--cim-fg-base, #15191d)" }}>Unit price</label>
                                <input
                                  type="number"
                                  min={0}
                                  step={0.01}
                                  value={accInputPrice}
                                  onChange={(e) => setPriceOverrideAccessoryPrices((prev) => ({ ...prev, [acc.id]: e.target.value }))}
                                  placeholder={acc.unitPrice.toFixed(2)}
                                  style={{ border: "1px solid var(--cim-border-base, #dadcdd)", borderRadius: "4px", padding: "8px 12px", fontSize: "1rem", minHeight: "40px", minWidth: "110px", outline: "none", fontFamily: "inherit", color: "var(--cim-fg-base, #15191d)" }}
                                />
                              </div>
                              <span style={{ fontSize: "1rem", color: "var(--cim-fg-subtle, #5f6469)", paddingBottom: "8px" }}>=</span>
                              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                <label style={{ fontSize: "0.875rem", color: "var(--cim-fg-base, #15191d)" }}>Packaged price</label>
                                <div style={{ border: "1px solid var(--cim-border-base, #dadcdd)", borderRadius: "4px", padding: "8px 12px", minHeight: "40px", minWidth: "130px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", background: "var(--cim-bg-subtle, #f8f9fa)", fontSize: "1rem", color: "var(--cim-fg-base, #15191d)" }}>
                                  <span>{accPackaged.toFixed(2)}</span>
                                  <span style={{ color: "var(--cim-fg-subtle, #5f6469)", fontSize: "0.875rem" }}>USD</span>
                                </div>
                              </div>
                              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                <label style={{ fontSize: "0.875rem", color: "var(--cim-fg-base, #15191d)" }}>Discount</label>
                                <div style={{ border: "1px solid var(--cim-border-base, #dadcdd)", borderRadius: "4px", padding: "8px 12px", minHeight: "40px", minWidth: "110px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", background: "var(--cim-bg-subtle, #f8f9fa)", fontSize: "1rem", color: "var(--cim-fg-base, #15191d)" }}>
                                  <span>{accDiscount > 0 ? accDiscount.toFixed(2) : "0.00"}</span>
                                  <span style={{ color: "var(--cim-fg-subtle, #5f6469)", fontSize: "0.875rem" }}>USD</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Reason */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <div style={{ display: "flex", gap: "4px", fontSize: "0.875rem", alignItems: "center" }}>
                      <span style={{ color: "var(--cim-fg-base, #15191d)" }}>Reason for price override</span>
                      <span style={{ color: "var(--cim-fg-critical, #d10023)" }}>*</span>
                    </div>
                    <textarea
                      value={priceOverrideReason}
                      onChange={(e) => setPriceOverrideReason(e.target.value)}
                      placeholder="Write here..."
                      rows={3}
                      style={{ border: "1px solid var(--cim-border-base, #dadcdd)", borderRadius: "4px", padding: "12px", fontSize: "1rem", resize: "vertical", outline: "none", fontFamily: "inherit", color: "var(--cim-fg-base, #15191d)", lineHeight: 1.5 }}
                    />
                  </div>
                  {/* Warning banner */}
                  {modalDiscount > 0 && (
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", border: "1px solid #f59e0b", borderRadius: "6px", padding: "12px 16px" }}>
                      <span style={{ color: "#f59e0b", fontSize: "1.125rem", flexShrink: 0 }}>⚠</span>
                      <span style={{ fontSize: "0.875rem", color: "var(--cim-fg-base, #15191d)" }}>This price will require admin approval</span>
                    </div>
                  )}
                </div>
                {/* Footer */}
                <div style={{ borderTop: "1px solid var(--cim-border-base, #dadcdd)", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                    <span style={{ fontSize: "0.75rem", color: "var(--cim-fg-muted, #94979b)" }}>new item total</span>
                    {hasModalCustomization ? (
                      <>
                        <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
                          <span style={{ fontSize: "1rem", color: "var(--cim-fg-subtle, #5f6469)", textDecoration: "line-through" }}>{basePrice.toFixed(2)} USD</span>
                          <span style={{ fontSize: "1.125rem", fontWeight: 600, color: "var(--cim-fg-base, #15191d)" }}>{modalNewBase.toFixed(2)} USD</span>
                        </div>
                        {modalDiscount > 0 && (
                          <span style={{ fontSize: "0.75rem", color: "var(--cim-fg-success, #007e3f)" }}>{modalDiscount.toFixed(2)} USD in savings due to price override</span>
                        )}
                      </>
                    ) : (
                      <>
                        <span style={{ fontSize: "1.125rem", fontWeight: 600, color: "var(--cim-fg-muted, #94979b)" }}>0.00 USD</span>
                        <span style={{ fontSize: "0.75rem", color: "var(--cim-fg-muted, #94979b)" }}>No price customization selected</span>
                      </>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: "12px", flexShrink: 0 }}>
                    <Button variant="secondary" onPress={() => setIsPriceOverrideOpen(false)}>Cancel</Button>
                    <Button
                      isDisabled={!overrideValid || !priceOverrideReason.trim()}
                      onPress={() => {
                        setSavedPriceOverrideUnitPrice(overrideParsed);
                        // Save accessory override prices
                        const newAccPrices: Record<string, number> = {};
                        addedAccessories.forEach((a) => {
                          const p = parseFloat(priceOverrideAccessoryPrices[a.id] ?? "");
                          if (!isNaN(p) && p >= 0) newAccPrices[a.id] = p;
                        });
                        setSavedAccessoryOverridePrices(newAccPrices);
                        // Clear pct discount when price override is confirmed
                        setSavedOfferDiscountPct(0);
                        setOfferDiscountPct(0);
                        setPctBasedInput("");
                        setOverrideReason("");
                        setIsPriceOverrideOpen(false);
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

        {isArtworkModalOpen && (
          <PreviousArtworkModal
            onConfirm={(artwork) => {
              setArtworkFileName(artwork.fileName);
              setIsArtworkModalOpen(false);
            }}
            onCancel={() => {
              setArtworkOption(null);
              setArtworkFileName("");
              setIsArtworkModalOpen(false);
            }}
          />
        )}
      </div>
    );
  }
);

ItemConfigurationCard.displayName = "ItemConfigurationCard";
