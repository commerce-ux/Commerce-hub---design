"use client";

import { useState, useEffect } from "react";
import {
  Button,
  Select,
  SelectItem,
  TextField,
  Disclosure,
} from "@cimpress-ui/react";
import { IconCloseBold } from "@cimpress-ui/react/icons";
import type { DraftOrderItem } from "@/lib/types";

interface PriceOverrideModalProps {
  item: DraftOrderItem;
  onConfirm: (newLineTotal: number, reason: string) => void;
  onCancel: () => void;
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function safeParseFloat(s: string): number {
  const n = parseFloat(s);
  return isNaN(n) || n < 0 ? 0 : n;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PriceOverrideModal({ item, onConfirm, onCancel }: PriceOverrideModalProps) {
  const accessories = item.accessories ?? [];
  const extraCharges = item.product.extraCharges ?? [];

  // ── main item state ────────────────────────────────────────────────────────
  const [unitPriceInput, setUnitPriceInput] = useState<string>("");
  const [itemPriceInput, setItemPriceInput] = useState<string>("");

  // ── accessory state ────────────────────────────────────────────────────────
  const [accessoryUnitPrices, setAccessoryUnitPrices] = useState<Record<string, string>>({});
  const [accessoryItemPrices, setAccessoryItemPrices] = useState<Record<string, string>>({});

  // ── extra charge state ─────────────────────────────────────────────────────
  const [chargePrices, setChargePrices] = useState<Record<string, string>>({});

  // ── reason ────────────────────────────────────────────────────────────────
  const [reason, setReason] = useState<string>("");

  // ── initialise on mount ────────────────────────────────────────────────────
  useEffect(() => {
    setUnitPriceInput(item.unitPrice.toFixed(2));
    setItemPriceInput((item.unitPrice * item.quantity).toFixed(2));

    const unitMap: Record<string, string> = {};
    const itemMap: Record<string, string> = {};
    accessories.forEach((acc) => {
      unitMap[acc.id] = acc.unitPrice.toFixed(2);
      itemMap[acc.id] = (acc.unitPrice * acc.quantity).toFixed(2);
    });
    setAccessoryUnitPrices(unitMap);
    setAccessoryItemPrices(itemMap);

    const chargeMap: Record<string, string> = {};
    extraCharges.forEach((ch) => {
      chargeMap[ch.id] = ch.unitPrice.toFixed(2);
    });
    setChargePrices(chargeMap);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── bidirectional sync – main item ─────────────────────────────────────────
  function handleUnitPriceChange(val: string) {
    setUnitPriceInput(val);
    const parsed = safeParseFloat(val);
    setItemPriceInput((parsed * item.quantity).toFixed(2));
  }

  function handleItemPriceChange(val: string) {
    setItemPriceInput(val);
    const parsed = safeParseFloat(val);
    const newUnit = item.quantity > 0 ? parsed / item.quantity : 0;
    setUnitPriceInput(newUnit.toFixed(4));
  }

  // ── bidirectional sync – accessories ─────────────────────────────────────
  function handleAccUnitChange(accId: string, qty: number, val: string) {
    setAccessoryUnitPrices((prev) => ({ ...prev, [accId]: val }));
    const parsed = safeParseFloat(val);
    setAccessoryItemPrices((prev) => ({ ...prev, [accId]: (parsed * qty).toFixed(2) }));
  }

  function handleAccItemChange(accId: string, qty: number, val: string) {
    setAccessoryItemPrices((prev) => ({ ...prev, [accId]: val }));
    const parsed = safeParseFloat(val);
    const newUnit = qty > 0 ? parsed / qty : 0;
    setAccessoryUnitPrices((prev) => ({ ...prev, [accId]: newUnit.toFixed(4) }));
  }

  function handleChargeChange(chargeId: string, val: string) {
    setChargePrices((prev) => ({ ...prev, [chargeId]: val }));
  }

  // ── "clear all" resets everything to catalog originals ────────────────────
  function handleClearAll() {
    setUnitPriceInput(item.unitPrice.toFixed(2));
    setItemPriceInput((item.unitPrice * item.quantity).toFixed(2));

    const unitMap: Record<string, string> = {};
    const itemMap: Record<string, string> = {};
    accessories.forEach((acc) => {
      unitMap[acc.id] = acc.unitPrice.toFixed(2);
      itemMap[acc.id] = (acc.unitPrice * acc.quantity).toFixed(2);
    });
    setAccessoryUnitPrices(unitMap);
    setAccessoryItemPrices(itemMap);

    const chargeMap: Record<string, string> = {};
    extraCharges.forEach((ch) => {
      chargeMap[ch.id] = ch.unitPrice.toFixed(2);
    });
    setChargePrices(chargeMap);
  }

  // ── footer math ───────────────────────────────────────────────────────────
  const origBase = item.unitPrice * item.quantity;
  const parsedUnit = safeParseFloat(unitPriceInput);
  const overrideValid = unitPriceInput.trim() !== "";
  const newBase = overrideValid ? parsedUnit * item.quantity : origBase;

  const accOrigTotal = accessories.reduce((s, acc) => s + acc.unitPrice * acc.quantity, 0);
  const accNewTotal = accessories.reduce((s, acc) => {
    const raw = accessoryUnitPrices[acc.id];
    const parsed = raw !== undefined ? safeParseFloat(raw) : acc.unitPrice;
    return s + parsed * acc.quantity;
  }, 0);

  const chargeOrigTotal = extraCharges.reduce((s, ch) => s + ch.unitPrice, 0);
  const chargeNewTotal = extraCharges.reduce((s, ch) => {
    const raw = chargePrices[ch.id];
    const parsed = raw !== undefined ? safeParseFloat(raw) : ch.unitPrice;
    return s + parsed;
  }, 0);

  const footerNew = newBase + accNewTotal + chargeNewTotal;
  const footerOrig = origBase + accOrigTotal + chargeOrigTotal;
  const footerDiscount = footerOrig - footerNew;

  // ── internal notes text ───────────────────────────────────────────────────
  const notesText = [
    `Reason for price query:`,
    `Supervisor Approved:`,
    `Quote ID:`,
    `Main Item Qty & Package Price:`,
    `${item.quantity} * $${origBase.toFixed(2)} and New package price $${newBase.toFixed(2)}`,
    ...accessories.map((acc) => {
      const newUnit = safeParseFloat(accessoryUnitPrices[acc.id] ?? acc.unitPrice.toFixed(2));
      return `${acc.label}: ${acc.quantity} * $${acc.unitPrice.toFixed(2)} → $${(newUnit * acc.quantity).toFixed(2)}`;
    }),
    ...extraCharges.map((ch) => {
      const newPrice = safeParseFloat(chargePrices[ch.id] ?? ch.unitPrice.toFixed(2));
      return `${ch.label}: $${ch.unitPrice.toFixed(2)} → $${newPrice.toFixed(2)}`;
    }),
    `Item Total (excluding shipping and tax):`,
    `${footerNew.toFixed(2)} USD`,
  ].join("\n");

  // ── confirm handler ───────────────────────────────────────────────────────
  async function handleConfirm() {
    try {
      await navigator.clipboard.writeText(notesText);
    } catch {
      // clipboard write may fail silently in some environments
    }
    onConfirm(footerNew, reason);
  }

  // ── shared styles ─────────────────────────────────────────────────────────
  const cardStyle: React.CSSProperties = {
    border: "1px solid var(--cim-border-base, #dadcdd)",
    borderRadius: "6px",
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  };

  const cardHeaderStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  };

  const subtleText: React.CSSProperties = {
    fontSize: "0.875rem",
    color: "var(--cim-fg-subtle, #5f6469)",
  };

  const grid4Style: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "1fr auto 1fr 1fr",
    gap: "12px",
    alignItems: "end",
  };

  const grid2Style: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
    alignItems: "end",
  };

  const equalSignStyle: React.CSSProperties = {
    fontSize: "0.75rem",
    color: "var(--cim-fg-success, #007e3f)",
    alignSelf: "stretch",
    display: "flex",
    alignItems: "center",
    flexShrink: 0,
    paddingBottom: "8px",
  };

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "64px",
      }}
    >
      {/* Inner card */}
      <div
        style={{
          background: "white",
          borderRadius: "8px",
          width: "min(100%, 864px)",
          maxHeight: "calc(100vh - 128px)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* ── Header ────────────────────────────────────────────────────── */}
        <div
          style={{
            borderBottom: "1px solid var(--cim-border-base, #dadcdd)",
            padding: "16px 24px",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontWeight: 600, fontSize: "1.125rem", color: "var(--cim-fg-base, #15191d)" }}>
              Apply price override
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Button variant="tertiary" onPress={handleClearAll}>
                Clear all
              </Button>
              <button
                aria-label="Close modal"
                onClick={onCancel}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "4px",
                  borderRadius: "4px",
                  color: "var(--cim-fg-base, #15191d)",
                }}
              >
                <IconCloseBold />
              </button>
            </div>
          </div>

          {item.itemDiscount > 0 && (
            <div
              style={{
                fontSize: "0.875rem",
                color: "var(--cim-fg-warning, #a15e0c)",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              Price override will remove any previous discounts and require a approval workflow
            </div>
          )}
        </div>

        {/* ── Scrollable body ───────────────────────────────────────────── */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "0 24px",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          {/* top spacer */}
          <div style={{ height: "16px" }} />

          {/* ── Main item card ────────────────────────────────────────────── */}
          <div style={cardStyle}>
            {/* card header */}
            <div style={cardHeaderStyle}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontWeight: 600, fontSize: "0.9375rem", color: "var(--cim-fg-base, #15191d)" }}>
                  {item.product.name}
                </span>
                <span style={subtleText}>(Main item)</span>
              </div>
              <Button
                variant="tertiary"
                tone="base"
                onPress={() => {
                  setUnitPriceInput(item.unitPrice.toFixed(2));
                  setItemPriceInput((item.unitPrice * item.quantity).toFixed(2));
                }}
              >
                Clear
              </Button>
            </div>

            {/* thumbnail + original price info */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.product.imageUrl}
                alt={item.product.name}
                style={{ width: 64, height: 64, objectFit: "cover", borderRadius: "6px", flexShrink: 0 }}
              />
              <span style={subtleText}>
                Original price: {origBase.toFixed(2)} USD / ({item.quantity} ×{" "}
                {item.unitPrice.toFixed(2)}/unit)
              </span>
            </div>

            {/* 4-col grid */}
            <div style={grid4Style}>
              <TextField
                label="Discounted unit price"
                value={unitPriceInput}
                onChange={handleUnitPriceChange}
                type="number"

              />
              <span style={equalSignStyle}>=</span>
              <TextField
                label="Discounted item price"
                value={itemPriceInput}
                onChange={handleItemPriceChange}
                type="number"

                prefix="USD"
              />
              <TextField
                label="Discount"
                value={(origBase - safeParseFloat(itemPriceInput)).toFixed(2)}
                isReadOnly
                prefix="USD"
              />
            </div>
          </div>

          {/* ── Accessory cards ───────────────────────────────────────────── */}
          {accessories.map((acc) => {
            const origAccBase = acc.unitPrice * acc.quantity;
            const newAccItem = safeParseFloat(accessoryItemPrices[acc.id] ?? (origAccBase).toFixed(2));
            const accDiscount = origAccBase - newAccItem;

            return (
              <div key={acc.id} style={cardStyle}>
                <div style={cardHeaderStyle}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontWeight: 600, fontSize: "0.9375rem", color: "var(--cim-fg-base, #15191d)" }}>
                      {acc.label}
                    </span>
                    <span style={subtleText}>(Accessory)</span>
                  </div>
                  <Button
                    variant="tertiary"
                    tone="base"
                    onPress={() => {
                      setAccessoryUnitPrices((prev) => ({ ...prev, [acc.id]: acc.unitPrice.toFixed(2) }));
                      setAccessoryItemPrices((prev) => ({ ...prev, [acc.id]: origAccBase.toFixed(2) }));
                    }}
                  >
                    Clear
                  </Button>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span style={subtleText}>
                    Original price: {origAccBase.toFixed(2)} USD / ({acc.quantity} ×{" "}
                    {acc.unitPrice.toFixed(2)}/unit)
                  </span>
                </div>

                <div style={grid4Style}>
                  <TextField
                    label="Discounted unit price"
                    value={accessoryUnitPrices[acc.id] ?? acc.unitPrice.toFixed(2)}
                    onChange={(val) => handleAccUnitChange(acc.id, acc.quantity, val)}
                    type="number"
    
                  />
                  <span style={equalSignStyle}>=</span>
                  <TextField
                    label="Discounted item price"
                    value={accessoryItemPrices[acc.id] ?? origAccBase.toFixed(2)}
                    onChange={(val) => handleAccItemChange(acc.id, acc.quantity, val)}
                    type="number"
    
                    prefix="USD"
                  />
                  <TextField
                    label="Discount"
                    value={accDiscount.toFixed(2)}
                    isReadOnly
                    prefix="USD"
                  />
                </div>
              </div>
            );
          })}

          {/* ── Extra charge cards ────────────────────────────────────────── */}
          {extraCharges.map((charge) => {
            const newChargePrice = safeParseFloat(chargePrices[charge.id] ?? charge.unitPrice.toFixed(2));
            const chargeDiscount = charge.unitPrice - newChargePrice;

            return (
              <div key={charge.id} style={cardStyle}>
                <div style={cardHeaderStyle}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontWeight: 600, fontSize: "0.9375rem", color: "var(--cim-fg-base, #15191d)" }}>
                      {charge.label}
                    </span>
                    <span style={subtleText}>(Extra charges)</span>
                  </div>
                  <Button
                    variant="tertiary"
                    tone="base"
                    onPress={() => {
                      setChargePrices((prev) => ({ ...prev, [charge.id]: charge.unitPrice.toFixed(2) }));
                    }}
                  >
                    Clear
                  </Button>
                </div>

                <span style={subtleText}>
                  Original price: {charge.unitPrice.toFixed(2)} USD
                </span>

                <div style={grid2Style}>
                  <TextField
                    label="Discounted price"
                    value={chargePrices[charge.id] ?? charge.unitPrice.toFixed(2)}
                    onChange={(val) => handleChargeChange(charge.id, val)}
                    type="number"
    
                    prefix="USD"
                  />
                  <TextField
                    label="Discount"
                    value={chargeDiscount.toFixed(2)}
                    isReadOnly
                    prefix="USD"
                  />
                </div>
              </div>
            );
          })}

          {/* ── Reason select ─────────────────────────────────────────────── */}
          <Select
            label="Select reason for offer customization"
            isRequired
            placeholder="Select an item"
            selectedKey={reason || null}
            onSelectionChange={(key) => setReason(key ? String(key) : "")}
          >
            <SelectItem id="promotional_offer">Promotional offer</SelectItem>
            <SelectItem id="loyalty_discount">Loyalty discount</SelectItem>
            <SelectItem id="bulk_deal">Bulk deal</SelectItem>
            <SelectItem id="error_correction">Error correction</SelectItem>
            <SelectItem id="manager_approval">Manager approval</SelectItem>
            <SelectItem id="other">Other</SelectItem>
          </Select>

          {/* ── Internal notes disclosure ─────────────────────────────────── */}
          <Disclosure title="Internal notes">
            <pre
              style={{
                margin: 0,
                fontFamily: "inherit",
                fontSize: "0.875rem",
                color: "var(--cim-fg-base, #15191d)",
                whiteSpace: "pre-wrap",
                lineHeight: "1.5",
              }}
            >
              {[
                `Reason for price query:`,
                `Supervisor Approved:`,
                `Quote ID:`,
                `Main Item Qty & Package Price:`,
                `${item.quantity} * $${origBase.toFixed(2)} and New package price $${newBase.toFixed(2)}`,
                ...accessories.map((acc) => {
                  const newUnit = safeParseFloat(accessoryUnitPrices[acc.id] ?? acc.unitPrice.toFixed(2));
                  return `${acc.label}: ${acc.quantity} * $${acc.unitPrice.toFixed(2)} → $${(newUnit * acc.quantity).toFixed(2)}`;
                }),
                ...extraCharges.map((ch) => {
                  const newPrice = safeParseFloat(chargePrices[ch.id] ?? ch.unitPrice.toFixed(2));
                  return `${ch.label}: $${ch.unitPrice.toFixed(2)} → $${newPrice.toFixed(2)}`;
                }),
                `Item Total (excluding shipping and tax):`,
                `${footerNew.toFixed(2)} USD`,
              ].join("\n")}
            </pre>
          </Disclosure>

          {/* bottom spacer */}
          <div style={{ height: "8px" }} />
        </div>

        {/* ── Footer ────────────────────────────────────────────────────── */}
        <div
          style={{
            borderTop: "1px solid var(--cim-border-base, #dadcdd)",
            padding: "16px 24px",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            flexShrink: 0,
            gap: "16px",
          }}
        >
          {/* Left: total + discount */}
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <span style={{ fontWeight: 600, fontSize: "1.125rem", color: "var(--cim-fg-base, #15191d)" }}>
              {footerNew.toFixed(2)} USD (Exc tax)
            </span>
            {footerDiscount > 0 && (
              <span style={{ fontSize: "0.875rem", color: "var(--cim-fg-success, #007e3f)" }}>
                Total discount of {footerDiscount.toFixed(2)} USD
              </span>
            )}
          </div>

          {/* Right: actions */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Button variant="secondary" onPress={onCancel}>
                Cancel
              </Button>
              <Button
                variant="primary"
                isDisabled={!reason}
                onPress={handleConfirm}
              >
                Confirm discount
              </Button>
            </div>
            <span style={{ fontSize: "0.75rem", color: "var(--cim-fg-subtle, #5f6469)" }}>
              Confirming will copy the notes to your clipboard
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
