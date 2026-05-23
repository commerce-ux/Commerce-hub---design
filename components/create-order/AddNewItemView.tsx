"use client";

import { useState, useRef, useEffect } from "react";
import { Button, SearchField, Text, PopoverRoot, Popover, CopyInline, TextArea } from "@cimpress-ui/react";
import { IconCopy, IconCheckCircleFill } from "@cimpress-ui/react/icons";
import { AppBreadcrumbs } from "@/components/AppBreadcrumbs";
import { IconArrowLeft } from "@cimpress-ui/react/icons";
import type { ProductCatalogItem, DraftOrderItem } from "@/lib/types";
import { MOCK_PRODUCT_CATALOG } from "@/lib/createOrderMockData";
import { ItemConfigurationCard, type ItemConfigurationCardHandle, type PriceBreakdown } from "./ItemConfigurationCard";
import type { Customer } from "@/lib/createOrderMockData";

interface AddNewItemViewProps {
  customer: Customer;
  selectedStore?: string;
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

export function AddNewItemView({ customer, selectedStore, editingItem, onAddComplete, onCancel }: AddNewItemViewProps) {
  const isEditing = !!editingItem;
  const [query, setQuery] = useState(editingItem?.product.name ?? "");
  const [dropdownResults, setDropdownResults] = useState<ProductCatalogItem[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductCatalogItem | null>(editingItem?.product ?? null);
  const [itemTotal, setItemTotal] = useState(editingItem?.lineTotal ?? 0);
  const [isValid, setIsValid] = useState(isEditing);
  const [priceBreakdown, setPriceBreakdown] = useState<PriceBreakdown | null>(null);
  const [notesText, setNotesText] = useState("");
  const [notesCopied, setNotesCopied] = useState(false);

  async function handleCopyNotes() {
    if (!notesText) return;
    try {
      await navigator.clipboard.writeText(notesText);
    } catch {
      const el = document.createElement("textarea");
      el.value = notesText;
      el.style.cssText = "position:fixed;top:-9999px;opacity:0;";
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setNotesCopied(true);
    setTimeout(() => setNotesCopied(false), 2000);
  }

  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputWrapperRef = useRef<HTMLDivElement>(null);
  const searchAreaRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<ItemConfigurationCardHandle>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        searchAreaRef.current &&
        !searchAreaRef.current.contains(e.target as Node)
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
          { label: "Create order" },
        ]} />

        {/* Title row */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <button
                onClick={onCancel}
                aria-label="Back"
                style={{ display: "flex", alignItems: "center", background: "none", border: "none", cursor: "pointer", padding: "2px", color: "var(--cim-fg-base)", borderRadius: "4px", flexShrink: 0 }}
              >
                <IconArrowLeft />
              </button>
              <Text as="h1" variant="title-4">Create order: Add item</Text>
            </div>

            {/* Customer info subtitle */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap", paddingLeft: "26px" }}>
              <Text as="span" variant="medium">{customer.name} ({customer.email})</Text>
              <div style={{ width: "1px", height: "20px", background: "var(--cim-border-subtle, #eaebeb)", flexShrink: 0 }} />
              <Text as="span" variant="medium">
                Shopper ID: <CopyInline>{customer.shopperId}</CopyInline>
              </Text>
              {selectedStore && (
                <>
                  <div style={{ width: "1px", height: "20px", background: "var(--cim-border-subtle, #eaebeb)", flexShrink: 0 }} />
                  <Text as="span" variant="medium">Store: {selectedStore}</Text>
                </>
              )}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
            <button style={actionBtnStyle} aria-label="Share this item">
              <ShareIcon />
              Share this item
            </button>
          </div>
        </div>

        {/* Main two-column layout */}
        <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>

          {/* Left column: search + item config */}
          <div style={{
            flex: "1 1 0",
            minWidth: 0,
            background: "white",
            border: "1px solid var(--cim-border-base, #dadcdd)",
            borderRadius: "var(--cim-radius-6, 6px)",
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}>
            {/* Search input + inline results */}
            <div ref={searchAreaRef} style={{ display: "flex", flexDirection: "column", gap: "0" }}>
              <div ref={inputWrapperRef}>
                <SearchField
                  aria-label="Search to add item"
                  placeholder="Search to add item"
                  value={query}
                  onChange={handleQueryChange}
                  onClear={handleClearSearch}
                  onSubmit={() => {
                    if (dropdownResults.length > 0) handleProductSelect(dropdownResults[0]);
                  }}
                />
              </div>

              {/* Inline results list */}
              {showDropdown && (
                <div
                  ref={dropdownRef}
                  style={{
                    background: "white",
                    borderRadius: "4px",
                    boxShadow: "0px 1px 1.5px rgba(0,0,0,0.08), 0px 3px 4px rgba(0,0,0,0.06), 0px 4px 6px rgba(0,0,0,0.05), 0px 6px 8px rgba(0,0,0,0.04)",
                    overflow: "hidden",
                    marginTop: "8px",
                  }}
                >
                  {dropdownResults.map((product, idx) => (
                    <button
                      key={product.id}
                      onClick={() => handleProductSelect(product)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "16px",
                        width: "100%",
                        padding: "8px 16px",
                        border: "none",
                        background: idx === 0 ? "var(--cim-bg-subtle, #f8f9fa)" : "white",
                        cursor: "pointer",
                        textAlign: "left",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--cim-bg-subtle, #f8f9fa)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = idx === 0 ? "var(--cim-bg-subtle, #f8f9fa)" : "white")}
                    >
                      <span style={{ fontSize: "1rem", color: "var(--cim-fg-base, #15191d)", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {product.name}
                      </span>
                      <span style={{ fontSize: "1rem", color: "var(--cim-fg-base, #15191d)", flexShrink: 0 }}>
                        {product.id}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Item configuration card */}
            {selectedProduct && (
              <ItemConfigurationCard
                ref={cardRef}
                product={selectedProduct}
                initialValues={editingItem?.product.id === selectedProduct.id ? editingItem : undefined}
                onAddToOrder={onAddComplete}
                onLineTotalChange={setItemTotal}
                onValidityChange={setIsValid}
                onPriceBreakdownChange={setPriceBreakdown}
              />
            )}
          </div>

          {/* Right column: Internal notes */}
          <div style={{
            flexShrink: 0,
            width: "320px",
            position: "sticky",
            top: "24px",
            alignSelf: "flex-start",
            background: "white",
            border: "1px solid var(--cim-border-base, #dadcdd)",
            borderRadius: "var(--cim-radius-6, 6px)",
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}>
            {/* Header row */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
              <Text as="h2" variant="title-5">Internal notes</Text>
              <button
                onClick={handleCopyNotes}
                disabled={!notesText}
                aria-label="Copy notes"
                style={{
                  display: "flex", alignItems: "center", gap: "6px",
                  background: "none", border: "none", cursor: notesText ? "pointer" : "default",
                  padding: "4px 8px", borderRadius: "4px",
                  fontSize: "0.875rem", color: notesCopied ? "var(--cim-fg-success, #007e3f)" : "var(--cim-fg-accent, #007798)",
                  opacity: notesText ? 1 : 0.4,
                }}
              >
                {notesCopied ? <IconCheckCircleFill /> : <IconCopy />}
                {notesCopied ? "Copied" : "Copy"}
              </button>
            </div>

            {/* Notes textarea */}
            <TextArea
              aria-label="Internal notes"
              value={notesText}
              onChange={setNotesText}
                            rows={12}
            />
          </div>

        </div>
      </div>

      {/* Sticky footer */}
      <div style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        background: "white",
        borderTop: "1px solid var(--cim-border-base, #dadcdd)",
        padding: "16px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        zIndex: 50,
        boxShadow: "0px 1px 1.5px rgba(0,0,0,0.08), 0px 3px 4px rgba(0,0,0,0.06), 0px 4px 6px rgba(0,0,0,0.05), 0px 6px 8px rgba(0,0,0,0.04)",
      }}>
        {/* Left: item total + view details */}
        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          <span style={{ fontSize: "1rem", fontWeight: 600, color: (priceBreakdown?.totalDue ?? 0) > 0 ? "var(--cim-fg-base, #15191d)" : "var(--cim-fg-muted, #94979b)", whiteSpace: "nowrap" }}>
            Item total {(priceBreakdown?.totalDue ?? itemTotal).toFixed(2)} USD
          </span>
          {priceBreakdown ? (
            <PopoverRoot>
              <Button
                variant="tertiary"
                size="small"
                UNSAFE_style={{ padding: 0, fontSize: "0.875rem", textDecoration: "underline", minHeight: "unset", height: "auto", color: "var(--cim-fg-muted, #94979b)" }}
              >
                View details
              </Button>
              <Popover title="Item Price" placement="top">
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", minWidth: "300px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem", color: "var(--cim-fg-base)" }}>
                    <span>Price ({priceBreakdown.quantity} qty)</span>
                    <span>{priceBreakdown.basePrice.toFixed(2)} USD</span>
                  </div>
                  {priceBreakdown.selectedChargeLabel && (
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem", color: "var(--cim-fg-base)" }}>
                      <span>{priceBreakdown.selectedChargeLabel}</span>
                      <span>{priceBreakdown.selectedChargePrice?.toFixed(2)} USD</span>
                    </div>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem", color: "var(--cim-fg-base)" }}>
                    <span>Discount</span>
                    <span style={{ color: "var(--cim-fg-muted, #94979b)" }}>0.00 USD</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem", color: "var(--cim-fg-base)" }}>
                    <span>{priceBreakdown.artworkOption === "customise" ? "Artwork customisation" : "New artwork"}</span>
                    <span>10.00 USD</span>
                  </div>
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
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem", color: "var(--cim-fg-base)" }}>
                    <span>Subtotal</span>
                    <span>{priceBreakdown.subtotal.toFixed(2)} USD</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem", color: "var(--cim-fg-subtle, #5f6469)" }}>
                    <span>Tax ({priceBreakdown.taxRate}%)</span>
                    <span>{priceBreakdown.tax.toFixed(2)} USD</span>
                  </div>
                  <div style={{ height: "1px", background: "var(--cim-border-base, #dadcdd)", margin: "4px 0" }} />
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <span style={{ fontSize: "1rem", fontWeight: 600, color: "var(--cim-fg-base)" }}>Total due</span>
                    <span style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--cim-fg-base, #15191d)" }}>
                      {priceBreakdown.totalDue.toFixed(2)} USD
                    </span>
                  </div>
                </div>
              </Popover>
            </PopoverRoot>
          ) : (
            <span style={{ fontSize: "0.875rem", color: "var(--cim-fg-muted, #94979b)", textDecoration: "underline" }}>View details</span>
          )}
        </div>

        {/* Right: Cancel + Add item to cart */}
        <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
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
  );
}
