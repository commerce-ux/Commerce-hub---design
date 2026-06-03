"use client";

import { useState, useRef } from "react";
import { Button, CopyInline, Callout, Text, TextField, Select, SelectItem } from "@cimpress-ui/react";
import { AppBreadcrumbs } from "@/components/AppBreadcrumbs";
import { IconArrowLeft } from "@cimpress-ui/react/icons";
import { useRouter, useSearchParams } from "next/navigation";
import type { DraftOrder, DraftOrderItem, SavedAddress } from "@/lib/types";
import type { Customer } from "@/lib/createOrderMockData";
import { MOCK_SHIPPING_METHODS } from "@/lib/createOrderMockData";
import { ProductSearchPanel } from "./ProductSearchPanel";
import { OrderSummaryPanel } from "./OrderSummaryPanel";
import { ShippingDrawer } from "./ShippingDrawer";
import { AddNewItemView } from "./AddNewItemView";
import { StoreSelectionModal } from "./StoreSelectionModal";

/** Maps an address country code to the nearest store ID. */
const COUNTRY_TO_STORE: Record<string, string> = {
  US: "NA", CA: "NA", MX: "NA",
  IE: "IE", GB: "IE",
  IN: "IN",
  DE: "DE", AT: "DE", CH: "DE", DK: "DE", NL: "DE", SE: "DE", NO: "DE",
  AU: "AU", NZ: "AU",
};

function countryToStore(country: string): string {
  return COUNTRY_TO_STORE[country.toUpperCase()] ?? "NA";
}

interface CreateOrderPageProps {
  customer: Customer;
}

function computeTotals(items: DraftOrderItem[]): Pick<DraftOrder, "subtotal" | "taxEstimate" | "total"> {
  // lineTotal is the pre-tax subtotal per item; tax is computed per-item using its product's tax rate
  const subtotal = parseFloat(items.reduce((sum, item) => sum + item.lineTotal, 0).toFixed(2));
  const taxEstimate = parseFloat(items.reduce((sum, item) => {
    const taxRate = item.product.taxRate ?? 8;
    return sum + item.lineTotal * taxRate / 100;
  }, 0).toFixed(2));
  const total = parseFloat((subtotal + taxEstimate).toFixed(2));
  return { subtotal, taxEstimate, total };
}

export function CreateOrderPage({ customer }: CreateOrderPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedCountry = searchParams.get("country") ?? undefined;
  const preselectedAddressId = searchParams.get("addressId") ?? undefined;

  // Convert customer's addresses to SavedAddress format, marking the selected one as default
  const customerSavedAddresses: SavedAddress[] = customer.addresses.map((addr, idx) => ({
    id: addr.id,
    label: "Saved",
    name: customer.name,
    lines: [addr.address, `${addr.city}, ${addr.state}`, `${addr.zipcode}, ${addr.country}`],
    phone: customer.phone,
    isDefault: preselectedAddressId ? addr.id === preselectedAddressId : idx === 0,
  }));

  const [view, setView] = useState<"cart" | "add-item">("add-item");
  const [items, setItems] = useState<DraftOrderItem[]>([]);
  const [editingItem, setEditingItem] = useState<DraftOrderItem | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [openPriceOverrideOnEdit, setOpenPriceOverrideOnEdit] = useState(false);

  // If a country was passed from the address card, derive the store automatically.
  const storeFromAddress = preselectedCountry ? countryToStore(preselectedCountry) : "";
  const isStoreLocked = Boolean(storeFromAddress);

  // Store selection — skip modal when store is pre-determined from address country
  const [isStoreModalOpen, setIsStoreModalOpen] = useState(!isStoreLocked);
  const [selectedStore, setSelectedStore] = useState<string>(storeFromAddress);

  // Order-level discount
  const [orderDiscount, setOrderDiscount] = useState(0);
  const [discountCode, setDiscountCode] = useState("");
  const [shippingEstimate, setShippingEstimate] = useState(0);

  // Shipping
  const [selectedShippingId, setSelectedShippingId] = useState<string>("economy");

  // Sales & Order Information
  const [salesRep, setSalesRep] = useState("");
  const [salesRepEmail, setSalesRepEmail] = useState("");
  const [customerPO, setCustomerPO] = useState("");
  const [orderType, setOrderType] = useState<string | null>(null);
  const [orderRequestDate, setOrderRequestDate] = useState("");

  // Section scroll refs + active tab
  const cartRef = useRef<HTMLDivElement>(null);
  const addressRef = useRef<HTMLDivElement>(null);
  const shippingRef = useRef<HTMLDivElement>(null);
  const salesRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState("cart");

  const { subtotal, taxEstimate, total } = computeTotals(items);

  const draftOrder: DraftOrder = {
    customerId: customer.id,
    customerName: customer.name,
    customerEmail: customer.email,
    shopperId: customer.shopperId,
    items,
    subtotal,
    shippingEstimate,
    taxEstimate,
    orderDiscount,
    discountCode,
    total: parseFloat((total + shippingEstimate).toFixed(2)),
  };

  function handleAddToOrder(item: DraftOrderItem) {
    setItems((prev) => {
      const existingIndex = prev.findIndex((i) => i.draftItemId === item.draftItemId);
      if (existingIndex !== -1) {
        const updated = [...prev];
        updated[existingIndex] = item;
        return updated;
      }
      return [...prev, item];
    });
    setEditingItem(null);
    setView("cart");
  }

  function handleEditItem(draftItemId: string) {
    const item = items.find((i) => i.draftItemId === draftItemId);
    if (item) {
      setEditingItem(item);
      setOpenPriceOverrideOnEdit(false);
      setView("add-item");
    }
  }

  function handleEditItemWithPriceOverride(draftItemId: string) {
    const item = items.find((i) => i.draftItemId === draftItemId);
    if (item) {
      setEditingItem(item);
      setOpenPriceOverrideOnEdit(true);
      setView("add-item");
    }
  }

  function handleItemLineTotalUpdate(draftItemId: string, newLineTotal: number) {
    setItems((prev) => prev.map((item) =>
      item.draftItemId === draftItemId ? { ...item, lineTotal: newLineTotal } : item
    ));
  }

  function handleAddAccessory(draftItemId: string, acc: import("@/lib/types").DraftOrderItemAccessory) {
    setItems((prev) => prev.map((item) => {
      if (item.draftItemId !== draftItemId) return item;
      const existing = item.accessories ?? [];
      // Replace if same id, otherwise append
      const updated = existing.some((a) => a.id === acc.id)
        ? existing.map((a) => a.id === acc.id ? acc : a)
        : [...existing, acc];
      const accessoriesTotal = updated.reduce((sum, a) => sum + a.quantity * a.unitPrice, 0);
      const basePrice = item.unitPrice * item.quantity * (1 - item.itemDiscount / 100);
      const artworkCharge = item.artworkType !== "none" ? 10 : 0;
      const lineTotal = parseFloat((basePrice + artworkCharge + accessoriesTotal).toFixed(2));
      return { ...item, accessories: updated, lineTotal };
    }));
  }

  function handleRemoveItem(draftItemId: string) {
    setItems((prev) => prev.filter((i) => i.draftItemId !== draftItemId));
    if (editingItem?.draftItemId === draftItemId) setEditingItem(null);
  }

  function handleAccessoryRemove(draftItemId: string, accessoryId: string) {
    setItems((prev) => prev.map((item) => {
      if (item.draftItemId !== draftItemId) return item;
      const updatedAccessories = (item.accessories ?? []).filter((a) => a.id !== accessoryId);
      const accessoriesTotal = updatedAccessories.reduce((sum, a) => sum + a.quantity * a.unitPrice, 0);
      const basePrice = item.unitPrice * item.quantity * (1 - item.itemDiscount / 100);
      const artworkCharge = item.artworkType !== "none" ? 10 : 0;
      const lineTotal = parseFloat((basePrice + artworkCharge + accessoriesTotal).toFixed(2));
      return { ...item, accessories: updatedAccessories, lineTotal };
    }));
  }

  function handleDuplicateItem(draftItemId: string) {
    const item = items.find((i) => i.draftItemId === draftItemId);
    if (item) {
      setItems((prev) => [...prev, { ...item, draftItemId: `${draftItemId}-copy-${Date.now()}` }]);
    }
  }

  function handleQuantityChangeItem(draftItemId: string, newQty: number) {
    setItems((prev) => prev.map((i) => {
      if (i.draftItemId !== draftItemId) return i;
      const tiers = i.product.pricingTiers;
      const unitPrice = [...tiers].reverse().find((t) => newQty >= t.minQty)?.unitPrice ?? tiers[0]?.unitPrice ?? 0;
      const basePrice = unitPrice * newQty * (1 - i.itemDiscount / 100);
      const artworkCharge = i.artworkType !== "none" ? 10 : 0;
      const accessoriesTotal = (i.accessories ?? []).reduce((sum, a) => sum + a.quantity * a.unitPrice, 0);
      // lineTotal = pre-tax subtotal (base + artwork + accessories)
      const lineTotal = parseFloat((basePrice + artworkCharge + accessoriesTotal).toFixed(2));
      return { ...i, quantity: newQty, unitPrice, lineTotal };
    }));
  }

  function handleSizeQuantityChange(draftItemId: string, size: string, newQty: number) {
    setItems((prev) => prev.map((i) => {
      if (i.draftItemId !== draftItemId) return i;
      const newSizeQuantities = { ...(i.sizeQuantities ?? {}), [size]: newQty };
      const totalQty = Object.values(newSizeQuantities).reduce((sum, q) => sum + (q || 0), 0);
      const tiers = i.product.pricingTiers;
      const unitPrice = [...tiers].reverse().find((t) => totalQty >= t.minQty)?.unitPrice ?? tiers[0]?.unitPrice ?? 0;
      const basePrice = unitPrice * totalQty * (1 - i.itemDiscount / 100);
      const artworkCharge = i.artworkType !== "none" ? 10 : 0;
      const accessoriesTotal = (i.accessories ?? []).reduce((sum, a) => sum + a.quantity * a.unitPrice, 0);
      const lineTotal = parseFloat((basePrice + artworkCharge + accessoriesTotal).toFixed(2));
      return { ...i, sizeQuantities: newSizeQuantities, quantity: totalQty, unitPrice, lineTotal };
    }));
  }

  function handleDiscountApplied(code: string, percent: number) {
    setDiscountCode(code);
    setOrderDiscount(percent);
  }

  function handleAddNewItem() {
    setEditingItem(null);
    setView("add-item");
  }

  // Render the add-item full-page view
  if (view === "add-item") {
    return (
      <AddNewItemView
        customer={customer}
        selectedStore={selectedStore || undefined}
        editingItem={editingItem}
        onAddComplete={handleAddToOrder}
        onCancel={() => { setView("cart"); setEditingItem(null); setOpenPriceOverrideOnEdit(false); }}
        pendingItemTotal={0}
        autoOpenPriceOverride={openPriceOverrideOnEdit}
      />
    );
  }

  const customerHref = "/customers/" + customer.id;

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, background: "var(--cim-bg-subtle, #f8f9fa)" }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "16px", padding: "24px", maxWidth: "1400px", margin: "0 auto", width: "100%" }}>
        <AppBreadcrumbs items={[
          { label: "Dashboard", href: "/" },
          { label: "Customer management", href: "/customers" },
          { label: customer.name, href: customerHref },
          { label: "Create order" },
        ]} />

        {/* Page header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px", minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <button
                onClick={() => router.back()}
                aria-label="Back"
                style={{ display: "flex", alignItems: "center", background: "none", border: "none", cursor: "pointer", padding: "2px", color: "var(--cim-fg-base)", borderRadius: "4px", flexShrink: 0 }}
              >
                <IconArrowLeft />
              </button>
              <Text as="h1" variant="title-4">Create order: Add item</Text>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <Text as="span" variant="medium">{customer.name} ({customer.email})</Text>
              <div style={{ width: "1px", height: "16px", background: "var(--cim-border-subtle, #eaebeb)", flexShrink: 0 }} />
              <Text as="span" variant="medium">Customer number: <CopyInline>{customer.id}</CopyInline></Text>
              {selectedStore && (
                <>
                  <div style={{ width: "1px", height: "16px", background: "var(--cim-border-subtle, #eaebeb)", flexShrink: 0 }} />
                  <Text as="span" variant="medium">
                    Store: {selectedStore}
                    {isStoreLocked ? (
                      <span style={{ marginLeft: "6px", fontSize: "0.75rem", color: "var(--cim-fg-subtle, #5f6469)", background: "var(--cim-bg-subtle, #f8f9fa)", border: "1px solid var(--cim-border-base, #dadcdd)", borderRadius: "4px", padding: "1px 6px" }}>
                        auto-set from address · {preselectedCountry}
                      </span>
                    ) : (
                      <button onClick={() => setIsStoreModalOpen(true)} style={{ marginLeft: "6px", background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: "inherit", color: "var(--cim-fg-accent, #007798)", textDecoration: "underline" }}>
                        Change
                      </button>
                    )}
                  </Text>
                </>
              )}
            </div>
          </div>
          <Button variant="primary" iconStart={<span style={{ fontSize: "1.25rem", lineHeight: 1 }}>+</span>} onPress={handleAddNewItem}>Add item</Button>
        </div>

        {/* Main two-column layout */}
        {(() => {
          const tabs = [
            { id: "cart",    label: "Cart details",                ref: cartRef },
            { id: "address", label: "Address details",             ref: addressRef },
            { id: "sales",   label: "Sales and Order Information", ref: salesRef },
          ];

          function scrollTo(id: string, ref: React.RefObject<HTMLDivElement | null>) {
            setActiveTab(id);
            ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
          }

          return (
            <div style={{ display: "flex", gap: "0", alignItems: "flex-start" }}>
              {/* Left: all sections stacked, tabs as scroll-anchors */}
              <div style={{ flex: "0 0 62%", marginRight: "24px", minWidth: 0 }}>

                {/* Tab nav */}
                <div style={{ display: "flex", borderBottom: "2px solid var(--cim-border-base, #dadcdd)", marginBottom: "16px" }}>
                  {tabs.map(({ id, label, ref }) => (
                    <button
                      key={id}
                      onClick={() => scrollTo(id, ref)}
                      style={{
                        background: "none", border: "none", cursor: "pointer",
                        padding: "12px 16px",
                        fontSize: "0.875rem", fontWeight: 600,
                        color: activeTab === id ? "var(--cim-fg-accent, #007798)" : "var(--cim-fg-base, #15191d)",
                        borderBottom: activeTab === id ? "2px solid var(--cim-fg-accent, #007798)" : "2px solid transparent",
                        marginBottom: "-2px",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {/* ── Cart details section ── */}
                <div ref={cartRef} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {items.length === 0 && !editingItem ? (
                    <div style={{ background: "white", border: "1px solid var(--cim-border-subtle, #eaebeb)", borderRadius: "6px", padding: "16px" }}>
                      <Callout tone="warning">Your order is empty. Add items to continue.</Callout>
                    </div>
                  ) : (
                    <ProductSearchPanel
                      draftItems={items}
                      onAddToOrder={handleAddToOrder}
                      onEditItem={handleEditItem}
                      onRemoveItem={handleRemoveItem}
                      onDuplicateItem={handleDuplicateItem}
                      onQuantityChange={handleQuantityChangeItem}
                      onSizeQuantityChange={handleSizeQuantityChange}
                      onAccessoryRemove={handleAccessoryRemove}
                      onAddAccessory={handleAddAccessory}
                      onEditPriceOverride={handleEditItemWithPriceOverride}
                      onItemLineTotalUpdate={handleItemLineTotalUpdate}
                      editingItem={editingItem}
                    />
                  )}
                </div>

                {/* ── Address details section ── */}
                <div ref={addressRef} style={{ marginTop: "24px", background: "white", border: "1px solid var(--cim-border-subtle, #eaebeb)", borderRadius: "6px", padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
                  <Text as="h2" variant="body-semibold">Address details</Text>
                  <div style={{ display: "flex", gap: "24px" }}>
                    {(["Billing address", "Shipping address"] as const).map((label, i) => {
                      const addr = customerSavedAddresses[i] ?? customerSavedAddresses[0];
                      return (
                        <div key={label} style={{ flex: 1, border: "1px solid var(--cim-border-base, #dadcdd)", borderRadius: "6px", padding: "16px", display: "flex", flexDirection: "column", gap: "4px" }}>
                          {/* Label inside the card — Figma style */}
                          <Text as="span" variant="medium" tone="subtle" UNSAFE_style={{ marginBottom: "8px" }}>{label}</Text>
                          {addr ? (
                            <>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                                <Text as="span" variant="body-semibold">{addr.name}</Text>
                                {addr.isDefault && (
                                  <span style={{ fontSize: "0.75rem", fontWeight: 500, color: "var(--cim-fg-info, #0078d4)", background: "var(--cim-bg-info-subtle, #e8f4fd)", borderRadius: "9999px", padding: "2px 10px" }}>Default</span>
                                )}
                              </div>
                              {addr.lines.map((line, j) => (
                                <Text key={j} as="p" variant="body" UNSAFE_style={{ margin: 0, lineHeight: "28px" }}>{line}</Text>
                              ))}
                              <div style={{ display: "flex", gap: "16px", marginTop: "12px" }}>
                                <button style={{ background: "none", border: "none", cursor: "pointer", color: "var(--cim-fg-accent, #007798)", fontSize: "1rem", textDecoration: "underline", padding: 0 }}>Edit</button>
                                <button style={{ background: "none", border: "none", cursor: "pointer", color: "var(--cim-fg-accent, #007798)", fontSize: "1rem", textDecoration: "underline", padding: 0 }}>Change address</button>
                              </div>
                            </>
                          ) : (
                            <Text as="span" variant="body" tone="subtle">No address on file</Text>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* ── Shipping info section ── */}
                <div ref={shippingRef} style={{ marginTop: "24px", background: "white", border: "1px solid var(--cim-border-subtle, #eaebeb)", borderRadius: "6px", padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
                  <Text as="h2" variant="body-semibold">Shipping info</Text>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    {MOCK_SHIPPING_METHODS.map((method) => {
                      const isSelected = selectedShippingId === method.id;
                      return (
                        <button
                          key={method.id}
                          onClick={() => { setSelectedShippingId(method.id); setShippingEstimate(method.price); }}
                          style={{
                            display: "flex", flexDirection: "column", gap: "4px",
                            padding: "12px 16px", borderRadius: "6px", cursor: "pointer",
                            border: isSelected ? "2px solid var(--cim-fg-accent, #007798)" : "1px solid var(--cim-border-base, #dadcdd)",
                            background: "white", textAlign: "left",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <span style={{ display: "flex", width: "16px", height: "16px", borderRadius: "50%", border: `2px solid ${isSelected ? "var(--cim-fg-accent, #007798)" : "var(--cim-border-base, #dadcdd)"}`, alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                {isSelected && <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--cim-fg-accent, #007798)" }} />}
                              </span>
                              <span style={{ fontSize: "1rem", fontWeight: 600, color: "var(--cim-fg-base, #15191d)" }}>{method.name}</span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                              {method.originalPrice && (
                                <span style={{ fontSize: "0.875rem", color: "var(--cim-fg-critical, #d10023)", textDecoration: "line-through" }}>
                                  {method.originalPrice.toFixed(2)} USD
                                </span>
                              )}
                              <span style={{ fontSize: "1rem", fontWeight: 600, color: "var(--cim-fg-base, #15191d)" }}>
                                {method.price === 0 ? "0.00 Free" : `${method.price.toFixed(2)} USD`}{method.price > 0 ? "*" : ""}
                              </span>
                            </div>
                          </div>
                          <span style={{ fontSize: "0.875rem", color: "var(--cim-fg-subtle, #5f6469)", paddingLeft: "24px" }}>
                            {items.length > 0 ? items[0].product.name : "Item"} : {method.estimatedDeliveryLabel}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* ── Sales and Order Information section ── */}
                <div ref={salesRef} style={{ marginTop: "24px", background: "white", border: "1px solid var(--cim-border-subtle, #eaebeb)", borderRadius: "6px", padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
                  <Text as="h2" variant="body-semibold">Sales and Order Information</Text>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
                    <TextField label="Sales representative" value={salesRep} onChange={setSalesRep} placeholder="Sales representative" />
                    <TextField label="Sales representative email" value={salesRepEmail} onChange={setSalesRepEmail} placeholder="Sales representative email" />
                    <TextField label="Customer PO number" value={customerPO} onChange={setCustomerPO} placeholder="Customer PO number" />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                    <Select label="Order type" placeholder="Select" selectedKey={orderType} onSelectionChange={(k) => setOrderType(k as string)}>
                      <SelectItem id="standard">Standard</SelectItem>
                      <SelectItem id="rush">Rush</SelectItem>
                      <SelectItem id="sample">Sample</SelectItem>
                    </Select>
                    <TextField label="Order Request Date" value={orderRequestDate} onChange={setOrderRequestDate} placeholder="yyyy/mm/dd" />
                  </div>
                </div>

              </div>

              {/* Right: order summary */}
              <div style={{ flex: "0 0 calc(38% - 24px)", minWidth: "280px" }}>
                <OrderSummaryPanel
                  draftOrder={draftOrder}
                  onDiscountApplied={handleDiscountApplied}
                  onPlaceOrder={() => setIsCheckoutOpen(true)}
                />
              </div>
            </div>
          );
        })()}
      </div>

      <ShippingDrawer
        isOpen={isCheckoutOpen}
        items={items}
        draftOrder={draftOrder}
        initialAddresses={customerSavedAddresses}
        onClose={() => setIsCheckoutOpen(false)}
        onReviewToCheckout={() => setIsCheckoutOpen(false)}
        onShippingCostChange={setShippingEstimate}
      />

      {isStoreModalOpen && (
        <StoreSelectionModal
          initialStore={selectedStore}
          onConfirm={(store) => {
            setSelectedStore(store);
            setIsStoreModalOpen(false);
          }}
          onCancel={() => {
            if (!selectedStore) router.back();
            else setIsStoreModalOpen(false);
          }}
        />
      )}
    </div>
  );
}
