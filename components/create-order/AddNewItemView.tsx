"use client";

import { useState, useRef, useEffect } from "react";
import { Button, SearchField, Text, PopoverRoot, Popover, CopyInline, TextArea } from "@cimpress-ui/react";
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
  autoOpenPriceOverride?: boolean;
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

export function AddNewItemView({ customer, selectedStore, editingItem, onAddComplete, onCancel, autoOpenPriceOverride }: AddNewItemViewProps) {
  const isEditing = !!editingItem;
  const [query, setQuery] = useState(editingItem?.product.name ?? "");
  const [dropdownResults, setDropdownResults] = useState<ProductCatalogItem[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductCatalogItem | null>(editingItem?.product ?? null);
  const [itemTotal, setItemTotal] = useState(editingItem?.lineTotal ?? 0);
  const [isValid, setIsValid] = useState(isEditing);
  const [priceBreakdown, setPriceBreakdown] = useState<PriceBreakdown | null>(null);
  const [notesText, setNotesText] = useState("");
  const [templateApplied, setTemplateApplied] = useState(false);
  const [templateFields, setTemplateFields] = useState({
    reasonForPriceQuery: "",
    supervisorApproved: "",
    quoteId: "",
    shipping: "",
    // Offer customisation — auto-synced from priceBreakdown.offerCustomization
    offerType: "",
    offerInputLabel: "",
    offerInput: "",
    offerNewItemPrice: "",
    offerDiscount: "",
    offerReason: "",
  });

  // Auto-sync offer customisation fields from ItemConfigurationCard whenever the offer changes
  const ocType = priceBreakdown?.offerCustomization?.type ?? null;
  const ocInputValue = priceBreakdown?.offerCustomization?.inputValue ?? "";
  const ocNewItemPrice = priceBreakdown?.offerCustomization?.newItemPrice ?? null;
  const ocDiscount = priceBreakdown?.offerCustomization?.discountAmount ?? null;
  const ocReason = priceBreakdown?.offerCustomization?.reasonLabel ?? "";
  useEffect(() => {
    if (!templateApplied) return;
    const oc = priceBreakdown?.offerCustomization;
    setTemplateFields(prev => ({
      ...prev,
      offerType: oc?.typeName ?? "",
      offerInputLabel: oc?.inputLabel ?? "",
      offerInput: oc?.inputValue ?? "",
      offerNewItemPrice: oc?.newItemPrice != null ? `${oc.newItemPrice.toFixed(2)} USD` : "",
      offerDiscount: oc?.discountAmount != null ? `${oc.discountAmount.toFixed(2)} USD` : "",
      offerReason: oc?.reasonLabel ?? "",
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ocType, ocInputValue, ocNewItemPrice, ocDiscount, ocReason, templateApplied]);

  function buildNotesString(): string {
    if (!templateApplied) return notesText;
    const lines: string[] = [];
    lines.push("Reason for price query:");
    if (templateFields.reasonForPriceQuery) lines.push(templateFields.reasonForPriceQuery);
    lines.push("");
    lines.push("Supervisor Approved:");
    if (templateFields.supervisorApproved) lines.push(templateFields.supervisorApproved);
    lines.push("");
    lines.push("Quote ID:");
    if (templateFields.quoteId) lines.push(templateFields.quoteId);
    lines.push("");
    if (priceBreakdown && priceBreakdown.quantity > 0) {
      lines.push("Main Item Qty & Package Price:");
      lines.push(`${priceBreakdown.quantity} * $${priceBreakdown.unitPrice.toFixed(2)} and New package price $${priceBreakdown.basePrice.toFixed(2)}`);
      lines.push("");
    }
    if (priceBreakdown && priceBreakdown.accessories.length > 0) {
      lines.push("Accessories Qty & Package Price:");
      priceBreakdown.accessories.forEach((acc) => {
        lines.push(`${acc.label}: ${acc.quantity} * $${acc.unitPrice.toFixed(2)} and New package price $${(acc.quantity * acc.unitPrice).toFixed(2)}`);
      });
      lines.push("");
    }
    if (priceBreakdown && priceBreakdown.charges.length > 0) {
      lines.push("Fixed Charges:");
      priceBreakdown.charges.forEach((c) => {
        lines.push(`${c.label}: 1 * $${c.price.toFixed(2)} and New package price $${c.price.toFixed(2)}`);
      });
      lines.push("");
    }
    if (templateFields.offerType) {
      lines.push("Offer Customisation:");
      lines.push(`Offer type: ${templateFields.offerType}`);
      if (templateFields.offerInputLabel && templateFields.offerInput) {
        lines.push(`${templateFields.offerInputLabel}: ${templateFields.offerInput}`);
      }
      if (templateFields.offerNewItemPrice) lines.push(`New item price: ${templateFields.offerNewItemPrice}`);
      if (templateFields.offerDiscount) lines.push(`Discount: ${templateFields.offerDiscount}`);
      if (templateFields.offerReason) lines.push(`Reason: ${templateFields.offerReason}`);
      lines.push("");
    }
    lines.push("Shipping:");
    if (templateFields.shipping) lines.push(templateFields.shipping);
    lines.push("");
    if (priceBreakdown) {
      lines.push("Item Total (excluding shipping and tax):");
      lines.push(`${priceBreakdown.subtotal.toFixed(2)} USD`);
    }
    return lines.join("\n");
  }

  function handleAddComplete(item: import("@/lib/types").DraftOrderItem) {
    onAddComplete({ ...item, internalNotes: buildNotesString() || undefined });
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
                onAddToOrder={handleAddComplete}
                onLineTotalChange={setItemTotal}
                onValidityChange={setIsValid}
                onPriceBreakdownChange={setPriceBreakdown}
                autoOpenPriceOverride={autoOpenPriceOverride}
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
            gap: "16px",
            maxHeight: "calc(100vh - 80px)",
            overflowY: "auto",
          }}>
            {/* Header row */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "1rem", fontWeight: 400, lineHeight: "24px", color: "var(--cim-fg-base, #15191d)" }}>Internal notes</span>
              <button
                onClick={templateApplied ? () => { setTemplateApplied(false); setTemplateFields({ reasonForPriceQuery: "", supervisorApproved: "", quoteId: "", shipping: "", offerType: "", offerInputLabel: "", offerInput: "", offerNewItemPrice: "", offerDiscount: "", offerReason: "" }); } : () => setTemplateApplied(true)}
                style={{
                  background: "none", border: "none", cursor: "pointer", padding: 0,
                  fontSize: "0.875rem", lineHeight: "20px",
                  color: "var(--cim-fg-accent, #007798)",
                  textDecoration: "underline",
                  textDecorationThickness: "1.5px",
                  textUnderlineOffset: "2px",
                }}
              >
                {templateApplied ? "Clear template" : "Add template"}
              </button>
            </div>

            {/* Notes: textarea by default, structured template when applied */}
            {templateApplied ? (() => {
              const labelStyle: React.CSSProperties = { fontSize: "0.875rem", fontWeight: 400, lineHeight: "20px", color: "var(--cim-fg-base, #15191d)", margin: "0 0 2px" };
              const valueStyle: React.CSSProperties = { fontSize: "0.875rem", fontWeight: 600, lineHeight: "20px", color: "var(--cim-fg-base, #15191d)", margin: "0 0 8px" };
              const inputStyle: React.CSSProperties = { width: "100%", border: "none", borderBottom: "1px solid var(--cim-border-subtle, #eaebeb)", outline: "none", background: "transparent", resize: "none", fontSize: "0.875rem", fontFamily: "inherit", lineHeight: "20px", color: "var(--cim-fg-base, #15191d)", padding: "0 0 2px", marginBottom: "8px", minHeight: "20px", overflow: "hidden", wordBreak: "break-word" };
              const autoGrow = (e: React.FormEvent<HTMLTextAreaElement>) => { const t = e.currentTarget; t.style.height = "auto"; t.style.height = t.scrollHeight + "px"; };
              const mainItemValue = priceBreakdown && priceBreakdown.quantity > 0
                ? `${priceBreakdown.quantity} * $${priceBreakdown.unitPrice.toFixed(2)} and New package price $${priceBreakdown.basePrice.toFixed(2)}`
                : null;
              const accessoriesValues = priceBreakdown?.accessories.map(acc => `${acc.label}: ${acc.quantity} * $${acc.unitPrice.toFixed(2)} and New package price $${(acc.quantity * acc.unitPrice).toFixed(2)}`) ?? [];
              const chargesValues = priceBreakdown?.charges.map(c => `${c.label}: 1 * $${c.price.toFixed(2)} and New package price $${c.price.toFixed(2)}`) ?? [];
              const itemTotalValue = priceBreakdown ? `${priceBreakdown.subtotal.toFixed(2)} USD` : null;
              return (
                <div style={{ display: "flex", flexDirection: "column", width: "100%" }}>
                  <p style={labelStyle}>Reason for price query:</p>
                  <textarea rows={1} value={templateFields.reasonForPriceQuery} onInput={autoGrow} onChange={e => setTemplateFields(p => ({ ...p, reasonForPriceQuery: e.target.value }))} style={inputStyle} />
                  <p style={labelStyle}>Supervisor Approved:</p>
                  <textarea rows={1} value={templateFields.supervisorApproved} onInput={autoGrow} onChange={e => setTemplateFields(p => ({ ...p, supervisorApproved: e.target.value }))} style={inputStyle} />
                  <p style={labelStyle}>Quote ID:</p>
                  <textarea rows={1} value={templateFields.quoteId} onInput={autoGrow} onChange={e => setTemplateFields(p => ({ ...p, quoteId: e.target.value }))} style={inputStyle} />
                  <p style={labelStyle}>Main Item Qty &amp; Package Price:</p>
                  {mainItemValue ? <p style={valueStyle}>{mainItemValue}</p> : <p style={{ ...valueStyle, color: "var(--cim-fg-muted, #94979b)" }}>—</p>}
                  <p style={labelStyle}>Accessories Qty &amp; Package Price:</p>
                  {accessoriesValues.length > 0 ? accessoriesValues.map((v, i) => <p key={i} style={valueStyle}>{v}</p>) : <p style={{ ...valueStyle, color: "var(--cim-fg-muted, #94979b)", marginBottom: "8px" }}>—</p>}
                  <p style={labelStyle}>Fixed Charges:</p>
                  {chargesValues.length > 0 ? chargesValues.map((v, i) => <p key={i} style={valueStyle}>{v}</p>) : <p style={{ ...valueStyle, color: "var(--cim-fg-muted, #94979b)", marginBottom: "8px" }}>—</p>}
                  {templateFields.offerType && (
                    <>
                      <div style={{ height: "1px", background: "var(--cim-border-subtle, #eaebeb)", margin: "8px 0" }} />
                      <p style={{ ...labelStyle, fontWeight: 600, marginBottom: "8px" }}>Offer Customisation:</p>
                      <p style={labelStyle}>Offer type:</p>
                      <textarea rows={1} value={templateFields.offerType} onInput={autoGrow} onChange={e => setTemplateFields(p => ({ ...p, offerType: e.target.value }))} style={inputStyle} />
                      {templateFields.offerInputLabel && (
                        <>
                          <p style={labelStyle}>{templateFields.offerInputLabel}:</p>
                          <textarea rows={1} value={templateFields.offerInput} onInput={autoGrow} onChange={e => setTemplateFields(p => ({ ...p, offerInput: e.target.value }))} style={inputStyle} />
                        </>
                      )}
                      <p style={labelStyle}>New item price:</p>
                      <textarea rows={1} value={templateFields.offerNewItemPrice} onInput={autoGrow} onChange={e => setTemplateFields(p => ({ ...p, offerNewItemPrice: e.target.value }))} style={inputStyle} />
                      <p style={labelStyle}>Discount:</p>
                      <textarea rows={1} value={templateFields.offerDiscount} onInput={autoGrow} onChange={e => setTemplateFields(p => ({ ...p, offerDiscount: e.target.value }))} style={inputStyle} />
                      <p style={labelStyle}>Reason for customisation:</p>
                      <textarea rows={1} value={templateFields.offerReason} onInput={autoGrow} onChange={e => setTemplateFields(p => ({ ...p, offerReason: e.target.value }))} style={inputStyle} />
                      <div style={{ height: "1px", background: "var(--cim-border-subtle, #eaebeb)", margin: "8px 0" }} />
                    </>
                  )}
                  <p style={labelStyle}>Shipping:</p>
                  <textarea rows={1} value={templateFields.shipping} onInput={autoGrow} onChange={e => setTemplateFields(p => ({ ...p, shipping: e.target.value }))} style={inputStyle} />
                  <p style={labelStyle}>Item Total (excluding shipping and tax):</p>
                  {itemTotalValue ? <p style={{ ...valueStyle, marginBottom: 0 }}>{itemTotalValue}</p> : <p style={{ ...valueStyle, color: "var(--cim-fg-muted, #94979b)", marginBottom: 0 }}>—</p>}
                </div>
              );
            })() : (
              <TextArea
                aria-label="Internal notes"
                value={notesText}
                onChange={setNotesText}
                rows={12}
              />
            )}
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
