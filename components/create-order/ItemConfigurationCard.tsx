"use client";

import { useState, useEffect, forwardRef, useImperativeHandle, useRef, useCallback } from "react";
import { Button, Select, SelectItem, TextField, Disclosure, Badge } from "@cimpress-ui/react";
import { IconInfoCircle, IconCheckCircleFill, IconChevronRight } from "@cimpress-ui/react/icons";
import type { ProductCatalogItem, DraftOrderItem, DraftOrderItemAttribute, QuantityPricingTier } from "@/lib/types";
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

function resolvePricingTier(tiers: QuantityPricingTier[], qty: number): number {
  for (const tier of [...tiers].reverse()) {
    if (qty >= tier.minQty) return tier.unitPrice;
  }
  return tiers[0]?.unitPrice ?? 0;
}

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

export const ItemConfigurationCard = forwardRef<ItemConfigurationCardHandle, ItemConfigurationCardProps>(
  ({ product, initialValues, onAddToOrder, onLineTotalChange, onValidityChange, onPriceBreakdownChange }, ref) => {
    const [activeTab, setActiveTab] = useState<TabLabel>("Attributes");

    const attributesRef = useRef<HTMLDivElement>(null);
    const quantityRef = useRef<HTMLDivElement>(null);
    const artworkRef = useRef<HTMLDivElement>(null);
    const extraChargesRef = useRef<HTMLDivElement>(null);
    const addOnsRef = useRef<HTMLDivElement>(null);
    const itemPriceRef = useRef<HTMLDivElement>(null);

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
    const [showAllTiers, setShowAllTiers] = useState(false);
    const [pricingGuideSelected, setPricingGuideSelected] = useState<number | null>(null);
    const [isPricingGuideOpen, setIsPricingGuideOpen] = useState(false);
    const [addedAccessories, setAddedAccessories] = useState<import("@/lib/types").DraftOrderItemAccessory[]>([]);
    const [showAllAccessories, setShowAllAccessories] = useState(false);
    const [isChargesExpanded, setIsChargesExpanded] = useState(false);
    const [isAccessoriesExpanded, setIsAccessoriesExpanded] = useState(false);

    const unitPrice = resolvePricingTier(product.pricingTiers, quantity);
    // basePrice is 0 until the user has entered a quantity
    const basePrice = quantityInput ? parseFloat((unitPrice * quantity).toFixed(2)) : 0;

    // Pricing guide
    const PRICING_GUIDE_VISIBLE = 10;
    const sortedTiersAll = [...product.pricingTiers].sort((a, b) => a.minQty - b.minQty);
    const pricingGuideRows = showAllTiers ? sortedTiersAll : sortedTiersAll.slice(0, PRICING_GUIDE_VISIBLE);
    const selectedCharge = (product.extraCharges ?? []).find((c) => c.id === selectedChargeId);
    // Artwork charge only applies once the user has selected an artwork option
    const artworkCharge = artworkOption !== null ? 10 : 0;
    const extraChargesTotal = parseFloat(((selectedCharge?.unitPrice ?? 0) + artworkCharge).toFixed(2));
    const chargesApplied = (selectedCharge ? 1 : 0) + (artworkOption !== null ? 1 : 0);
    const accessoriesTotal = parseFloat(addedAccessories.reduce((sum, a) => sum + a.quantity * a.unitPrice, 0).toFixed(2));
    const subtotal = parseFloat((basePrice + extraChargesTotal + accessoriesTotal).toFixed(2));
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
        discount: 0,
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
      setAddedAccessories([]);
      setShowAllAccessories(false);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [product.id]);

    const handleSubmit = useCallback(() => {
      const item: DraftOrderItem = {
        draftItemId: initialValues?.draftItemId ?? generateDraftId(),
        product,
        selectedAttributes,
        quantity,
        artworkType: artworkOption === "new" ? "upload" : artworkOption === "customise" ? "url" : "none",
        artworkUrl: "",
        artworkFileName,
        itemDiscount: 0,
        unitPrice,
        // lineTotal is the pre-tax subtotal; tax is computed separately downstream
        lineTotal: subtotal,
        accessories: addedAccessories,
      };
      onAddToOrder(item);
    }, [product, selectedAttributes, quantity, artworkOption, artworkFileName, unitPrice, subtotal, addedAccessories, onAddToOrder, initialValues]);

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
      if (tab === "Extra charges" && (!product.extraCharges || product.extraCharges.length === 0)) return false;
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
          <div style={{ display: "flex", gap: "16px", alignItems: "flex-start", padding: "4px 0 12px" }}>
            <div style={{ width: "60px", height: "60px", borderRadius: "6px", overflow: "hidden", background: "var(--cim-bg-subtle, #f8f9fa)", flexShrink: 0 }}>
              {product.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={product.imageUrl} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
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
                <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--cim-fg-subtle, #5f6469)", lineHeight: "20px" }}>{product.category}</p>
              </div>
              <span style={{ fontSize: "0.875rem", color: "var(--cim-fg-subtle, #5f6469)", whiteSpace: "nowrap", flexShrink: 0 }}>{product.id}</span>
            </div>
          </div>

          {/* Combined Attributes + Quantity section */}
          <div ref={attributesRef} style={sectionCard}>
            {/* Attributes */}
            {product.attributes.length > 0 && (
              <>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <p style={sectionHeading}>Attributes</p>
                  <button
                    onClick={() => {
                      setSelectedAttributes(product.attributes.map((attr) => ({ attributeId: attr.id, selectedOptionId: "" })));
                      setQuantityInput("");
                      setQuantity(product.minOrderQty);
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
                          <span style={{ fontSize: "0.875rem", color: "var(--cim-fg-base, #15191d)" }}>{attr.label}</span>
                          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                            {attr.options.map((opt) => {
                              const isSelected = currentVal === opt.id;
                              return (
                                <button
                                  key={opt.id}
                                  title={opt.label}
                                  aria-label={opt.label}
                                  aria-pressed={isSelected}
                                  onClick={() => handleAttributeChange(attr.id, opt.id)}
                                  style={{
                                    width: "30px",
                                    height: "30px",
                                    borderRadius: "6px",
                                    background: opt.hexColor ?? "#ccc",
                                    border: isSelected ? "2px solid var(--cim-fg-accent, #0091b8)" : "2px solid transparent",
                                    outline: isSelected ? "1px solid var(--cim-fg-accent, #0091b8)" : "none",
                                    outlineOffset: "2px",
                                    cursor: "pointer",
                                    flexShrink: 0,
                                    padding: 0,
                                  }}
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
                          <span style={{ fontSize: "0.875rem", color: "var(--cim-fg-base, #15191d)" }}>{attr.label}</span>
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
                        >
                          {attr.options.map((opt) => (
                            <SelectItem key={opt.id} id={opt.id}>{opt.label}</SelectItem>
                          ))}
                        </Select>
                      </div>
                    );
                  })}
                </div>
                <div style={{ height: "1px", background: "var(--cim-border-subtle, #eaebeb)" }} />
              </>
            )}

            {/* Quantity */}
            <div ref={quantityRef} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <p style={sectionHeading}>Quantity</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxWidth: "378px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <TextField
                      label="Quantity"
                      value={quantityInput}
                      placeholder="Enter quantity"
                      description={`Between ${product.minOrderQty} – ${product.maxOrderQty}`}
                      isInvalid={
                        quantityInput !== "" && (isNaN(parseInt(quantityInput, 10)) || parseInt(quantityInput, 10) < product.minOrderQty || parseInt(quantityInput, 10) > product.maxOrderQty)
                          ? true
                          : false
                      }
                      error={
                        quantityInput !== "" && parseInt(quantityInput, 10) < product.minOrderQty
                          ? `Minimum is ${product.minOrderQty}`
                          : quantityInput !== "" && parseInt(quantityInput, 10) > product.maxOrderQty
                          ? `Maximum is ${product.maxOrderQty}`
                          : undefined
                      }
                      onChange={(val) => {
                        setQuantityInput(val);
                        const n = parseInt(val, 10);
                        if (!isNaN(n) && n >= product.minOrderQty && n <= product.maxOrderQty) {
                          handleQuantityChange(n);
                        }
                      }}
                      onFocus={() => setIsPricingGuideOpen(true)}
                      inputMode="numeric"
                    />
                  </div>
                  <div style={{ marginTop: "20px", color: "var(--cim-fg-subtle, #5f6469)", display: "flex", flexShrink: 0 }}>
                    <IconInfoCircle />
                  </div>
                </div>
                {product.stockQuantity !== undefined && (
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ color: "var(--cim-fg-success, #007e3f)", display: "flex" }}>
                      <IconCheckCircleFill />
                    </span>
                    <span style={{ fontSize: "0.875rem", color: "var(--cim-fg-base, #15191d)" }}>
                      In stock - {product.stockQuantity}
                    </span>
                  </div>
                )}
              </div>
              {/* Pricing guide disclosure */}
              <Disclosure
                title="View pricing guide"
                variant="subtle"
                isExpanded={isPricingGuideOpen}
                onExpandedChange={setIsPricingGuideOpen}
              >
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {pricingGuideRows.map((tier) => {
                      const isSelected = pricingGuideSelected === tier.minQty;
                      const tierTotal = (tier.minQty * tier.unitPrice).toFixed(2);
                      return (
                        <button
                          key={tier.minQty}
                          onClick={() => {
                            setPricingGuideSelected(tier.minQty);
                            setQuantityInput(String(tier.minQty));
                            handleQuantityChange(tier.minQty);
                          }}
                          style={{
                            display: "flex", alignItems: "center", justifyContent: "space-between",
                            padding: "16px", borderRadius: "6px", width: "100%", cursor: "pointer",
                            background: "white",
                            border: isSelected
                              ? "1.5px solid var(--cim-border-accent, #0091b8)"
                              : "1px solid var(--cim-border-base, #dadcdd)",
                            boxShadow: isSelected
                              ? "0px 1px 1px 0px rgba(0,0,0,0.08), 0px 1px 3px 0px rgba(0,0,0,0.04)"
                              : "none",
                          }}
                        >
                          {/* Left: qty + badge */}
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ fontSize: "0.875rem", color: "var(--cim-fg-base, #15191d)" }}>{tier.minQty}</span>
                            {tier.recommended && <Badge tone="base">Recommended</Badge>}
                          </div>

                          {/* Right: total + unit price */}
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--cim-fg-base, #15191d)" }}>
                              {tierTotal} USD
                            </span>
                            <span style={{ fontSize: "0.75rem", color: "var(--cim-fg-subtle, #5f6469)" }}>
                              {tier.unitPrice.toFixed(2)} USD / unit
                            </span>
                          </div>
                        </button>
                      );
                    })}

                    {/* View more quantities */}
                    {!showAllTiers && sortedTiersAll.length > PRICING_GUIDE_VISIBLE && (
                      <button
                        onClick={() => setShowAllTiers(true)}
                        style={{
                          background: "none", border: "none", padding: 0,
                          color: "var(--cim-fg-accent, #007798)", cursor: "pointer",
                          textDecoration: "underline", fontSize: "1rem",
                          alignSelf: "flex-start",
                        }}
                      >
                        View more quantities
                      </button>
                    )}
                  </div>
              </Disclosure>
            </div>
          </div>

          {/* Item total row */}
          <div style={{ ...sectionCard, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "1rem", color: "var(--cim-fg-base, #15191d)" }}>Item total</span>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "1.25rem", fontWeight: 600, color: quantityInput ? "var(--cim-fg-base, #15191d)" : "var(--cim-fg-muted, #94979b)" }}>
                {quantityInput ? `${basePrice.toFixed(2)} USD` : "—"}
              </div>
              {quantityInput && (
                <div style={{ fontSize: "0.75rem", color: "var(--cim-fg-subtle, #5f6469)", marginTop: "2px" }}>
                  {quantity} x USD {unitPrice.toFixed(2)} / unit
                </div>
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

          {/* Add-ons section */}
          {(() => {
            const addedCount = addedAccessories.length;
            const addedTotal = addedAccessories.reduce((sum, a) => sum + a.quantity * a.unitPrice, 0);
            const visibleAccessories = showAllAccessories ? MOCK_ACCESSORIES : MOCK_ACCESSORIES.slice(0, 3);
            return (
              <div ref={addOnsRef} style={{ position: "relative", border: "1px solid var(--cim-border-base, #dadcdd)", borderRadius: "6px", overflow: "hidden" }}>
                <Disclosure title="Add accessory" variant="subtle">
                  <div style={{ display: "flex", flexDirection: "column", gap: "16px", padding: "4px 16px 16px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
                      {visibleAccessories.map((acc) => {
                        const isAdded = addedAccessories.some((a) => a.id === acc.id);
                        return (
                          <AccessoryCard
                            key={acc.id}
                            item={acc}
                            isAdded={isAdded}
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
                <span>Price ({quantity} qty)</span>
                <span>{basePrice.toFixed(2)} USD</span>
              </div>

              {/* Selected extra charge — shown as its own direct line */}
              {selectedCharge && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "1rem", color: "var(--cim-fg-base, #15191d)" }}>
                  <span>{selectedCharge.label}</span>
                  <span>{selectedCharge.unitPrice.toFixed(2)} USD</span>
                </div>
              )}

              {/* Discount */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "1rem", color: "var(--cim-fg-base, #15191d)" }}>
                <span>Discount</span>
                <span style={{ color: "var(--cim-fg-muted, #94979b)" }}>0.00 USD</span>
              </div>

              {/* Total charges applied — collapsible, only shown when at least one charge applies */}
              {chargesApplied > 0 && (
                <div>
                  <button
                    onClick={() => setIsChargesExpanded((v) => !v)}
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: "1rem", color: "var(--cim-fg-base, #15191d)" }}
                  >
                    <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      Total charges applied ({chargesApplied})
                      <span style={{ display: "flex", color: "var(--cim-fg-subtle, #5f6469)", transform: isChargesExpanded ? "rotate(-90deg)" : "rotate(90deg)", transition: "transform 0.15s" }}>
                        <IconChevronRight size={16} />
                      </span>
                    </span>
                    <span>{extraChargesTotal.toFixed(2)} USD</span>
                  </button>
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
                  <button
                    onClick={() => setIsAccessoriesExpanded((v) => !v)}
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: "1rem", color: "var(--cim-fg-base, #15191d)" }}
                  >
                    <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      Accessory added ({addedAccessories.length})
                      <span style={{ display: "flex", color: "var(--cim-fg-subtle, #5f6469)", transform: isAccessoriesExpanded ? "rotate(-90deg)" : "rotate(90deg)", transition: "transform 0.15s" }}>
                        <IconChevronRight size={16} />
                      </span>
                    </span>
                    <span>{accessoriesTotal.toFixed(2)} USD</span>
                  </button>
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
