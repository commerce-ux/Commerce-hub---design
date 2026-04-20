"use client";

import { useState, useEffect, forwardRef, useImperativeHandle, useRef, useCallback } from "react";
import { Button, Select, SelectItem, FileTrigger, Disclosure } from "@cimpress-ui/react";
import { IconInfoCircle, IconCheckCircleFill } from "@cimpress-ui/react/icons";
import type { ProductCatalogItem, DraftOrderItem, DraftOrderItemAttribute, QuantityPricingTier } from "@/lib/types";

const TAB_LABELS = [
  "Attributes",
  "Quantity",
  "Artwork",
  "Extra charges",
  "Price override",
  "Add-ons",
  "Item price",
] as const;
type TabLabel = (typeof TAB_LABELS)[number];

interface ItemConfigurationCardProps {
  product: ProductCatalogItem;
  initialValues?: DraftOrderItem;
  onAddToOrder: (item: DraftOrderItem) => void;
  onLineTotalChange?: (total: number) => void;
  onValidityChange?: (isValid: boolean) => void;
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

function computeUpsell(product: ProductCatalogItem, qty: number): UpsellSuggestion | null {
  const currentPrice = resolvePricingTier(product.pricingTiers, qty);
  const sortedTiers = [...product.pricingTiers].sort((a, b) => a.minQty - b.minQty);
  const nextTier = sortedTiers.find((t) => t.minQty > qty && t.unitPrice < currentPrice);
  if (!nextTier) return null;
  const additionalUnits = nextTier.minQty - qty;
  if (additionalUnits > 55) return null;
  const additionalCost = parseFloat((nextTier.minQty * nextTier.unitPrice - qty * currentPrice).toFixed(2));
  return { suggestedQty: nextTier.minQty, additionalUnits, additionalCost };
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
  ({ product, initialValues, onAddToOrder, onLineTotalChange, onValidityChange }, ref) => {
    const [activeTab, setActiveTab] = useState<TabLabel>("Attributes");

    const attributesRef = useRef<HTMLDivElement>(null);
    const quantityRef = useRef<HTMLDivElement>(null);
    const artworkRef = useRef<HTMLDivElement>(null);
    const extraChargesRef = useRef<HTMLDivElement>(null);
    const priceOverrideRef = useRef<HTMLDivElement>(null);
    const addOnsRef = useRef<HTMLDivElement>(null);
    const itemPriceRef = useRef<HTMLDivElement>(null);

    const sectionRefs: Record<TabLabel, React.RefObject<HTMLDivElement | null>> = {
      Attributes: attributesRef,
      Quantity: quantityRef,
      Artwork: artworkRef,
      "Extra charges": extraChargesRef,
      "Price override": priceOverrideRef,
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
    const [artworkOption, setArtworkOption] = useState<"new" | "customise">("new");
    const [artworkFileName, setArtworkFileName] = useState<string>(initialValues?.artworkFileName ?? "");
    const [selectedChargeId, setSelectedChargeId] = useState<string | null>(null);
    const [priceOverrideType, setPriceOverrideType] = useState<"new" | "percentage" | null>(null);
    const [overrideInput, setOverrideInput] = useState("0.00");
    const [appliedOverridePrice, setAppliedOverridePrice] = useState<number | null>(null);
    const [overrideReason, setOverrideReason] = useState<string | null>(null);
    const [tierPage, setTierPage] = useState(0);
    const TIERS_PER_PAGE = 5;

    const unitPrice = resolvePricingTier(product.pricingTiers, quantity);
    const basePrice = parseFloat((unitPrice * quantity).toFixed(2));
    const selectedCharge = (product.extraCharges ?? []).find((c) => c.id === selectedChargeId);
    const artworkCharge = 10;
    const extraChargesTotal = parseFloat(((selectedCharge?.unitPrice ?? 0) + artworkCharge).toFixed(2));
    const chargesApplied = (selectedCharge ? 1 : 0) + 1;
    const subtotal = parseFloat((basePrice + extraChargesTotal).toFixed(2));
    const taxRate = product.taxRate ?? 8;
    const tax = parseFloat((subtotal * (taxRate / 100)).toFixed(2));
    const totalDue =
      appliedOverridePrice !== null
        ? appliedOverridePrice
        : parseFloat((subtotal + tax).toFixed(2));

    const isValid = quantity >= product.minOrderQty && quantity <= product.maxOrderQty;

    function handleQuantityChange(newQty: number) {
      setQuantity(newQty);
      setUpsellApplied(false);
      setPreUpsellQuantity(null);
      setUpsellInfo(computeUpsell(product, newQty));
    }

    function handleAddUpsell() {
      if (!upsellInfo) return;
      setPreUpsellQuantity(quantity);
      setQuantity(upsellInfo.suggestedQty);
      setUpsellApplied(true);
    }

    function handleRemoveUpsell() {
      if (preUpsellQuantity !== null) setQuantity(preUpsellQuantity);
      setUpsellApplied(false);
      setPreUpsellQuantity(null);
      setUpsellInfo(upsellInfo ? computeUpsell(product, preUpsellQuantity ?? product.minOrderQty) : null);
    }

    useEffect(() => {
      onLineTotalChange?.(totalDue);
    }, [totalDue, onLineTotalChange]);

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
      setArtworkOption("new");
      setArtworkFileName("");
      setSelectedChargeId(null);
      setAppliedOverridePrice(null);
      setOverrideInput("0.00");
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

    const quantityOptions = generateQuantityOptions(product.minOrderQty, product.maxOrderQty, product.pricingTiers);

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

          {/* Pricing table */}
          {product.pricingTiers.length > 1 && (() => {
            const tiers = product.pricingTiers;
            const totalPages = Math.ceil(tiers.length / TIERS_PER_PAGE);
            const safePage = Math.min(tierPage, totalPages - 1);
            const pageTiers = tiers.slice(safePage * TIERS_PER_PAGE, (safePage + 1) * TIERS_PER_PAGE);
            const activeTierIndex = [...tiers].reverse().findIndex((t) => quantity >= t.minQty);
            const activeIndex = activeTierIndex === -1 ? 0 : tiers.length - 1 - activeTierIndex;

            const labelStyle: React.CSSProperties = {
              fontSize: "0.8125rem",
              fontWeight: 600,
              color: "var(--cim-fg-base, #15191d)",
              padding: "10px 12px",
              background: "var(--cim-bg-subtle, #f8f9fa)",
              borderRight: "1px solid var(--cim-border-base, #dadcdd)",
              whiteSpace: "nowrap",
            };
            const cellStyle = (isActive: boolean): React.CSSProperties => ({
              fontSize: "0.8125rem",
              color: "var(--cim-fg-base, #15191d)",
              padding: "10px 12px",
              textAlign: "center",
              background: isActive ? "var(--cim-bg-info-subtle, #e8f4f8)" : "white",
              borderRight: "1px solid var(--cim-border-base, #dadcdd)",
              cursor: "pointer",
            });
            const rowBorder = "1px solid var(--cim-border-base, #dadcdd)";

            return (
              <div style={{ border: "1px solid var(--cim-border-base, #dadcdd)", borderRadius: "6px", overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <tbody>
                    <tr style={{ borderBottom: rowBorder }}>
                      <td style={labelStyle}>Quantity</td>
                      {pageTiers.map((tier, i) => {
                        const gi = safePage * TIERS_PER_PAGE + i;
                        return (
                          <td key={gi} style={cellStyle(gi === activeIndex)} onClick={() => handleQuantityChange(tier.minQty)}>
                            <strong>{tier.minQty}</strong>
                          </td>
                        );
                      })}
                    </tr>
                    <tr style={{ borderBottom: rowBorder }}>
                      <td style={labelStyle}>Unit Price</td>
                      {pageTiers.map((tier, i) => {
                        const gi = safePage * TIERS_PER_PAGE + i;
                        return (
                          <td key={gi} style={cellStyle(gi === activeIndex)} onClick={() => handleQuantityChange(tier.minQty)}>
                            {tier.unitPrice.toFixed(2)} USD
                          </td>
                        );
                      })}
                    </tr>
                    <tr style={{ borderBottom: rowBorder }}>
                      <td style={labelStyle}>Subtotal</td>
                      {pageTiers.map((tier, i) => {
                        const gi = safePage * TIERS_PER_PAGE + i;
                        return (
                          <td key={gi} style={{ ...cellStyle(gi === activeIndex), fontWeight: 600 }} onClick={() => handleQuantityChange(tier.minQty)}>
                            {(tier.minQty * tier.unitPrice).toFixed(2)} USD
                          </td>
                        );
                      })}
                    </tr>
                    <tr>
                      <td style={labelStyle}>Upsell Offer</td>
                      {pageTiers.map((tier, i) => {
                        const gi = safePage * TIERS_PER_PAGE + i;
                        const nextTier = tiers[gi + 1];
                        return (
                          <td key={gi} style={{ ...cellStyle(gi === activeIndex), color: "var(--cim-fg-subtle, #5f6469)" }} onClick={() => handleQuantityChange(tier.minQty)}>
                            {nextTier ? (
                              <>{nextTier.minQty - tier.minQty}{" "}<span style={{ fontSize: "0.75rem" }}>@ {nextTier.unitPrice.toFixed(2)}/each</span></>
                            ) : "—"}
                          </td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
                {totalPages > 1 && (
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 12px",
                    borderTop: "1px solid var(--cim-border-base, #dadcdd)",
                    background: "var(--cim-bg-subtle, #f8f9fa)",
                  }}>
                    <span style={{ fontSize: "0.75rem", color: "var(--cim-fg-subtle, #5f6469)" }}>
                      Page {safePage + 1} of {totalPages}
                    </span>
                    <div style={{ display: "flex", gap: "4px" }}>
                      <Button
                        variant="secondary"
                        size="small"
                        isDisabled={safePage === 0}
                        onPress={() => setTierPage(safePage - 1)}
                      >
                        ← Prev
                      </Button>
                      <Button
                        variant="secondary"
                        size="small"
                        isDisabled={safePage === totalPages - 1}
                        onPress={() => setTierPage(safePage + 1)}
                      >
                        Next →
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Attributes + Quantity section */}
          {product.attributes.length > 0 ? (
            <div ref={attributesRef} style={{ ...sectionCard, padding: 0, gap: 0, overflow: "hidden" }}>
              <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: "12px" }}>
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
                  return (
                    <div key={attr.id} style={{ minWidth: "160px", maxWidth: "320px" }}>
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
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{ width: "280px" }}>
                    <Select
                      label="Quantity"
                      selectedKey={String(quantity)}
                      onSelectionChange={(val) => handleQuantityChange(Number(val))}
                    >
                      {quantityOptions.map((q) => {
                        const tierPrice = resolvePricingTier(product.pricingTiers, q);
                        const totalForQ = parseFloat((q * tierPrice).toFixed(2));
                        return (
                          <SelectItem key={String(q)} id={String(q)}>
                            {q} ({totalForQ.toFixed(2)} USD) {tierPrice.toFixed(2)} / unit
                          </SelectItem>
                        );
                      })}
                    </Select>
                  </div>
                  <div style={{ marginTop: "22px", color: "var(--cim-fg-subtle, #5f6469)", display: "flex" }}>
                    <IconInfoCircle />
                  </div>
                </div>
                <span style={{ fontSize: "0.875rem", color: "var(--cim-fg-subtle, #5f6469)" }}>
                  Quantity has to be between {product.minOrderQty} - {product.maxOrderQty}
                </span>
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
              {upsellInfo && (
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "10px 12px",
                  background: "var(--cim-bg-subtle, #f8f9fa)",
                  borderTop: "1px solid var(--cim-border-subtle, #eaebeb)",
                }}>
                  {upsellApplied ? (
                    <Button variant="secondary" tone="critical" size="small" onPress={handleRemoveUpsell}>Remove upsell</Button>
                  ) : (
                    <Button variant="secondary" size="small" onPress={handleAddUpsell}>Add upsell</Button>
                  )}
                  <span style={{ fontSize: "0.875rem", color: "var(--cim-fg-base, #15191d)" }}>
                    {upsellApplied
                      ? `${upsellInfo.additionalUnits} more added for ${upsellInfo.additionalCost.toFixed(2)} USD`
                      : `${upsellInfo.additionalUnits} more for USD ${upsellInfo.additionalCost.toFixed(2)}`}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div ref={quantityRef} style={{ ...sectionCard, padding: 0, gap: 0, overflow: "hidden" }}>
              <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: "12px" }}>
                <p style={sectionHeading}>Quantity</p>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{ width: "280px" }}>
                    <Select
                      label="Quantity"
                      selectedKey={String(quantity)}
                      onSelectionChange={(val) => handleQuantityChange(Number(val))}
                    >
                      {quantityOptions.map((q) => {
                        const tierPrice = resolvePricingTier(product.pricingTiers, q);
                        const totalForQ = parseFloat((q * tierPrice).toFixed(2));
                        return (
                          <SelectItem key={String(q)} id={String(q)}>
                            {q} ({totalForQ.toFixed(2)} USD) {tierPrice.toFixed(2)} / unit
                          </SelectItem>
                        );
                      })}
                    </Select>
                  </div>
                  <div style={{ marginTop: "22px", color: "var(--cim-fg-subtle, #5f6469)", display: "flex" }}>
                    <IconInfoCircle />
                  </div>
                </div>
                <span style={{ fontSize: "0.875rem", color: "var(--cim-fg-subtle, #5f6469)" }}>
                  Quantity has to be between {product.minOrderQty} - {product.maxOrderQty}
                </span>
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
              {upsellInfo && (
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "10px 12px",
                  background: "var(--cim-bg-subtle, #f8f9fa)",
                  borderTop: "1px solid var(--cim-border-subtle, #eaebeb)",
                }}>
                  {upsellApplied ? (
                    <Button variant="secondary" tone="critical" size="small" onPress={handleRemoveUpsell}>Remove upsell</Button>
                  ) : (
                    <Button variant="secondary" size="small" onPress={handleAddUpsell}>Add upsell</Button>
                  )}
                  <span style={{ fontSize: "0.875rem", color: "var(--cim-fg-base, #15191d)" }}>
                    {upsellApplied
                      ? `${upsellInfo.additionalUnits} more added for ${upsellInfo.additionalCost.toFixed(2)} USD`
                      : `${upsellInfo.additionalUnits} more for USD ${upsellInfo.additionalCost.toFixed(2)}`}
                  </span>
                </div>
              )}
            </div>
          )}

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
                  onChange={() => { setArtworkOption("customise"); setArtworkFileName(""); }}
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
                    <>
                      <FileTrigger
                        onSelect={(files) => { if (files?.[0]) setArtworkFileName(files[0].name); }}
                        acceptedFileTypes={[".pdf", ".ai", ".eps", ".png", ".jpg", ".tiff"]}
                      >
                        <Button variant="secondary" size="small">Choose file</Button>
                      </FileTrigger>
                      <span style={{ fontSize: "0.875rem", color: "var(--cim-fg-muted, #94979b)" }}>No file selected</span>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Extra charges section */}
          {(product.extraCharges?.length ?? 0) > 0 && (
            <div ref={extraChargesRef} style={sectionCard}>
              <p style={sectionHeading}>Extra charges</p>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ width: "36px", padding: "8px 0", borderBottom: "1px solid var(--cim-border-subtle, #eaebeb)" }} />
                    <th style={{ textAlign: "left", fontSize: "0.875rem", fontWeight: 600, padding: "8px 0", borderBottom: "1px solid var(--cim-border-subtle, #eaebeb)", color: "var(--cim-fg-base)" }}>Type</th>
                    <th style={{ textAlign: "right", fontSize: "0.875rem", fontWeight: 600, padding: "8px 0", borderBottom: "1px solid var(--cim-border-subtle, #eaebeb)", color: "var(--cim-fg-base)" }}>Unit Price</th>
                    <th style={{ textAlign: "right", fontSize: "0.875rem", fontWeight: 600, padding: "8px 0", borderBottom: "1px solid var(--cim-border-subtle, #eaebeb)", color: "var(--cim-fg-base)" }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {product.extraCharges?.map((charge) => {
                    const isSelected = selectedChargeId === charge.id;
                    return (
                      <tr
                        key={charge.id}
                        onClick={() => setSelectedChargeId(isSelected ? null : charge.id)}
                        style={{ cursor: "pointer" }}
                      >
                        <td style={{ padding: "12px 0", borderBottom: "1px solid var(--cim-border-subtle, #eaebeb)" }}>
                          <input
                            type="radio"
                            name="extraCharge"
                            checked={isSelected}
                            onChange={() => setSelectedChargeId(isSelected ? null : charge.id)}
                            onClick={(e) => e.stopPropagation()}
                            style={{ ...radioInputStyle, margin: 0 }}
                          />
                        </td>
                        <td style={{ fontSize: "0.875rem", padding: "12px 8px 12px 0", borderBottom: "1px solid var(--cim-border-subtle, #eaebeb)", color: "var(--cim-fg-base)" }}>
                          {charge.label}
                        </td>
                        <td style={{ fontSize: "0.875rem", textAlign: "right", padding: "12px 0", borderBottom: "1px solid var(--cim-border-subtle, #eaebeb)", color: "var(--cim-fg-base)" }}>
                          {charge.unitPrice.toFixed(2)} USD
                        </td>
                        <td style={{ fontSize: "0.875rem", fontWeight: 600, textAlign: "right", padding: "12px 0", borderBottom: "1px solid var(--cim-border-subtle, #eaebeb)", color: "var(--cim-fg-base)" }}>
                          {charge.unitPrice.toFixed(2)} USD
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Price override section */}
          <div ref={priceOverrideRef} style={sectionCard}>
            <p style={sectionHeading}>
              Price override{" "}
              <span style={{ fontSize: "0.875rem", fontWeight: 400, color: "var(--cim-fg-subtle, #5f6469)" }}>
                (Current price USD {subtotal.toFixed(2)})
              </span>
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                <input
                  type="radio"
                  name="priceOverrideType"
                  value="new"
                  checked={priceOverrideType === "new"}
                  onChange={() => setPriceOverrideType("new")}
                  style={radioInputStyle}
                />
                <span style={{ fontSize: "0.875rem", color: "var(--cim-fg-base, #15191d)" }}>New price</span>
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                <input
                  type="radio"
                  name="priceOverrideType"
                  value="percentage"
                  checked={priceOverrideType === "percentage"}
                  onChange={() => setPriceOverrideType("percentage")}
                  style={radioInputStyle}
                />
                <span style={{ fontSize: "0.875rem", color: "var(--cim-fg-base, #15191d)" }}>Percentage based pricing</span>
              </label>
            </div>
            {(() => {
              const val = parseFloat(overrideInput);
              const hasInput = overrideInput !== "" && !isNaN(val) && val > 0;
              const isAboveOriginal = priceOverrideType === "new"
                ? hasInput && val >= subtotal
                : hasInput && val <= 0;
              const inputError = isAboveOriginal
                ? priceOverrideType === "new"
                  ? `Must be less than current price (${subtotal.toFixed(2)} USD)`
                  : "Discount percentage must be greater than 0"
                : null;
              const canSave = !priceOverrideType || !hasInput || isAboveOriginal || !overrideReason;
              return (
                <div style={{ opacity: priceOverrideType === null ? 0.4 : 1, display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      border: `1px solid ${inputError ? "var(--cim-border-critical, #d10023)" : "var(--cim-border-base, #dadcdd)"}`,
                      borderRadius: "4px",
                      overflow: "hidden",
                      width: "180px",
                    }}>
                      <span style={{
                        padding: "7px 8px",
                        background: "var(--cim-bg-subtle, #f8f9fa)",
                        fontSize: "0.875rem",
                        color: "var(--cim-fg-subtle, #5f6469)",
                        borderRight: `1px solid ${inputError ? "var(--cim-border-critical, #d10023)" : "var(--cim-border-base, #dadcdd)"}`,
                        flexShrink: 0,
                      }}>
                        {priceOverrideType === "percentage" ? "%" : "USD"}
                      </span>
                      <input
                        type="number"
                        value={overrideInput}
                        min={0}
                        max={priceOverrideType === "new" ? subtotal - 0.01 : 99.99}
                        step={0.01}
                        disabled={priceOverrideType === null}
                        onChange={(e) => setOverrideInput(e.target.value)}
                        style={{ border: "none", outline: "none", padding: "7px 8px", flex: 1, fontSize: "0.875rem", background: "white", cursor: priceOverrideType === null ? "not-allowed" : "auto" }}
                      />
                    </div>
                    {inputError && (
                      <span style={{ fontSize: "0.75rem", color: "var(--cim-fg-critical, #d10023)" }}>{inputError}</span>
                    )}
                  </div>
                  <div style={{ maxWidth: "320px" }}>
                    <Select
                      label="Reason for price override"
                      selectedKey={overrideReason}
                      onSelectionChange={(val) => setOverrideReason(String(val))}
                      placeholder="Select a reason"
                      isRequired
                      isDisabled={priceOverrideType === null}
                    >
                      <SelectItem id="customer-loyalty">Customer loyalty discount</SelectItem>
                      <SelectItem id="competitor-match">Competitor price match</SelectItem>
                      <SelectItem id="manager-approval">Manager approval</SelectItem>
                      <SelectItem id="promotional-offer">Promotional offer</SelectItem>
                      <SelectItem id="damaged-goods">Damaged goods</SelectItem>
                      <SelectItem id="other">Other</SelectItem>
                    </Select>
                  </div>
                  {appliedOverridePrice === null && (
                    <Button
                      variant="secondary"
                      size="small"
                      isDisabled={canSave}
                      onPress={() => {
                        if (priceOverrideType === "new") {
                          setAppliedOverridePrice(val);
                        } else {
                          setAppliedOverridePrice(parseFloat((subtotal * (1 - val / 100)).toFixed(2)));
                        }
                      }}
                    >
                      Save changes to price
                    </Button>
                  )}
                </div>
              );
            })()}
            {appliedOverridePrice !== null && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Button
                  variant="secondary"
                  tone="critical"
                  size="small"
                  onPress={() => {
                    setAppliedOverridePrice(null);
                    setOverrideInput("0.00");
                    setOverrideReason(null);
                    setPriceOverrideType(null);
                  }}
                >
                  Remove price override
                </Button>
                <span style={{ fontSize: "0.8125rem", color: "var(--cim-fg-success, #007e3f)", fontWeight: 500 }}>
                  Override applied: {appliedOverridePrice.toFixed(2)} USD
                </span>
              </div>
            )}
          </div>

          {/* Add-ons section */}
          <div ref={addOnsRef} style={{ border: "1px solid var(--cim-border-base, #dadcdd)", borderRadius: "6px", overflow: "hidden" }}>
            <Disclosure title="Add-ons" variant="subtle">
              <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: "8px", alignItems: "flex-start" }}>
                <Button variant="secondary" size="small">Add new accessory</Button>
                <Button variant="secondary" size="small">Add new service</Button>
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
                <span>Price</span>
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
                <span style={{ fontSize: "1.75rem", fontWeight: 600, color: "var(--cim-fg-muted, #94979b)" }}>
                  {totalDue.toFixed(2)} USD
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>
    );
  }
);

ItemConfigurationCard.displayName = "ItemConfigurationCard";
