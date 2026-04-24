"use client";

import { useState, useRef, useEffect } from "react";
import { Button, SearchField, Text, PopoverRoot, Popover } from "@cimpress-ui/react";
import { AppBreadcrumbs } from "@/components/AppBreadcrumbs";
import { IconArrowLeft } from "@cimpress-ui/react/icons";
import type { ProductCatalogItem, DraftOrderItem } from "@/lib/types";
import { MOCK_PRODUCT_CATALOG } from "@/lib/createOrderMockData";
import { ItemConfigurationCard, type ItemConfigurationCardHandle, type PriceBreakdown } from "./ItemConfigurationCard";
import type { Customer } from "@/lib/createOrderMockData";

interface AddNewItemViewProps {
  customer: Customer;
  editingItem?: DraftOrderItem | null;
  onAddComplete: (item: DraftOrderItem) => void;
  onCancel: () => void;
  pendingItemTotal: number;
}

function searchProducts(query: string): ProductCatalogItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return MOCK_PRODUCT_CATALOG.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.id.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q)
  );
}

function ShareIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="18" cy="5" r="3" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="6" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="18" cy="19" r="3" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8.59 13.51l6.83 3.98M15.41 6.51L8.59 10.49" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

const actionBtnStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "6px",
  padding: "6px 12px",
  border: "1px solid var(--cim-border-base, #dadcdd)",
  background: "white",
  cursor: "pointer",
  borderRadius: "4px",
  fontSize: "0.875rem",
  color: "var(--cim-fg-base, #15191d)",
  fontWeight: 500,
};

export function AddNewItemView({ customer, editingItem, onAddComplete, onCancel }: AddNewItemViewProps) {
  const isEditing = !!editingItem;
  const [query, setQuery] = useState(editingItem?.product.name ?? "");
  const [dropdownResults, setDropdownResults] = useState<ProductCatalogItem[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductCatalogItem | null>(editingItem?.product ?? null);
  const [itemTotal, setItemTotal] = useState(editingItem?.lineTotal ?? 0);
  const [isValid, setIsValid] = useState(isEditing);
  const [priceBreakdown, setPriceBreakdown] = useState<PriceBreakdown | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputWrapperRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<ItemConfigurationCardHandle>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputWrapperRef.current &&
        !inputWrapperRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleQueryChange(val: string) {
    setQuery(val);
    if (!val.trim()) {
      setDropdownResults([]);
      setShowDropdown(false);
      return;
    }
    const results = searchProducts(val);
    setDropdownResults(results.slice(0, 6));
    setShowDropdown(results.length > 0);
  }

  function handleProductSelect(product: ProductCatalogItem) {
    setSelectedProduct(product);
    setQuery(product.name);
    setShowDropdown(false);
    setItemTotal(0);
    setIsValid(false);
  }

  function handleClearSearch() {
    setQuery("");
    setDropdownResults([]);
    setShowDropdown(false);
    setSelectedProduct(null);
    setItemTotal(0);
    setIsValid(false);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, background: "var(--cim-bg-subtle, #f8f9fa)" }}>
      <div style={{ flex: 1, padding: "24px", display: "flex", flexDirection: "column", gap: "16px", paddingBottom: "96px" }}>
        <AppBreadcrumbs items={[
          { label: "Dashboard", href: "/" },
          { label: "Customer management", href: "/customers" },
          { label: customer.name, href: "/customers/" + customer.id },
          { label: "Create order", href: "/customers/" + customer.id + "/create-order" },
          { label: isEditing ? "Edit item" : "Add new item" },
        ]} />

        {/* Title row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              onClick={onCancel}
              aria-label="Back"
              style={{ display: "flex", alignItems: "center", background: "none", border: "none", cursor: "pointer", padding: "2px", color: "var(--cim-fg-base)", borderRadius: "4px", flexShrink: 0 }}
            >
              <IconArrowLeft />
            </button>
            <Text as="h1" variant="title-4">{isEditing ? "Edit item" : "Add new item"}</Text>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button style={actionBtnStyle} aria-label="Share this item">
              <ShareIcon />
              Share this item
            </button>
          </div>
        </div>

        {/* Search input with dropdown */}
        <div style={{ position: "relative", width: "100%", maxWidth: "870px", margin: "0 auto" }} ref={inputWrapperRef}>
          <SearchField
            aria-label="Search for product"
            placeholder="Search for product"
            value={query}
            onChange={handleQueryChange}
            onClear={handleClearSearch}
            onSubmit={() => {
              if (dropdownResults.length > 0) handleProductSelect(dropdownResults[0]);
            }}
          />

          {/* Dropdown results */}
          {showDropdown && (
            <div
              ref={dropdownRef}
              style={{
                position: "absolute",
                top: "calc(100% + 4px)",
                left: 0,
                right: 0,
                background: "white",
                border: "1px solid var(--cim-border-base, #dadcdd)",
                borderRadius: "6px",
                boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
                zIndex: 100,
                maxHeight: "320px",
                overflowY: "auto",
              }}
            >
              {dropdownResults.map((product) => (
                <button
                  key={product.id}
                  onClick={() => handleProductSelect(product)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    width: "100%",
                    padding: "10px 16px",
                    border: "none",
                    background: "none",
                    cursor: "pointer",
                    textAlign: "left",
                    borderBottom: "1px solid var(--cim-border-subtle, #eaebeb)",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--cim-bg-hover, #eef6fa)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                >
                  <div style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "4px",
                    overflow: "hidden",
                    flexShrink: 0,
                    background: "var(--cim-bg-subtle, #f8f9fa)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}>
                    {product.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={product.imageUrl} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <span style={{ fontSize: "0.625rem", color: "var(--cim-fg-muted)" }}>IMG</span>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: "0.875rem", fontWeight: 500, color: "var(--cim-fg-base)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {product.name}
                    </p>
                    <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--cim-fg-subtle)", marginTop: "2px" }}>
                      {product.category}
                    </p>
                  </div>
                  <span style={{ fontSize: "0.8125rem", color: "var(--cim-fg-subtle)", flexShrink: 0, fontFamily: "monospace" }}>
                    {product.id}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Item configuration card */}
        {selectedProduct && (
          <div style={{ width: "100%", maxWidth: "870px", margin: "0 auto" }}>
            <ItemConfigurationCard
              ref={cardRef}
              product={selectedProduct}
              initialValues={editingItem?.product.id === selectedProduct.id ? editingItem : undefined}
              onAddToOrder={onAddComplete}
              onLineTotalChange={setItemTotal}
              onValidityChange={setIsValid}
              onPriceBreakdownChange={setPriceBreakdown}
            />
          </div>
        )}
      </div>

      {/* Sticky footer */}
      <div style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        background: "white",
        borderTop: "1px solid var(--cim-border-subtle, #eaebeb)",
        padding: "12px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
      }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          maxWidth: "870px",
        }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            {/* Always derived from priceBreakdown so it's never stale */}
            <span style={{ fontSize: "1rem", fontWeight: 600, color: (priceBreakdown?.totalDue ?? 0) > 0 ? "var(--cim-fg-base, #15191d)" : "var(--cim-fg-muted, #94979b)", whiteSpace: "nowrap" }}>
              Item total {(priceBreakdown?.totalDue ?? itemTotal).toFixed(2)} USD
            </span>
            {priceBreakdown && (
              <PopoverRoot>
                <Button
                  variant="tertiary"
                  size="small"
                  UNSAFE_style={{ padding: 0, fontSize: "0.875rem", textDecoration: "underline", minHeight: "unset", height: "auto" }}
                >
                  View details
                </Button>
                <Popover title="Item Price" placement="top">
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", minWidth: "300px" }}>
                    {/* Base price */}
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem", color: "var(--cim-fg-base)" }}>
                      <span>Price ({priceBreakdown.quantity} qty)</span>
                      <span>{priceBreakdown.basePrice.toFixed(2)} USD</span>
                    </div>
                    {/* Selected extra charge — direct line */}
                    {priceBreakdown.selectedChargeLabel && (
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem", color: "var(--cim-fg-base)" }}>
                        <span>{priceBreakdown.selectedChargeLabel}</span>
                        <span>{priceBreakdown.selectedChargePrice?.toFixed(2)} USD</span>
                      </div>
                    )}
                    {/* Discount */}
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem", color: "var(--cim-fg-base)" }}>
                      <span>Discount</span>
                      <span style={{ color: "var(--cim-fg-muted, #94979b)" }}>0.00 USD</span>
                    </div>
                    {/* Artwork charge */}
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem", color: "var(--cim-fg-base)" }}>
                      <span>{priceBreakdown.artworkOption === "customise" ? "Artwork customisation" : "New artwork"}</span>
                      <span>10.00 USD</span>
                    </div>
                    {/* Accessories */}
                    {priceBreakdown.accessories.length > 0 && (
                      <>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem", color: "var(--cim-fg-base)" }}>
                          <span>Accessories ({priceBreakdown.accessories.length})</span>
                          <span>{priceBreakdown.accessoriesTotal.toFixed(2)} USD</span>
                        </div>
                        {priceBreakdown.accessories.map((acc) => (
                          <div key={acc.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8125rem", color: "var(--cim-fg-subtle, #5f6469)", paddingLeft: "12px" }}>
                            <span>{acc.label} × {acc.quantity}</span>
                            <span>{(acc.quantity * acc.unitPrice).toFixed(2)} USD</span>
                          </div>
                        ))}
                      </>
                    )}
                    {/* Subtotal */}
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem", color: "var(--cim-fg-base)" }}>
                      <span>Subtotal</span>
                      <span>{priceBreakdown.subtotal.toFixed(2)} USD</span>
                    </div>
                    {/* Tax */}
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem", color: "var(--cim-fg-subtle, #5f6469)" }}>
                      <span>Tax ({priceBreakdown.taxRate}%)</span>
                      <span>{priceBreakdown.tax.toFixed(2)} USD</span>
                    </div>
                    <div style={{ height: "1px", background: "var(--cim-border-base, #dadcdd)", margin: "4px 0" }} />
                    {/* Total due */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                      <span style={{ fontSize: "1rem", fontWeight: 600, color: "var(--cim-fg-base)" }}>Total due</span>
                      <span style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--cim-fg-base, #15191d)" }}>
                        {priceBreakdown.totalDue.toFixed(2)} USD
                      </span>
                    </div>
                  </div>
                </Popover>
              </PopoverRoot>
            )}
          </div>
          <div style={{ display: "flex", gap: "12px" }}>
            <Button variant="secondary" onPress={onCancel}>
              Cancel
            </Button>
            <Button
              variant="primary"
              isDisabled={!selectedProduct || !isValid}
              onPress={() => cardRef.current?.submit()}
            >
              {isEditing ? "Save changes" : "Add item to cart"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
