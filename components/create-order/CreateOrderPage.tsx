"use client";

import { useState } from "react";
import { Button, CopyInline, Callout, Text } from "@cimpress-ui/react";
import { AppBreadcrumbs } from "@/components/AppBreadcrumbs";
import { IconArrowLeft } from "@cimpress-ui/react/icons";
import { useRouter } from "next/navigation";
import type { DraftOrder, DraftOrderItem } from "@/lib/types";
import type { Customer } from "@/lib/createOrderMockData";
import { ProductSearchPanel } from "./ProductSearchPanel";
import { OrderSummaryPanel } from "./OrderSummaryPanel";
import { ShippingDrawer } from "./ShippingDrawer";
import { AddNewItemView } from "./AddNewItemView";
import { StoreSelectionModal } from "./StoreSelectionModal";

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

  const [view, setView] = useState<"cart" | "add-item">("cart");
  const [items, setItems] = useState<DraftOrderItem[]>([]);
  const [editingItem, setEditingItem] = useState<DraftOrderItem | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  // Store selection — mandatory on entry
  const [isStoreModalOpen, setIsStoreModalOpen] = useState(true);
  const [selectedStore, setSelectedStore] = useState<string>("");

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
              <Text as="span" variant="medium">Shopper ID: <CopyInline variant="body">{customer.shopperId}</CopyInline></Text>
              {selectedStore && (
                <>
                  <div style={{ width: "1px", height: "16px", background: "var(--cim-border-subtle, #eaebeb)", flexShrink: 0 }} />
                  <Text as="span" variant="medium">
                    Store: {selectedStore}
                    <button
                      onClick={() => setIsStoreModalOpen(true)}
                      style={{ marginLeft: "6px", background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: "0.875rem", color: "var(--cim-fg-accent, #007798)", textDecoration: "underline" }}
                    >
                      Change
                    </button>
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
