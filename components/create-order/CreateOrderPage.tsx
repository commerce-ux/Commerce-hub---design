"use client";

import { useState } from "react";
import { Button, CopyInline, Callout, Text } from "@cimpress-ui/react";
import { AppBreadcrumbs } from "@/components/AppBreadcrumbs";
import { IconArrowLeft } from "@cimpress-ui/react/icons";
import { useRouter, useSearchParams } from "next/navigation";
import type { DraftOrder, DraftOrderItem, SavedAddress } from "@/lib/types";
import type { Customer } from "@/lib/createOrderMockData";
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

  // If a country was passed from the address card, derive the store automatically.
  const storeFromAddress = preselectedCountry ? countryToStore(preselectedCountry) : "";
  const isStoreLocked = Boolean(storeFromAddress);

  // Store selection — skip modal when store is pre-determined from address country
  const [isStoreModalOpen, setIsStoreModalOpen] = useState(!isStoreLocked);
  const [selectedStore, setSelectedStore] = useState<string>(storeFromAddress);

  // Order-level discount + override
  const [orderDiscount, setOrderDiscount] = useState(0);
  const [discountCode, setDiscountCode] = useState("");
  const [overridePrice, setOverridePrice] = useState<number | null>(null);
  const [shippingEstimate, setShippingEstimate] = useState(0);

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
    overridePrice,
    total: overridePrice !== null ? overridePrice : parseFloat((total + shippingEstimate).toFixed(2)),
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
      setView("add-item");
    }
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

  function handleOverridePriceChange(price: number | null) {
    setOverridePrice(price);
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
        onCancel={() => { setView("cart"); setEditingItem(null); }}
        pendingItemTotal={0}
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
              <Text as="h1" variant="title-4">
                Create order ({items.length} {items.length !== 1 ? "items" : "item"})
              </Text>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <Text as="span" variant="medium">{customer.name} ({customer.email})</Text>
              <div style={{ width: "1px", height: "16px", background: "var(--cim-border-subtle, #eaebeb)", flexShrink: 0 }} />
              <Text as="span" variant="medium">Shopper ID: <CopyInline>{customer.shopperId}</CopyInline></Text>
              {selectedStore && (
                <>
                  <div style={{ width: "1px", height: "16px", background: "var(--cim-border-subtle, #eaebeb)", flexShrink: 0 }} />
                  <Text as="span" variant="medium">
                    Store: {selectedStore}
                    {isStoreLocked ? (
                      <span style={{
                        marginLeft: "6px",
                        fontSize: "0.75rem",
                        color: "var(--cim-fg-subtle, #5f6469)",
                        background: "var(--cim-bg-subtle, #f8f9fa)",
                        border: "1px solid var(--cim-border-base, #dadcdd)",
                        borderRadius: "4px",
                        padding: "1px 6px",
                      }}>
                        auto-set from address · {preselectedCountry}
                      </span>
                    ) : (
                      <button
                        onClick={() => setIsStoreModalOpen(true)}
                        style={{ marginLeft: "6px", background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: "inherit", color: "var(--cim-fg-accent, #007798)", textDecoration: "underline" }}
                      >
                        Change
                      </button>
                    )}
                  </Text>
                </>
              )}
            </div>
          </div>
          <div style={{ display: "flex", gap: "12px", alignItems: "center", flexShrink: 0 }}>
            <Button variant="primary" onPress={handleAddNewItem}>Add new item</Button>
          </div>
        </div>

        <div style={{ display: "flex", gap: "0", alignItems: "flex-start" }}>
          <div style={{ flex: "0 0 62%", marginRight: "24px", minWidth: 0 }}>
            {items.length === 0 && !editingItem ? (
              <div style={{ background: "white", border: "1px solid var(--cim-border-subtle, #eaebeb)", borderRadius: "6px", padding: "16px", boxShadow: "0px 1px 2px rgba(0,0,0,0.08), 0px 2px 4px rgba(0,0,0,0.06), 0px 4px 8px rgba(0,0,0,0.04)" }}>
                <Callout tone="warning">Your order is empty. Add items to continue shopping</Callout>
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
                editingItem={editingItem}
              />
            )}
          </div>
          <div style={{ flex: "0 0 calc(38% - 24px)", minWidth: "280px" }}>
            <OrderSummaryPanel
              draftOrder={draftOrder}
              onDiscountApplied={handleDiscountApplied}
              onOverridePriceChange={handleOverridePriceChange}
              onPlaceOrder={() => setIsCheckoutOpen(true)}
            />
          </div>
        </div>
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
