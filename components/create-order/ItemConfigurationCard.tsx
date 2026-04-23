"use client";

import { useState, useEffect, forwardRef, useImperativeHandle, useRef, useCallback } from "react";
import { Button, Select, SelectItem, TextField, Disclosure } from "@cimpress-ui/react";
import { IconInfoCircle, IconCheckCircleFill } from "@cimpress-ui/react/icons";
import type { ProductCatalogItem, DraftOrderItem, DraftOrderItemAttribute, QuantityPricingTier } from "@/lib/types";
import { PreviousArtworkModal } from "./PreviousArtworkModal";

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
      selectedOptionId:
        initialValues?.selectedAttributes.find((a) => a.attributeId === attr.id)?.selectedOptionId ??
        attr.options[0]?.id ??
        "",
    }));

    const [selectedAttributes, setSelectedAttributes] = useState<DraftOrderItemAttribute[]>(defaultAttributes);
    const [quantity, setQuantity] = useState<number>(initialValues?.quantity ?? product.minOrderQty);
    const [upsellApplied, setUpsellApplied] = useState(false);
    const [preUpsellQuantity, setPreUpsellQuantity] = useState<number | null>(null);
    const [upsellInfo, setUpsellInfo] = useState<UpsellSuggestion | null>(null);
    const [quantityInput, setQuantityInput] = useState<string>(initialValues?.quantity != null ? String(initialValues.quantity) : "");
    const [artworkOption, setArtworkOption] = useState<"new" | "customise">("new");
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

    const unitPrice = resolvePricingTier(product.pricingTiers, quantity);
    const basePrice = parseFloat((unitPrice * quantity).toFixed(2));
    const selectedCharge = (product.extraCharges ?? []).find((c) => c.id === selectedChargeId);
    const artworkCharge = 10;
    const extraChargesTotal = parseFloat(((selectedCharge?.unitPrice ?? 0) + artworkCharge).toFixed(2));
    const chargesApplied = (selectedCharge ? 1 : 0) + 1;
    const subtotal = parseFloat((basePrice + extraChargesTotal).toFixed(2));
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
      const startQty = initialValues?.quantity ?? product.minOrderQty;
      setSelectedAttributes(defaultAttributes);
      setQuantity(startQty);
      setUpsellApplied(false);
      setPreUpsellQuantity(null);
      setUpsellInfo(computeUpsell(product, startQty));
      setQuantityInput(initialValues?.quantity != null ? String(initialValues.quantity) : "");
      setArtworkOption("new");
      setArtworkFileName("");
      setSelectedChargeId(null);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [product.id]);

    const handleSubmit = useCallback(() => {
      const item: DraftOrderItem = {
        draftItemId: initialValues?.draftItemId ?? generateDraftId(),
        product,
        selectedAttributes,
        quantity,
        artworkType: artworkOption === "new" ? "upload" : "none",
        artworkUrl: "",
        artworkFileName,
        itemDiscount: 0,
        unitPrice,
        lineTotal: totalDue,
      };
      onAddToOrder(item);
    }, [product, selectedAttributes, quantity, artworkOption, artworkFileName, unitPrice, totalDue, onAddToOrder, initialValues]);

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

          {/* Attributes + Quantity section */}
          {product.attributes.length > 0 ? (
            <div ref={attributesRef} style={{ ...sectionCard, padding: 0, gap: 0, overflow: "hidden" }}>
              <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: "16px" }}>
                <p style={sectionHeading}>Attributes</p>
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
              <div ref={quantityRef} style={{ borderTop: "1px solid var(--cim-border-subtle, #eaebeb)", padding: "12px", display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: "16px", width: "100%" }}>
                  {/* Left: field + stock */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", flex: 1, minWidth: 0 }}>
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
                  {/* Unit price */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px", width: "200px", flexShrink: 0 }}>
                    <span style={{ fontSize: "0.875rem", color: "var(--cim-fg-base, #15191d)", lineHeight: "20px" }}>Unit price</span>
                    <div style={{
                      display: "flex", alignItems: "center",
                      minHeight: "40px", borderRadius: "4px",
                      border: "1px solid var(--cim-border-base, #dadcdd)",
                      background: "var(--cim-bg-subtle, #f8f9fa)",
                      overflow: "hidden",
                    }}>
                      {quantityInput === "" ? (
                        <span style={{
                          flex: 1, padding: "8px 12px",
                          fontSize: "1rem", lineHeight: "24px",
                          color: "var(--cim-fg-muted, #94979b)",
                        }}>—</span>
                      ) : (
                        <>
                          <span style={{
                            padding: "8px 8px 8px 12px",
                            fontSize: "1rem", lineHeight: "24px",
                            color: "var(--cim-fg-subtle, #5f6469)",
                            flexShrink: 0,
                          }}>USD</span>
                          <span style={{
                            flex: 1, padding: "8px 12px",
                            fontSize: "1rem", lineHeight: "24px",
                            color: "var(--cim-fg-base, #15191d)",
                          }}>{unitPrice.toFixed(2)}</span>
                        </>
                      )}
                    </div>
                  </div>
                  {/* Subtotal */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px", width: "200px", flexShrink: 0 }}>
                    <span style={{ fontSize: "0.875rem", color: "var(--cim-fg-base, #15191d)", lineHeight: "20px" }}>Subtotal</span>
                    <div style={{
                      display: "flex", alignItems: "center",
                      minHeight: "40px", borderRadius: "4px",
                      border: "1px solid var(--cim-border-base, #dadcdd)",
                      background: "var(--cim-bg-subtle, #f8f9fa)",
                      overflow: "hidden",
                    }}>
                      {quantityInput === "" ? (
                        <span style={{
                          flex: 1, padding: "8px 12px",
                          fontSize: "1rem", lineHeight: "24px",
                          color: "var(--cim-fg-muted, #94979b)",
                        }}>—</span>
                      ) : (
                        <>
                          <span style={{
                            padding: "8px 8px 8px 12px",
                            fontSize: "1rem", lineHeight: "24px",
                            color: "var(--cim-fg-subtle, #5f6469)",
                            flexShrink: 0,
                          }}>USD</span>
                          <span style={{
                            flex: 1, padding: "8px 12px",
                            fontSize: "1rem", lineHeight: "24px",
                            color: "var(--cim-fg-base, #15191d)",
                          }}>{basePrice.toFixed(2)}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div ref={quantityRef} style={{ ...sectionCard, padding: 0, gap: 0, overflow: "hidden" }}>
              <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: "12px" }}>
                <p style={sectionHeading}>Quantity</p>
                <div style={{ display: "flex", alignItems: "flex-start", gap: "16px", width: "100%" }}>
                  {/* Left: field + stock */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", flex: 1, minWidth: 0 }}>
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
                  {/* Unit price */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px", width: "200px", flexShrink: 0 }}>
                    <span style={{ fontSize: "0.875rem", color: "var(--cim-fg-base, #15191d)", lineHeight: "20px" }}>Unit price</span>
                    <div style={{
                      display: "flex", alignItems: "center",
                      minHeight: "40px", borderRadius: "4px",
                      border: "1px solid var(--cim-border-base, #dadcdd)",
                      background: "var(--cim-bg-subtle, #f8f9fa)",
                      overflow: "hidden",
                    }}>
                      {quantityInput === "" ? (
                        <span style={{
                          flex: 1, padding: "8px 12px",
                          fontSize: "1rem", lineHeight: "24px",
                          color: "var(--cim-fg-muted, #94979b)",
                        }}>—</span>
                      ) : (
                        <>
                          <span style={{
                            padding: "8px 8px 8px 12px",
                            fontSize: "1rem", lineHeight: "24px",
                            color: "var(--cim-fg-subtle, #5f6469)",
                            flexShrink: 0,
                          }}>USD</span>
                          <span style={{
                            flex: 1, padding: "8px 12px",
                            fontSize: "1rem", lineHeight: "24px",
                            color: "var(--cim-fg-base, #15191d)",
                          }}>{unitPrice.toFixed(2)}</span>
                        </>
                      )}
                    </div>
                  </div>
                  {/* Subtotal */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px", width: "200px", flexShrink: 0 }}>
                    <span style={{ fontSize: "0.875rem", color: "var(--cim-fg-base, #15191d)", lineHeight: "20px" }}>Subtotal</span>
                    <div style={{
                      display: "flex", alignItems: "center",
                      minHeight: "40px", borderRadius: "4px",
                      border: "1px solid var(--cim-border-base, #dadcdd)",
                      background: "var(--cim-bg-subtle, #f8f9fa)",
                      overflow: "hidden",
                    }}>
                      {quantityInput === "" ? (
                        <span style={{
                          flex: 1, padding: "8px 12px",
                          fontSize: "1rem", lineHeight: "24px",
                          color: "var(--cim-fg-muted, #94979b)",
                        }}>—</span>
                      ) : (
                        <>
                          <span style={{
                            padding: "8px 8px 8px 12px",
                            fontSize: "1rem", lineHeight: "24px",
                            color: "var(--cim-fg-subtle, #5f6469)",
                            flexShrink: 0,
                          }}>USD</span>
                          <span style={{
                            flex: 1, padding: "8px 12px",
                            fontSize: "1rem", lineHeight: "24px",
                            color: "var(--cim-fg-base, #15191d)",
                          }}>{basePrice.toFixed(2)}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* View pricing guide section */}
          <div style={sectionCard}>
            <a
              href="https://ui.cimpress.io"
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: "0.875rem", color: "var(--cim-fg-accent, #007798)", textDecoration: "underline", width: "fit-content" }}
            >
              View pricing guide
            </a>
          </div>

          {/* Artwork section */}
          <div ref={artworkRef} style={sectionCard}>
            <p style={sectionHeading}>Artwork</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                <input
                  type="radio"
                  name="artworkOption"
                  value="new"
                  checked={artworkOption === "new"}
                  onChange={() => { setArtworkOption("new"); setArtworkFileName(""); }}
                  style={radioInputStyle}
                />
                <span style={{ fontSize: "0.875rem", color: "var(--cim-fg-base, #15191d)" }}>New artwork</span>
                <span style={{ fontSize: "0.8125rem", color: "var(--cim-fg-subtle, #5f6469)" }}>
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
                />
                <span style={{ fontSize: "0.875rem", color: "var(--cim-fg-base, #15191d)" }}>Customise as before</span>
                <span style={{ fontSize: "0.8125rem", color: "var(--cim-fg-subtle, #5f6469)" }}>
                  (A extra charge of USD 10.00 will be applicable)
                </span>
              </label>
            </div>
            {artworkOption === "new" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--cim-fg-base, #15191d)" }}>
                  Add new artwork <span style={{ color: "var(--cim-fg-critical, #d10023)" }}>*</span>
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  {artworkFileName ? (
                    <>
                      <button
                        onClick={() => setArtworkFileName("")}
                        style={{
                          padding: "5px 12px",
                          border: "1px solid var(--cim-fg-critical, #d10023)",
                          borderRadius: "4px",
                          background: "white",
                          color: "var(--cim-fg-critical, #d10023)",
                          fontSize: "0.875rem",
                          fontWeight: 500,
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                        }}
                      >
                        Remove artwork
                      </button>
                      <span style={{ fontSize: "0.875rem", color: "var(--cim-fg-base, #15191d)" }}>{artworkFileName}</span>
                    </>
                  ) : (
                    <a
                      href="https://pens.experience.cimpress.io/us/studio/?key=PRD-ZQO1BK4YA&productVersion=4&locale=en-us&selectedOptions=%7B%22Substrate%20Color%22%3A%22%23000000%22%7D&fullBleedElected=true&mpvId=portAuthorityWomensBrickJacketClone&qty=%7b%22S%22%3a0%2c%22M%22%3a0%2c%223XL%22%3a0%2c%22XS%22%3a5%7d"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ textDecoration: "none" }}
                      onClick={() => { waitingForStudio.current = true; }}
                    >
                      <Button variant="secondary" size="small">Add artwork</Button>
                    </a>
                  )}
                </div>
              </div>
            )}
            {artworkOption === "customise" && artworkFileName && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <button
                  onClick={() => setIsArtworkModalOpen(true)}
                  style={{
                    padding: "5px 12px",
                    border: "1px solid var(--cim-border-base, #dadcdd)",
                    borderRadius: "4px",
                    background: "white",
                    color: "var(--cim-fg-accent, #007798)",
                    fontSize: "0.875rem",
                    fontWeight: 500,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  Change artwork
                </button>
                <span style={{ fontSize: "0.875rem", color: "var(--cim-fg-base, #15191d)" }}>{artworkFileName}</span>
              </div>
            )}
          </div>

          {/* Add-ons section */}
          <div ref={addOnsRef} style={{ border: "1px solid var(--cim-border-base, #dadcdd)", borderRadius: "6px", overflow: "hidden" }}>
            <Disclosure title="Add-ons" variant="subtle">
              <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: "8px", alignItems: "flex-start" }}>
                <Button variant="secondary" size="small">Add new accessory</Button>
              </div>
            </Disclosure>
          </div>

          {/* Item price section */}
          <div ref={itemPriceRef} style={{
            background: "white",
            border: "1px solid var(--cim-border-base, #dadcdd)",
            borderRadius: "6px",
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}>
            <p style={sectionHeading}>Item Price</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem", color: "var(--cim-fg-base)" }}>
                <span>Price ({quantity} qty)</span>
                <span>{basePrice.toFixed(2)} USD</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem", color: "var(--cim-fg-base)" }}>
                <span>Discount</span>
                <span>0.00 USD</span>
              </div>
              {chargesApplied > 0 && (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem", color: "var(--cim-fg-base)" }}>
                    <span>Total charges applied ({chargesApplied})</span>
                    <span>{extraChargesTotal.toFixed(2)} USD</span>
                  </div>
                  {selectedCharge && (
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem", color: "var(--cim-fg-base)" }}>
                      <span>{selectedCharge.label}</span>
                      <span>{selectedCharge.unitPrice.toFixed(2)} USD</span>
                    </div>
                  )}
                  {artworkOption === "customise" && (
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem", color: "var(--cim-fg-base)" }}>
                      <span>Artwork customisation</span>
                      <span>10.00 USD</span>
                    </div>
                  )}
                </>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem", color: "var(--cim-fg-base)" }}>
                <span>Subtotal</span>
                <span>{subtotal.toFixed(2)} USD</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem", color: "var(--cim-fg-subtle, #5f6469)" }}>
                <span>Tax ({taxRate}%)</span>
                <span>{tax.toFixed(2)} USD</span>
              </div>
              <div style={{ height: "1px", background: "var(--cim-border-base, #dadcdd)", margin: "4px 0" }} />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontSize: "1.125rem", fontWeight: 600, color: "var(--cim-fg-base)" }}>Total due</span>
                <span style={{ fontSize: "1.75rem", fontWeight: 600, color: "var(--cim-fg-base, #15191d)" }}>
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
              setArtworkOption("new");
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
