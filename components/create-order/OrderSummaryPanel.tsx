"use client";

import { useState } from "react";
import { Button, Disclosure, TextField, NumberField } from "@cimpress-ui/react";
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
  let grossTotal = 0;
  let totalDiscount = 0;
  let totalCharges = 0;
  let totalTax = 0;

  for (const item of items) {
    const gross = item.quantity * item.unitPrice;
    const discount = gross * (item.itemDiscount / 100);
    const taxRate = item.product.taxRate ?? 8;
    const tax = item.lineTotal * (taxRate / 100);
    grossTotal += gross;
    totalDiscount += discount;
    totalTax += tax;
  }

  const subtotal = parseFloat((grossTotal - totalDiscount + totalCharges).toFixed(2));
  return {
    grossTotal: parseFloat(grossTotal.toFixed(2)),
    totalDiscount: parseFloat(totalDiscount.toFixed(2)),
    totalCharges: parseFloat(totalCharges.toFixed(2)),
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
  const [overridePriceInput, setOverridePriceInput] = useState<number | undefined>(
    draftOrder.overridePrice !== null ? draftOrder.overridePrice : undefined
  );

  const hasItems = draftOrder.items.length > 0;
  const summary = computeSummary(draftOrder.items);
  const itemCount = draftOrder.items.length;

  const displayTotal = draftOrder.overridePrice !== null
    ? draftOrder.overridePrice
    : summary.total;

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

  function handleOverridePriceChange(val: number | null) {
    setOverridePriceInput(val == null || isNaN(val) ? undefined : val);
    onOverridePriceChange(val == null || isNaN(val) ? null : val);
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
        {summary.totalCharges > 0 && (
          <PriceRow
            label="Total charges applied"
            value={`${summary.totalCharges.toFixed(2)} USD`}
          />
        )}
        <PriceRow
          label="Subtotal"
          value={`${summary.subtotal.toFixed(2)} USD`}
        />
        <PriceRow
          label={`Tax (${draftOrder.items[0]?.product.taxRate ?? 8}%)`}
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
          <span style={{ fontSize: "0.75rem", color: "var(--cim-fg-subtle, #5f6469)" }}>Yet to be added</span>
        </div>
        <span style={{ fontSize: "1rem", color: "var(--cim-fg-subtle, #5f6469)" }}>0.00 USD</span>
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
      <Disclosure title="Add code">
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
      <Disclosure title="Override price">
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", paddingTop: "4px" }}>
          <NumberField
            label="Override total price (USD)"
            value={overridePriceInput}
            onChange={handleOverridePriceChange}
            minValue={0}
            formatOptions={{ style: "decimal", minimumFractionDigits: 2, maximumFractionDigits: 2 }}
          />
          <span style={{ fontSize: "0.75rem", color: "var(--cim-fg-muted)" }}>
            Setting an override price replaces the calculated total. Use with caution.
          </span>
          {overridePriceInput !== undefined && (
            <Button variant="tertiary" size="small" onPress={() => { setOverridePriceInput(undefined); onOverridePriceChange(null); }}>
              Remove override
            </Button>
          )}
        </div>
      </Disclosure>
    </div>
  );
}
