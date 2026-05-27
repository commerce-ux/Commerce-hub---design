"use client";

import { useState } from "react";
import { Button, Disclosure, TextField } from "@cimpress-ui/react";
import type { DraftOrder, DraftOrderItem } from "@/lib/types";
import { MOCK_DISCOUNT_CODES } from "@/lib/createOrderMockData";

interface OrderSummaryPanelProps {
  draftOrder: DraftOrder;
  onDiscountApplied: (code: string, percent: number) => void;
  onPlaceOrder: () => void;
}

function computeSummary(items: DraftOrderItem[]) {
  let preTaxTotal = 0;
  let totalTax = 0;

  for (const item of items) {
    const taxRate = item.product.taxRate ?? 8;
    preTaxTotal += item.lineTotal;
    totalTax += item.lineTotal * taxRate / 100;
  }

  return {
    price: parseFloat(preTaxTotal.toFixed(2)),
    totalTax: parseFloat(totalTax.toFixed(2)),
    total: parseFloat((preTaxTotal + totalTax).toFixed(2)),
  };
}

export function OrderSummaryPanel({
  draftOrder,
  onDiscountApplied,
  onPlaceOrder,
}: OrderSummaryPanelProps) {
  const [discountCode, setDiscountCode] = useState(draftOrder.discountCode);
  const [discountError, setDiscountError] = useState<string | null>(null);
  const [discountApplied, setDiscountApplied] = useState(false);

  const hasItems = draftOrder.items.length > 0;
  const summary = computeSummary(draftOrder.items);
  const itemCount = draftOrder.items.length;
  const displayTotal = parseFloat((summary.total + draftOrder.shippingEstimate).toFixed(2));

  // Any item with >10% discount requires approval
  const requiresApproval = draftOrder.items.some((i) => i.itemDiscount > 10);

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
      gap: "12px",
    }}>
      {/* Price rows */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {/* Price */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "1rem", color: "var(--cim-fg-base, #15191d)" }}>
            Price ({itemCount} item{itemCount !== 1 ? "s" : ""})
          </span>
          <span style={{ fontSize: "1rem", color: hasItems ? "var(--cim-fg-base, #15191d)" : "var(--cim-fg-muted, #94979b)" }}>
            {summary.price.toFixed(2)} USD
          </span>
        </div>

        {/* Shipping fee */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
            <span style={{ fontSize: "1rem", color: "var(--cim-fg-base, #15191d)" }}>Shipping fee</span>
            {draftOrder.shippingEstimate === 0 && (
              <span style={{ fontSize: "0.75rem", color: "var(--cim-fg-subtle, #5f6469)" }}>Yet to be added</span>
            )}
          </div>
          <span style={{ fontSize: "1rem", color: draftOrder.shippingEstimate > 0 ? "var(--cim-fg-base, #15191d)" : "var(--cim-fg-subtle, #5f6469)" }}>
            {draftOrder.shippingEstimate.toFixed(2)} USD
          </span>
        </div>

        {/* Tax */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "1rem", color: "var(--cim-fg-base, #15191d)" }}>Tax</span>
          <span style={{ fontSize: "1rem", color: hasItems ? "var(--cim-fg-base, #15191d)" : "var(--cim-fg-muted, #94979b)" }}>
            {summary.totalTax.toFixed(2)} USD
          </span>
        </div>
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

      {/* Create quote button */}
      <div style={{ width: "100%" }}>
        <Button variant="primary" onPress={onPlaceOrder} isDisabled={!hasItems}>
          {requiresApproval ? "Create quote*" : "Create quote"}
        </Button>
      </div>

      {/* Approval warning */}
      {requiresApproval && hasItems && (
        <p style={{ margin: 0, fontSize: "0.8125rem", color: "var(--cim-fg-critical, #d10023)", lineHeight: "18px" }}>
          * Quote will require approval from supervisor due to price modification in some items exceeding 10% discount threshold
        </p>
      )}

      {/* Divider */}
      <div style={{ height: "1px", background: "var(--cim-border-subtle, #eaebeb)" }} />

      {/* Have a code? — Disclosure */}
      <Disclosure title="Have a code?" variant="subtle">
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
    </div>
  );
}
