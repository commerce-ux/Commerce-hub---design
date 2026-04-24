"use client";

import { useState, useRef } from "react";
import { Button, TextField, Checkbox } from "@cimpress-ui/react";
import { IconArrowLeft, IconCloseBold, IconDeliveryTruck } from "@cimpress-ui/react/icons";
import type { SavedAddress, ShippingMethod, DraftOrderItem, DraftOrder } from "@/lib/types";
import { MOCK_SAVED_ADDRESSES, MOCK_SHIPPING_METHODS } from "@/lib/createOrderMockData";

type DrawerView = "main" | "add-address" | "select-shipping" | "review";
type AddressTarget = "shipping" | "billing";
type ReviewTab = "order-details" | "address-shipping";

interface AddressForm {
  firstName: string;
  lastName: string;
  company: string;
  streetName: string;
  additionalStreet: string;
  city: string;
  country: string;
  state: string;
  postalCode: string;
  phone: string;
  defaultShipping: boolean;
  defaultBilling: boolean;
}

const EMPTY_FORM: AddressForm = {
  firstName: "", lastName: "", company: "", streetName: "",
  additionalStreet: "", city: "", country: "", state: "",
  postalCode: "", phone: "", defaultShipping: false, defaultBilling: false,
};

interface ShippingDrawerProps {
  isOpen: boolean;
  items: DraftOrderItem[];
  draftOrder: DraftOrder;
  onClose: () => void;
  onReviewToCheckout: () => void;
  onShippingCostChange?: (cost: number) => void;
}

function DefaultBadge() {
  return (
    <span style={{
      fontSize: "0.75rem", fontWeight: 600, padding: "2px 8px",
      borderRadius: "10px", background: "var(--cim-bg-subtle,#f8f9fa)",
      color: "var(--cim-fg-base,#15191d)", border: "1px solid var(--cim-border-base,#dadcdd)",
    }}>
      Default
    </span>
  );
}

function ReviewPriceRow({
  label, value, subtle, accent, indent,
}: {
  label: string; value: string; subtle?: boolean; accent?: boolean; indent?: boolean;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingLeft: indent ? "16px" : "0" }}>
      <span style={{ fontSize: "1rem", color: subtle ? "var(--cim-fg-subtle,#5f6469)" : "var(--cim-fg-base,#15191d)" }}>
        {label}
      </span>
      <span style={{ fontSize: "1rem", color: accent ? "var(--cim-fg-success,#15803d)" : (subtle ? "var(--cim-fg-subtle,#5f6469)" : "var(--cim-fg-base,#15191d)") }}>
        {value}
      </span>
    </div>
  );
}

function computeReviewSummary(items: DraftOrderItem[]) {
  // lineTotal is the pre-tax subtotal per item (base + artwork + accessories, after discount)
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
    totalQty: items.reduce((sum, i) => sum + i.quantity, 0),
  };
}

export function ShippingDrawer({ isOpen, items, draftOrder, onClose, onReviewToCheckout, onShippingCostChange }: ShippingDrawerProps) {
  const [view, setView] = useState<DrawerView>("main");
  const [reviewTab, setReviewTab] = useState<ReviewTab>("order-details");
  const [addressTarget, setAddressTarget] = useState<AddressTarget>("shipping");
  const [addresses, setAddresses] = useState<SavedAddress[]>(MOCK_SAVED_ADDRESSES);
  const defaultAddr = MOCK_SAVED_ADDRESSES.find((a) => a.isDefault) ?? MOCK_SAVED_ADDRESSES[0] ?? null;
  const firstMethod = MOCK_SHIPPING_METHODS[0] ?? null;

  const [shippingAddressId, setShippingAddressId] = useState<string | null>(defaultAddr?.id ?? null);
  const [billingAddressId, setBillingAddressId] = useState<string | null>(null);
  const [billingSameAsShipping, setBillingSameAsShipping] = useState(true);
  const [shippingMethodId, setShippingMethodId] = useState<string | null>(firstMethod?.id ?? null);
  const [pendingMethodId, setPendingMethodId] = useState<string | null>(null);
  const [expandedMethodId, setExpandedMethodId] = useState<string | null>(firstMethod?.id ?? null);
  const [form, setForm] = useState<AddressForm>(EMPTY_FORM);

  const reviewBodyRef = useRef<HTMLDivElement>(null);
  const orderDetailsSectionRef = useRef<HTMLDivElement>(null);
  const addressShippingSectionRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const shippingAddress = addresses.find((a) => a.id === shippingAddressId) ?? null;
  const billingAddress = billingSameAsShipping ? shippingAddress : addresses.find((a) => a.id === billingAddressId) ?? null;
  const selectedMethod = MOCK_SHIPPING_METHODS.find((m) => m.id === shippingMethodId) ?? null;
  const canReview = !!shippingAddressId && !!shippingMethodId;

  function handleAddAddress() {
    if (!form.firstName || !form.lastName || !form.streetName || !form.city || !form.country || !form.postalCode || !form.phone) return;
    const newAddr: SavedAddress = {
      id: `addr-${Date.now()}`,
      label: form.defaultShipping ? "Default" : "New",
      name: `${form.firstName} ${form.lastName}`,
      company: form.company || undefined,
      lines: [
        form.streetName,
        form.additionalStreet || undefined,
        `${form.city}, ${form.state}`,
        `${form.postalCode}, ${form.country}`,
      ].filter(Boolean) as string[],
      phone: form.phone,
      isDefault: form.defaultShipping,
    };
    const updated = form.defaultShipping
      ? addresses.map((a) => ({ ...a, isDefault: false })).concat(newAddr)
      : [...addresses, newAddr];
    setAddresses(updated);
    if (addressTarget === "shipping" || form.defaultShipping) {
      setShippingAddressId(newAddr.id);
      if (form.defaultBilling || billingSameAsShipping) setBillingAddressId(newAddr.id);
    } else {
      setBillingAddressId(newAddr.id);
    }
    setForm(EMPTY_FORM);
    setView("main");
  }

  function openAddAddress(target: AddressTarget) {
    setAddressTarget(target);
    setForm(EMPTY_FORM);
    setView("add-address");
  }

  function handleConfirmShipping() {
    const confirmedId = pendingMethodId ?? shippingMethodId;
    if (confirmedId) {
      setShippingMethodId(confirmedId);
      const method = MOCK_SHIPPING_METHODS.find((m) => m.id === confirmedId);
      if (method) onShippingCostChange?.(method.price);
    }
    setView("main");
  }

  // ── Add Address view ───────────────────────────────────────────────────────
  if (view === "add-address") {
    const isFormValid = !!(form.firstName && form.lastName && form.streetName && form.city && form.country && form.postalCode && form.phone);
    return (
      <DrawerShell onBackdropClick={onClose}>
        <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "20px 16px", borderBottom: "1px solid var(--cim-border-subtle,#eaebeb)" }}>
            <button onClick={() => setView("main")} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", padding: "4px", color: "var(--cim-fg-base)" }}>
              <IconArrowLeft />
            </button>
            <h2 style={{ fontSize: "1.125rem", fontWeight: 600, margin: 0, color: "var(--cim-fg-base)" }}>Add New Address</h2>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "24px 16px", display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <TextField label="First Name" isRequired value={form.firstName} onChange={(v) => setForm((f) => ({ ...f, firstName: v }))} />
              <TextField label="Last Name" isRequired value={form.lastName} onChange={(v) => setForm((f) => ({ ...f, lastName: v }))} />
            </div>
            <TextField label="Company (Required for business address)" value={form.company} onChange={(v) => setForm((f) => ({ ...f, company: v }))} />
            <TextField label="Street Name" isRequired value={form.streetName} onChange={(v) => setForm((f) => ({ ...f, streetName: v }))} />
            <TextField label="Additional Street Info" value={form.additionalStreet} onChange={(v) => setForm((f) => ({ ...f, additionalStreet: v }))} />
            <TextField label="City / Town" isRequired value={form.city} onChange={(v) => setForm((f) => ({ ...f, city: v }))} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <TextField label="Country" isRequired value={form.country} onChange={(v) => setForm((f) => ({ ...f, country: v }))} />
              <TextField label="State / Province" value={form.state} onChange={(v) => setForm((f) => ({ ...f, state: v }))} />
            </div>
            <TextField label="Postal Code" isRequired value={form.postalCode} onChange={(v) => setForm((f) => ({ ...f, postalCode: v }))} />
            <TextField label="Phone" isRequired value={form.phone} onChange={(v) => setForm((f) => ({ ...f, phone: v }))} />
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", paddingTop: "8px" }}>
              <Checkbox isSelected={form.defaultShipping} onChange={(v) => setForm((f) => ({ ...f, defaultShipping: v }))}>Set as default shipping address</Checkbox>
              <Checkbox isSelected={form.defaultBilling} onChange={(v) => setForm((f) => ({ ...f, defaultBilling: v }))}>Set as default billing address</Checkbox>
            </div>
          </div>
          <div style={{ padding: "16px", borderTop: "1px solid var(--cim-border-subtle,#eaebeb)", display: "flex", gap: "12px" }}>
            <Button variant="secondary" onPress={() => setView("main")} UNSAFE_style={{ flex: 1 }}>Cancel</Button>
            <Button variant="primary" isDisabled={!isFormValid} onPress={handleAddAddress} UNSAFE_style={{ flex: 1 }}>Confirm</Button>
          </div>
        </div>
      </DrawerShell>
    );
  }

  // ── Select Shipping Speed view ─────────────────────────────────────────────
  if (view === "select-shipping") {
    return (
      <DrawerShell onBackdropClick={onClose}>
        <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "20px 16px", borderBottom: "1px solid var(--cim-border-subtle,#eaebeb)" }}>
            <button onClick={() => setView("main")} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", padding: "4px", color: "var(--cim-fg-base)" }}>
              <IconArrowLeft />
            </button>
            <h2 style={{ fontSize: "1.125rem", fontWeight: 600, margin: 0, color: "var(--cim-fg-base)" }}>Select Shipping Speed</h2>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
            {MOCK_SHIPPING_METHODS.map((method) => {
              const isSelected = (pendingMethodId ?? shippingMethodId) === method.id;
              const isExpanded = expandedMethodId === method.id || isSelected;
              return (
                <div
                  key={method.id}
                  onClick={() => { setPendingMethodId(method.id); setExpandedMethodId(method.id); }}
                  style={{
                    border: `1.5px solid ${isSelected ? "var(--cim-fg-accent,#007798)" : "var(--cim-border-base,#dadcdd)"}`,
                    borderRadius: "6px", overflow: "hidden", cursor: "pointer",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "14px 16px" }}>
                    <div style={{
                      width: "18px", height: "18px", borderRadius: "50%", flexShrink: 0,
                      border: `2px solid ${isSelected ? "var(--cim-fg-accent,#007798)" : "var(--cim-border-base,#dadcdd)"}`,
                      background: isSelected ? "var(--cim-fg-accent,#007798)" : "white",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {isSelected && <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "white" }} />}
                    </div>
                    <span style={{ flex: 1, fontWeight: 600, fontSize: "1rem", color: "var(--cim-fg-base)" }}>{method.name}</span>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      {method.price === 0 ? (
                        <span style={{ fontSize: "0.875rem" }}>
                          <span style={{ color: "var(--cim-fg-critical,#d10023)", textDecoration: "line-through", marginRight: "6px" }}>{method.originalPrice?.toFixed(2)} USD</span>
                          <span style={{ fontWeight: 700, color: "var(--cim-fg-base)" }}>0.00 Free</span>
                        </span>
                      ) : (
                        <span style={{ fontWeight: 700, fontSize: "1rem", color: "var(--cim-fg-base)" }}>{method.price.toFixed(2)} USD*</span>
                      )}
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setExpandedMethodId(isExpanded ? null : method.id); }}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--cim-fg-subtle)", padding: "2px", display: "flex" }}
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d={isExpanded ? "M3 10l5-5 5 5" : "M3 6l5 5 5-5"} stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </div>
                  {isExpanded && (
                    <div style={{ borderTop: "1px solid var(--cim-border-subtle,#eaebeb)", padding: "12px 16px 14px 46px", background: "var(--cim-bg-subtle,#f8f9fa)" }}>
                      <p style={{ margin: "0 0 6px", fontSize: "0.875rem", color: "var(--cim-fg-base)" }}>Estimated arrival by {method.estimatedDeliveryLabel}</p>
                      {items.map((item) => (
                        <p key={item.draftItemId} style={{ margin: 0, fontSize: "0.8125rem", color: "var(--cim-fg-subtle)" }}>{item.product.name}: {method.estimatedDeliveryLabel}</p>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            <p style={{ fontSize: "0.75rem", color: "var(--cim-fg-muted,#94979b)", margin: "4px 0 0" }}>*Taxes excluded</p>
          </div>
          <div style={{ padding: "16px 16px 24px", borderTop: "1px solid var(--cim-border-base,#dadcdd)", display: "flex", gap: "12px" }}>
            <Button variant="secondary" onPress={() => setView("main")} UNSAFE_style={{ flex: 1 }}>Back</Button>
            <Button variant="primary" isDisabled={!pendingMethodId && !shippingMethodId} onPress={handleConfirmShipping} UNSAFE_style={{ flex: 1 }}>Confirm shipping speed</Button>
          </div>
        </div>
      </DrawerShell>
    );
  }

  // ── Review to Checkout view ────────────────────────────────────────────────
  if (view === "review") {
    const summary = computeReviewSummary(items);
    const totalDue = parseFloat((summary.subtotal + summary.totalTax + draftOrder.shippingEstimate).toFixed(2));
    const taxRate = items[0]?.product.taxRate ?? 8;

    const itemCount = items.length;
    // grossTotal = sum of lineTotals (pre-tax), includes base + artwork + accessories — the full item cost
    const orderPrice = summary.grossTotal;

    return (
      <DrawerShell onBackdropClick={onClose} width={620}>
        <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "20px 16px 16px", borderBottom: "1px solid var(--cim-border-subtle,#eaebeb)" }}>
            <button
              onClick={() => setView("main")}
              style={{ background: "none", border: "none", cursor: "pointer", display: "flex", padding: "4px", color: "var(--cim-fg-base)", borderRadius: "4px", flexShrink: 0 }}
            >
              <IconArrowLeft />
            </button>
            <h2 style={{ fontSize: "1.125rem", fontWeight: 600, margin: 0, color: "var(--cim-fg-base,#15191d)" }}>
              Review to checkout
            </h2>
          </div>

          {/* Tabs — navigation only, both sections always visible */}
          <div style={{ display: "flex", borderBottom: "2px solid var(--cim-border-base,#dadcdd)", padding: "0 16px", gap: "4px" }}>
            {([
              { id: "order-details" as ReviewTab, label: "Order details", ref: orderDetailsSectionRef },
              { id: "address-shipping" as ReviewTab, label: "Address & shipping speed", ref: addressShippingSectionRef },
            ]).map(({ id, label, ref: sectionRef }) => {
              const isActive = reviewTab === id;
              return (
                <button
                  key={id}
                  onClick={() => {
                    setReviewTab(id);
                    sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "12px 4px",
                    fontSize: "0.9375rem",
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? "var(--cim-fg-accent,#007798)" : "var(--cim-fg-base,#15191d)",
                    borderBottom: isActive ? "2px solid var(--cim-fg-accent,#007798)" : "2px solid transparent",
                    marginBottom: "-2px",
                    whiteSpace: "nowrap",
                    marginRight: "16px",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Body — both sections always rendered, tabs scroll to each */}
          <div ref={reviewBodyRef} style={{ flex: 1, overflowY: "auto", padding: "24px 16px", display: "flex", flexDirection: "column", gap: "32px" }}>

            {/* ── ORDER DETAILS SECTION ── */}
            <div ref={orderDetailsSectionRef} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <h3 style={{ margin: 0, fontSize: "1.125rem", fontWeight: 600, color: "var(--cim-fg-base,#15191d)" }}>
                Order details
              </h3>
              <div style={{
                border: "1px solid var(--cim-border-base,#dadcdd)",
                borderRadius: "6px",
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}>
                {/* Price (N items) — includes artwork charges baked in */}
                <ReviewPriceRow
                  label={`Price (${itemCount} item${itemCount !== 1 ? "s" : ""})`}
                  value={`${orderPrice.toFixed(2)} USD`}
                />

                {/* Discount — always shown, muted when 0 */}
                <ReviewPriceRow
                  label="Discount"
                  value={summary.totalDiscount > 0 ? `-${summary.totalDiscount.toFixed(2)} USD` : "0.00 USD"}
                  subtle={summary.totalDiscount === 0}
                  accent={summary.totalDiscount > 0}
                />

                {/* Subtotal */}
                <ReviewPriceRow
                  label="Subtotal"
                  value={`${summary.subtotal.toFixed(2)} USD`}
                />

                {/* Tax */}
                <ReviewPriceRow
                  label={`Tax (${taxRate}%)`}
                  value={`${summary.totalTax.toFixed(2)} USD`}
                  subtle
                />

                {/* Shipping cost */}
                <ReviewPriceRow
                  label="Shipping cost"
                  value={draftOrder.shippingEstimate === 0 ? "Free" : `${draftOrder.shippingEstimate.toFixed(2)} USD`}
                  subtle={draftOrder.shippingEstimate === 0}
                />

                {/* Divider */}
                <div style={{ height: "1px", background: "var(--cim-border-base,#dadcdd)", margin: "4px 0" }} />

                {/* Total due */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ fontSize: "1.125rem", fontWeight: 600, color: "var(--cim-fg-base,#15191d)" }}>
                    Total due
                  </span>
                  <span style={{ fontSize: "1.125rem", fontWeight: 600, color: "var(--cim-fg-base,#15191d)" }}>
                    {totalDue.toFixed(2)} USD
                  </span>
                </div>
              </div>
            </div>

            {/* ── ADDRESS & SHIPPING SECTION ── */}
            <div ref={addressShippingSectionRef} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <h3 style={{ margin: 0, fontSize: "1.125rem", fontWeight: 600, color: "var(--cim-fg-base,#15191d)" }}>
                Address &amp; shipping speed
              </h3>

              {/* Combined address + method card */}
              <div style={{
                border: "1px solid var(--cim-border-base,#dadcdd)",
                borderRadius: "6px",
                overflow: "hidden",
              }}>
                {/* Shipping address */}
                <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
                  <span style={{ fontSize: "1.125rem", fontWeight: 600, color: "var(--cim-fg-base,#15191d)" }}>
                    Shipping address
                  </span>
                  {shippingAddress ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontWeight: 600, fontSize: "1rem", color: "var(--cim-fg-base)" }}>{shippingAddress.name}</span>
                        {shippingAddress.isDefault && <DefaultBadge />}
                      </div>
                      {shippingAddress.company && (
                        <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--cim-fg-base)" }}>{shippingAddress.company}</span>
                      )}
                      {shippingAddress.lines.map((line, i) => (
                        <span key={i} style={{ fontSize: "0.875rem", color: "var(--cim-fg-base)" }}>{line}</span>
                      ))}
                      <span style={{ fontSize: "0.875rem", color: "var(--cim-fg-base)" }}>{shippingAddress.phone}</span>
                    </div>
                  ) : (
                    <span style={{ fontSize: "0.875rem", color: "var(--cim-fg-muted,#94979b)" }}>No shipping address selected</span>
                  )}
                </div>

                {/* Divider */}
                <div style={{ height: "1px", background: "var(--cim-border-base,#dadcdd)" }} />

                {/* Shipping method */}
                <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
                  <span style={{ fontSize: "1.125rem", fontWeight: 600, color: "var(--cim-fg-base,#15191d)" }}>
                    Shipping method
                  </span>
                  {selectedMethod ? (
                    <div style={{
                      background: "#f0fdf4",
                      border: "1px solid #86efac",
                      borderRadius: "6px",
                      padding: "12px 16px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <span style={{ display: "flex", flexShrink: 0, color: "var(--cim-fg-base)" }}>
                          <IconDeliveryTruck />
                        </span>
                        <span style={{ flex: 1, fontWeight: 600, fontSize: "1rem", color: "var(--cim-fg-base)" }}>
                          {selectedMethod.name}
                        </span>
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: "1rem", color: "var(--cim-fg-base)" }}>
                            {selectedMethod.price.toFixed(2)} USD
                          </div>
                          <div style={{ fontSize: "0.75rem", color: "var(--cim-fg-subtle,#5f6469)" }}>Taxes excluded</div>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ fontSize: "0.875rem", color: "var(--cim-fg-base,#15191d)" }}>
                          Estimated arrival by {selectedMethod.estimatedDeliveryLabel}
                        </span>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                          <path d="M3 6l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    </div>
                  ) : (
                    <span style={{ fontSize: "0.875rem", color: "var(--cim-fg-muted,#94979b)" }}>No shipping method selected</span>
                  )}
                </div>
              </div>

              {/* Billing address card */}
              <div style={{
                border: "1px solid var(--cim-border-base,#dadcdd)",
                borderRadius: "6px",
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}>
                <span style={{ fontSize: "1.125rem", fontWeight: 600, color: "var(--cim-fg-base,#15191d)" }}>
                  Billing address
                </span>
                {billingSameAsShipping ? (
                  <span style={{ fontSize: "0.875rem", color: "var(--cim-fg-subtle,#5f6469)" }}>
                    Billing address is same as shipping address
                  </span>
                ) : billingAddress ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <span style={{ fontWeight: 600, fontSize: "1rem", color: "var(--cim-fg-base)" }}>{billingAddress.name}</span>
                    {billingAddress.lines.map((line, i) => (
                      <span key={i} style={{ fontSize: "0.875rem", color: "var(--cim-fg-base)" }}>{line}</span>
                    ))}
                  </div>
                ) : (
                  <span style={{ fontSize: "0.875rem", color: "var(--cim-fg-muted,#94979b)" }}>No billing address selected</span>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{
            background: "white",
            borderTop: "1px solid var(--cim-border-base,#dadcdd)",
            padding: "16px 16px 24px",
            display: "flex",
            gap: "12px",
          }}>
            <Button variant="secondary" onPress={onClose} UNSAFE_style={{ flex: 1 }}>
              Cancel
            </Button>
            <Button variant="primary" onPress={onReviewToCheckout} UNSAFE_style={{ flex: 1 }}>
              Pay to Checkout
            </Button>
          </div>
        </div>
      </DrawerShell>
    );
  }

  // ── Main view ──────────────────────────────────────────────────────────────
  return (
    <DrawerShell onBackdropClick={onClose}>
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>

        {/* Header — slim title bar */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "24px 16px 16px 16px",
        }}>
          <h2 style={{ fontSize: "1.125rem", fontWeight: 600, margin: 0, color: "var(--cim-fg-base,#15191d)", lineHeight: "24px" }}>
            Address &amp; Shipping Method
          </h2>
          <button
            onClick={onClose}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "32px", height: "32px", background: "none", border: "none", cursor: "pointer", borderRadius: "4px", padding: "8px", color: "var(--cim-fg-base,#15191d)" }}
            aria-label="Close"
          >
            <IconCloseBold />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "16px" }}>

          {/* Section header row */}
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "2px", minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: "1.25rem", fontWeight: 600, color: "var(--cim-fg-base,#15191d)", lineHeight: "28px" }}>
                Address &amp; Shipping Method
              </p>
              <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--cim-fg-subtle,#5f6469)", lineHeight: "16px" }}>
                Shipping address changes can impact shipping speed
              </p>
            </div>
            <Button variant="secondary" size="small" onPress={() => openAddAddress("shipping")}>
              Add New Address
            </Button>
          </div>

          {/* Shipping address + Shipping method card (single bordered card) */}
          <div style={{
            background: "white",
            border: "1px solid var(--cim-border-base,#dadcdd)",
            borderRadius: "6px",
            padding: "12px 16px",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}>
            {/* Shipping address sub-section */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", height: "40px" }}>
                <span style={{ fontSize: "1.125rem", fontWeight: 600, color: "var(--cim-fg-base,#15191d)", lineHeight: "24px" }}>
                  Shipping address
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {shippingAddress ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontWeight: 600, fontSize: "1rem", color: "var(--cim-fg-base)" }}>{shippingAddress.name}</span>
                      {shippingAddress.isDefault && <DefaultBadge />}
                    </div>
                    {shippingAddress.company && <span style={{ fontSize: "0.875rem", color: "var(--cim-fg-base)" }}>{shippingAddress.company}</span>}
                    {shippingAddress.lines.map((line, i) => (
                      <span key={i} style={{ fontSize: "0.875rem", color: "var(--cim-fg-base)" }}>{line}</span>
                    ))}
                    <span style={{ fontSize: "0.875rem", color: "var(--cim-fg-base)" }}>{shippingAddress.phone}</span>
                    <div style={{ display: "flex", gap: "16px", marginTop: "4px" }}>
                      <button onClick={() => openAddAddress("shipping")} style={linkBtnStyle}>Edit</button>
                      <button onClick={() => openAddAddress("shipping")} style={linkBtnStyle}>Change shipping address</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p style={{ margin: 0, fontSize: "1rem", color: "var(--cim-fg-base,#15191d)", lineHeight: "24px" }}>
                      This customer seems to have no address
                    </p>
                    <button onClick={() => openAddAddress("shipping")} style={accentLinkStyle}>
                      Add New Address
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Divider */}
            <div style={{ height: "1px", background: "var(--cim-border-base,#dadcdd)", margin: "0 -16px" }} />

            {/* Shipping method sub-section */}
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <span style={{ fontSize: "1.125rem", fontWeight: 600, color: "var(--cim-fg-base,#15191d)", lineHeight: "24px" }}>
                Shipping method
              </span>
              {!shippingAddressId ? (
                <div style={{
                  background: "var(--cim-bg-subtle,#f8f9fa)",
                  borderRadius: "6px",
                  padding: "16px",
                  display: "flex",
                  gap: "16px",
                  alignItems: "center",
                }}>
                  <span style={{ display: "flex", flexShrink: 0, color: "var(--cim-fg-subtle,#5f6469)" }}>
                    <IconDeliveryTruck />
                  </span>
                  <p style={{ margin: 0, fontSize: "1rem", color: "var(--cim-fg-base,#15191d)", lineHeight: "24px" }}>
                    Shipping speed can be selected after a shipping address has been entered
                  </p>
                </div>
              ) : selectedMethod ? (
                <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "6px", overflow: "hidden" }}>
                  {/* Method header row */}
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 16px" }}>
                    <span style={{ display: "flex", flexShrink: 0, color: "var(--cim-fg-base)" }}><IconDeliveryTruck /></span>
                    <span style={{ flex: 1, fontWeight: 600, fontSize: "1rem", color: "var(--cim-fg-base)" }}>{selectedMethod.name}</span>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: "1rem", color: "var(--cim-fg-base)" }}>
                        USD {selectedMethod.price === 0 ? "0.00" : selectedMethod.price.toFixed(2)}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--cim-fg-subtle,#5f6469)" }}>Taxes excluded</div>
                    </div>
                  </div>
                  {/* Estimated arrival + chevron */}
                  <div
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px 10px", cursor: "pointer" }}
                    onClick={() => setExpandedMethodId(expandedMethodId === selectedMethod.id ? null : selectedMethod.id)}
                  >
                    <span style={{ fontSize: "0.875rem", color: "var(--cim-fg-base,#15191d)" }}>
                      Estimated arrival by {selectedMethod.estimatedDeliveryLabel}
                    </span>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, color: "var(--cim-fg-subtle)" }}>
                      <path d={expandedMethodId === selectedMethod.id ? "M3 10l5-5 5 5" : "M3 6l5 5 5-5"} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  {/* Expanded: item delivery lines */}
                  {expandedMethodId === selectedMethod.id && (
                    <div style={{ borderTop: "1px solid #86efac", padding: "10px 16px 6px", display: "flex", flexDirection: "column", gap: "6px" }}>
                      {items.map((item) => (
                        <p key={item.draftItemId} style={{ margin: 0, fontSize: "0.875rem", color: "var(--cim-fg-base,#15191d)" }}>
                          {item.product.name}: {selectedMethod.estimatedDeliveryLabel}
                        </p>
                      ))}
                    </div>
                  )}
                  {/* Change link — always visible */}
                  <div style={{ padding: "6px 16px 14px" }}>
                    <button onClick={() => { setPendingMethodId(shippingMethodId); setView("select-shipping"); }} style={linkBtnStyle}>
                      Change shipping method
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <div style={{ background: "var(--cim-bg-subtle,#f8f9fa)", borderRadius: "6px", padding: "16px", display: "flex", gap: "16px", alignItems: "center" }}>
                    <span style={{ display: "flex", flexShrink: 0, color: "var(--cim-fg-subtle,#5f6469)" }}><IconDeliveryTruck /></span>
                    <p style={{ margin: 0, fontSize: "1rem", color: "var(--cim-fg-base,#15191d)", lineHeight: "24px" }}>No shipping method selected</p>
                  </div>
                  <button onClick={() => { setPendingMethodId(null); setView("select-shipping"); }} style={linkBtnStyle}>Select shipping method</button>
                </div>
              )}
            </div>
          </div>

          {/* Billing address card */}
          <div style={{
            background: "white",
            border: "1px solid var(--cim-border-base,#dadcdd)",
            borderRadius: "6px",
            padding: "12px 16px",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}>
            <div style={{ display: "flex", alignItems: "center", height: "40px" }}>
              <span style={{ fontSize: "1.125rem", fontWeight: 600, color: "var(--cim-fg-base,#15191d)", lineHeight: "24px" }}>
                Billing address
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {billingAddress ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <span style={{ fontSize: "0.875rem", color: "var(--cim-fg-subtle)" }}>Billing address is same as shipping address</span>
                  <div style={{ display: "flex", gap: "16px", marginTop: "2px" }}>
                    <button onClick={() => openAddAddress("billing")} style={linkBtnStyle}>Edit</button>
                    <button onClick={() => openAddAddress("billing")} style={linkBtnStyle}>Change billing address</button>
                  </div>
                </div>
              ) : (
                <>
                  <p style={{ margin: 0, fontSize: "1rem", color: "var(--cim-fg-base,#15191d)", lineHeight: "24px" }}>
                    This customer seems to have no address
                  </p>
                  <button onClick={() => openAddAddress("billing")} style={accentLinkStyle}>
                    Add New Address
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          background: "white",
          borderTop: "1px solid var(--cim-border-base,#dadcdd)",
          padding: "16px 16px 24px",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
        }}>
          <Button
            variant="secondary"
            UNSAFE_style={{ width: "100%" }}
            onPress={() => {
              if (shippingMethodId) {
                const method = MOCK_SHIPPING_METHODS.find((m) => m.id === shippingMethodId);
                if (method) onShippingCostChange?.(method.price);
              }
              onClose();
            }}
          >
            Confirm and Save Changes
          </Button>
          <Button
            variant="primary"
            isDisabled={!canReview}
            onPress={canReview ? () => setView("review") : undefined}
            UNSAFE_style={{ width: "100%" }}
          >
            Review to checkout
          </Button>
        </div>
      </div>
    </DrawerShell>
  );
}

const linkBtnStyle: React.CSSProperties = {
  background: "none", border: "none", padding: 0, cursor: "pointer",
  fontSize: "0.875rem", color: "var(--cim-fg-accent,#007798)", textDecoration: "underline",
  alignSelf: "flex-start", textAlign: "left",
};

const accentLinkStyle: React.CSSProperties = {
  background: "none", border: "none", padding: 0, cursor: "pointer",
  fontSize: "1rem", color: "var(--cim-fg-accent,#007798)",
  textDecoration: "underline", textAlign: "left",
  lineHeight: "24px",
};

function DrawerShell({ children, onBackdropClick, width = 480 }: {
  children: React.ReactNode;
  onBackdropClick?: () => void;
  width?: number;
}) {
  return (
    <>
      <div
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 200 }}
        onClick={onBackdropClick}
      />
      <div style={{
        position: "fixed",
        top: 0,
        right: 0,
        bottom: 0,
        width: `${width}px`,
        maxWidth: "100vw",
        background: "white",
        zIndex: 201,
        display: "flex",
        flexDirection: "column",
        boxShadow: "0px 2px 8px rgba(0,0,0,0.12), 0px 8px 16px rgba(0,0,0,0.11), 0px 16px 24px rgba(0,0,0,0.10), 0px 16px 32px rgba(0,0,0,0.09), 0px 24px 48px rgba(0,0,0,0.08)",
      }}>
        {children}
      </div>
    </>
  );
}
