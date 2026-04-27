"use client";

import { useState } from "react";
import { Button, Disclosure, TextField, Select, SelectItem } from "@cimpress-ui/react";
import type { DraftOrder, DraftOrderItem } from "@/lib/types";
import { MOCK_DISCOUNT_CODES } from "@/lib/createOrderMockData";

interface OrderSummaryPanelProps {
  draftOrder: DraftOrder;
  onDiscountApplied: (code: string, percent: number) => void;
  onOverridePriceChange: (price: number | null) => void;
  onPlaceOrder: () => void;
}

function PriceRow({
  label,
  value,
  subtle,
  accent,
  indent,
}: {
  label: string;
  value: string;
  subtle?: boolean;
  accent?: boolean;
  indent?: boolean;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingLeft: indent ? "12px" : "0" }}>
      <span style={{ fontSize: "1rem", color: subtle ? "var(--cim-fg-subtle, #5f6469)" : "var(--cim-fg-base, #15191d)" }}>
        {label}
      </span>
      <span style={{ fontSize: "1rem", color: accent ? "var(--cim-fg-success, #15803d)" : (subtle ? "var(--cim-fg-subtle, #5f6469)" : "var(--cim-fg-base, #15191d)") }}>
        {value}
      </span>
    </div>
  );
}

function computeSummary(items: DraftOrderItem[]) {
  // lineTotal is the pre-tax subtotal per item (base + artwork + extras + accessories, after item discount)
  let preTaxTotal = 0;
  let totalDiscount = 0;
  let totalTax = 0;

  for (const item of items) {
    const taxRate = item.product.taxRate ?? 8;
    const itemDiscount = item.quantity * item.unitPrice * (item.itemDiscount / 100);
    preTaxTotal += item.lineTotal;
    totalDiscount += itemDiscount;
    totalTax += item.lineTotal * taxRate / 100;
  }

  const grossTotal = parseFloat((preTaxTotal + totalDiscount).toFixed(2)); // before item discounts
  const subtotal = parseFloat(preTaxTotal.toFixed(2));                      // after item discounts
  return {
    grossTotal,
    totalDiscount: parseFloat(totalDiscount.toFixed(2)),
    subtotal,
    totalTax: parseFloat(totalTax.toFixed(2)),
    total: parseFloat((subtotal + totalTax).toFixed(2)),
  };
}

export function OrderSummaryPanel({
  draftOrder,
  onDiscountApplied,
  onOverridePriceChange,
  onPlaceOrder,
}: OrderSummaryPanelProps) {
  const [discountCode, setDiscountCode] = useState(draftOrder.discountCode);
  const [discountError, setDiscountError] = useState<string | null>(null);
  const [discountApplied, setDiscountApplied] = useState(false);
  const [priceOverrideType, setPriceOverrideType] = useState<"new" | "percentage" | null>(null);
  const [overrideInput, setOverrideInput] = useState("0.00");
  const [overrideReason, setOverrideReason] = useState<string | null>(null);
  const [appliedOverridePrice, setAppliedOverridePrice] = useState<number | null>(null);

  const hasItems = draftOrder.items.length > 0;
  const summary = computeSummary(draftOrder.items);
  const itemCount = draftOrder.items.length;

  const displayTotal = appliedOverridePrice !== null
    ? appliedOverridePrice
    : parseFloat((summary.total + draftOrder.shippingEstimate).toFixed(2));

  function handleApplyDiscount() {
    const code = discountCode.trim().toUpperCase();
    if (!code) {
      setDiscountError("Please enter a discount code");
      return;
    }
    const percent = MOCK_DISCOUNT_CODES[code];
    if (percent === undefined) {
      setDiscountError(`Code "${code}" is not valid or has expired`);
      setDiscountApplied(false);
      return;
    }
    setDiscountError(null);
    setDiscountApplied(true);
    onDiscountApplied(code, percent);
  }


  return (
    <div style={{
      position: "sticky",
      top: "80px",
      background: "white",
      border: "1px solid var(--cim-border-base, #dadcdd)",
      borderRadius: "6px",
      padding: "16px",
      display: "flex",
      flexDirection: "column",
      gap: "16px",
    }}>
      {/* Price breakdown */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <PriceRow
          label={`Total Price (${itemCount} item${itemCount !== 1 ? "s" : ""})`}
          value={`${summary.grossTotal.toFixed(2)} USD`}
          subtle={!hasItems}
        />
        <PriceRow
          label="Total Discount"
          value={`${summary.totalDiscount.toFixed(2)} USD`}
          accent={summary.totalDiscount > 0}
        />
        <PriceRow
          label="Subtotal"
          value={`${summary.subtotal.toFixed(2)} USD`}
        />
        <PriceRow
          label="Tax"
          value={`${summary.totalTax.toFixed(2)} USD`}
          subtle={!hasItems}
        />
        {draftOrder.orderDiscount > 0 && (
          <PriceRow
            label={`Order discount (${draftOrder.orderDiscount}%)`}
            value={`-${(summary.subtotal * draftOrder.orderDiscount / 100).toFixed(2)} USD`}
            accent
          />
        )}
      </div>

      {/* Shipping cost — gray rounded box */}
      <div style={{
        background: "var(--cim-bg-subtle, #f8f9fa)",
        borderRadius: "6px",
        padding: "8px",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          <span style={{ fontSize: "1rem", color: "var(--cim-fg-subtle, #5f6469)" }}>Shipping cost</span>
          {draftOrder.shippingEstimate === 0 && (
            <span style={{ fontSize: "0.75rem", color: "var(--cim-fg-subtle, #5f6469)" }}>Yet to be added</span>
          )}
        </div>
        <span style={{ fontSize: "1rem", color: draftOrder.shippingEstimate > 0 ? "var(--cim-fg-base, #15191d)" : "var(--cim-fg-subtle, #5f6469)" }}>
          {draftOrder.shippingEstimate.toFixed(2)} USD
        </span>
      </div>

      {/* Divider */}
      <div style={{ height: "1px", background: "var(--cim-border-base, #dadcdd)" }} />

      {/* Total due */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--cim-fg-base, #15191d)" }}>
          Total due
        </span>
        <span style={{
          fontSize: "1.75rem",
          fontWeight: 600,
          color: hasItems ? "var(--cim-fg-base, #15191d)" : "var(--cim-fg-muted, #94979b)",
        }}>
          {displayTotal.toFixed(2)} USD
        </span>
      </div>

      {/* Place Order button */}
      <div style={{ width: "100%" }}>
        <Button variant="primary" onPress={onPlaceOrder} isDisabled={!hasItems}>
          Place Order
        </Button>
      </div>

      {/* Divider */}
      <div style={{ height: "1px", background: "var(--cim-border-subtle, #eaebeb)" }} />

      {/* Add code — Disclosure */}
      <Disclosure title="Add code" variant="subtle">
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", paddingTop: "4px" }}>
          <div style={{ display: "flex", gap: "8px", alignItems: "flex-end" }}>
            <div style={{ flex: 1 }}>
              <TextField
                label="Discount code"
                placeholder="e.g. SAVE10"
                value={discountCode}
                onChange={(val) => {
                  setDiscountCode(val);
                  setDiscountError(null);
                  if (!val) {
                    setDiscountApplied(false);
                    onDiscountApplied("", 0);
                  }
                }}
              />
              {discountError && (
                <p style={{ fontSize: "0.75rem", color: "var(--cim-fg-critical, #b91c1c)", margin: "4px 0 0" }}>
                  {discountError}
                </p>
              )}
            </div>
            <Button variant="secondary" size="small" onPress={handleApplyDiscount}>
              Apply
            </Button>
          </div>
          {discountApplied && (
            <span style={{ fontSize: "0.8125rem", color: "var(--cim-fg-success, #15803d)", fontWeight: 500 }}>
              Code applied — {MOCK_DISCOUNT_CODES[discountCode.trim().toUpperCase()]}% off order total
            </span>
          )}
          <span style={{ fontSize: "0.75rem", color: "var(--cim-fg-muted)" }}>
            Try: SAVE10, PROMO20, VIP15, NEWCUST25
          </span>
        </div>
      </Disclosure>

      {/* Override price — Disclosure */}
      <Disclosure title="Override price" variant="subtle">
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", paddingTop: "4px" }}>
          <p style={{ fontSize: "1rem", fontWeight: 600, color: "var(--cim-fg-base, #15191d)", margin: 0 }}>
            Price override{" "}
            <span style={{ fontSize: "0.875rem", fontWeight: 400, color: "var(--cim-fg-subtle, #5f6469)" }}>
              (Current price USD {summary.total.toFixed(2)})
            </span>
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
              <input
                type="radio"
                name="orderPriceOverrideType"
                value="new"
                checked={priceOverrideType === "new"}
                onChange={() => setPriceOverrideType("new")}
                style={{ accentColor: "var(--cim-fg-accent, #0091b8)", cursor: "pointer", width: "16px", height: "16px", flexShrink: 0 }}
              />
              <span style={{ fontSize: "0.875rem", color: "var(--cim-fg-base, #15191d)" }}>New price</span>
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
              <input
                type="radio"
                name="orderPriceOverrideType"
                value="percentage"
                checked={priceOverrideType === "percentage"}
                onChange={() => setPriceOverrideType("percentage")}
                style={{ accentColor: "var(--cim-fg-accent, #0091b8)", cursor: "pointer", width: "16px", height: "16px", flexShrink: 0 }}
              />
              <span style={{ fontSize: "0.875rem", color: "var(--cim-fg-base, #15191d)" }}>Percentage based pricing</span>
            </label>
          </div>
          {(() => {
            const val = parseFloat(overrideInput);
            const hasInput = overrideInput !== "" && !isNaN(val) && val > 0;
            const isAboveOriginal = priceOverrideType === "new"
              ? hasInput && val >= summary.total
              : hasInput && val <= 0;
            const inputError = isAboveOriginal
              ? priceOverrideType === "new"
                ? `Must be less than current price (${summary.total.toFixed(2)} USD)`
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
                      max={priceOverrideType === "new" ? summary.total - 0.01 : 99.99}
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
                    onSelectionChange={(v) => setOverrideReason(String(v))}
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
                      const saved = priceOverrideType === "new"
                        ? val
                        : parseFloat((summary.total * (1 - val / 100)).toFixed(2));
                      setAppliedOverridePrice(saved);
                      onOverridePriceChange(saved);
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
                  onOverridePriceChange(null);
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
      </Disclosure>
    </div>
  );
}
