"use client";

import { useState, useEffect, useRef } from "react";
import {
  Checkbox, Button, Disclosure, AlertDialog, AlertDialogBody, AlertDialogActions,
  TextField, Select, SelectItem, ModalDialog, ModalDialogBody,
} from "@cimpress-ui/react";
import {
  IconTrash,
  IconPencil,
  IconMenuMoreVertical,
  IconCheckCircleFill,
  IconInfoCircle,
} from "@cimpress-ui/react/icons";
import type { DraftOrderItem } from "@/lib/types";
import { generateGuideQuantities } from "@/lib/pricingUtils";
import { Toast } from "@/components/Toast";

interface OrderItemsListProps {
  items: DraftOrderItem[];
  onEdit: (draftItemId: string) => void;
  onRemove: (draftItemId: string) => void;
  onDuplicate: (draftItemId: string) => void;
  onQuantityChange?: (draftItemId: string, newQty: number) => void;
  onSizeQuantityChange?: (draftItemId: string, size: string, newQty: number) => void;
  onAccessoryRemove?: (draftItemId: string, accessoryId: string) => void;
}

const iconBtnStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "32px",
  height: "32px",
  border: "none",
  background: "none",
  borderRadius: "4px",
  cursor: "pointer",
  color: "var(--cim-fg-subtle, #5f6469)",
  fontSize: "20px",
};

export function OrderItemsList({ items, onEdit, onRemove, onDuplicate, onQuantityChange, onSizeQuantityChange, onAccessoryRemove }: OrderItemsListProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [removingItemId, setRemovingItemId] = useState<string | null>(null);
  const [removingSize, setRemovingSize] = useState<{ draftItemId: string; size: string; isLastSize: boolean } | null>(null);
  const [removingAccessory, setRemovingAccessory] = useState<{ itemId: string; accessoryId: string } | null>(null);
  const [sizePopoverOpenId, setSizePopoverOpenId] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<{ url: string; alt: string } | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close size popover on outside click
  useEffect(() => {
    if (!sizePopoverOpenId) return;
    function handleOutsideClick(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setSizePopoverOpenId(null);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [sizePopoverOpenId]);

  if (items.length === 0) return null;

  const removingItem = removingItemId ? items.find((i) => i.draftItemId === removingItemId) : null;

  const allSelected = selectedIds.size === items.length && items.length > 0;
  const someSelected = selectedIds.size > 0 && !allSelected;

  function toggleAll() {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((i) => i.draftItemId)));
    }
  }

  function toggleItem(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function removeSelected() {
    selectedIds.forEach((id) => onRemove(id));
    setSelectedIds(new Set());
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
      {/* Image preview modal */}
      {previewImage && (
        <ModalDialog
          title={previewImage.alt}
          size="large"
          isOpen
          onOpenChange={(open) => { if (!open) setPreviewImage(null); }}
          isDismissible
        >
          <ModalDialogBody>
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewImage.url}
                alt={previewImage.alt}
                style={{ maxWidth: "100%", maxHeight: "70vh", objectFit: "contain", borderRadius: "6px" }}
              />
            </div>
          </ModalDialogBody>
        </ModalDialog>
      )}

      <AlertDialog
        title="Remove item"
        tone="critical"
        isOpen={removingItemId !== null}
        onOpenChange={(open) => { if (!open) setRemovingItemId(null); }}
      >
        <AlertDialogBody>
          {removingItem
            ? `Are you sure you want to remove "${removingItem.product.name}" from the order?`
            : "Are you sure you want to remove this item from the order?"}
        </AlertDialogBody>
        <AlertDialogActions>
          <Button variant="tertiary" onPress={() => setRemovingItemId(null)}>Cancel</Button>
          <Button
            variant="primary"
            tone="critical"
            onPress={() => {
              if (removingItemId) {
                onRemove(removingItemId);
                setSelectedIds((prev) => { const n = new Set(prev); n.delete(removingItemId); return n; });
              }
              setRemovingItemId(null);
            }}
          >
            Remove
          </Button>
        </AlertDialogActions>
      </AlertDialog>

      <AlertDialog
        title={removingSize?.isLastSize ? "Remove group" : "Remove size"}
        tone="critical"
        isOpen={removingSize !== null}
        onOpenChange={(open) => { if (!open) setRemovingSize(null); }}
      >
        <AlertDialogBody>
          {removingSize?.isLastSize
            ? `"${removingSize.size}" is the only remaining size. Removing it will remove the entire group from your order. Are you sure?`
            : `Are you sure you want to remove size "${removingSize?.size}" from the order?`}
        </AlertDialogBody>
        <AlertDialogActions>
          <Button variant="tertiary" onPress={() => setRemovingSize(null)}>Cancel</Button>
          <Button
            variant="primary"
            tone="critical"
            onPress={() => {
              if (removingSize) {
                if (removingSize.isLastSize) {
                  onRemove(removingSize.draftItemId);
                  setSelectedIds((prev) => { const n = new Set(prev); n.delete(removingSize.draftItemId); return n; });
                } else {
                  onSizeQuantityChange?.(removingSize.draftItemId, removingSize.size, 0);
                }
              }
              setRemovingSize(null);
            }}
          >
            Remove
          </Button>
        </AlertDialogActions>
      </AlertDialog>

      <AlertDialog
        title="Remove accessory"
        tone="critical"
        isOpen={removingAccessory !== null}
        onOpenChange={(open) => { if (!open) setRemovingAccessory(null); }}
      >
        <AlertDialogBody>
          Are you sure you want to remove this accessory from the item?
        </AlertDialogBody>
        <AlertDialogActions>
          <Button variant="tertiary" onPress={() => setRemovingAccessory(null)}>Cancel</Button>
          <Button
            variant="primary"
            tone="critical"
            onPress={() => {
              if (removingAccessory) {
                onAccessoryRemove?.(removingAccessory.itemId, removingAccessory.accessoryId);
              }
              setRemovingAccessory(null);
            }}
          >
            Remove
          </Button>
        </AlertDialogActions>
      </AlertDialog>

      {/* Selection bar */}
      <div style={{
        background: "var(--cim-bg-subtle, #f8f9fa)",
        borderRadius: "6px",
        padding: "0 16px",
        height: "48px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: "12px",
      }}>
        <Checkbox
          isSelected={allSelected}
          isIndeterminate={someSelected}
          onChange={toggleAll}
        >
          {selectedIds.size} out of {items.length} item{items.length !== 1 ? "s" : ""} selected
        </Checkbox>
        <Button
          variant="tertiary"
          tone="critical"
          size="small"
          isDisabled={selectedIds.size === 0}
          onPress={removeSelected}
        >
          Remove items
        </Button>
      </div>

      {/* Item cards */}
      {(() => {
        // Pre-compute group numbers for per-size items
        const groupIndexMap = new Map<string, number>();
        let gIdx = 0;
        items.forEach((item) => {
          if (item.product.quantityMode === "per-size") {
            groupIndexMap.set(item.draftItemId, ++gIdx);
          }
        });

        return (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {items.map((item) => {
              const taxRate = item.product.taxRate ?? 8;
              const colorAttr = item.product.attributes.find((a) => a.type === "color");
              const selectedColorId = colorAttr
                ? item.selectedAttributes.find((a) => a.attributeId === colorAttr.id)?.selectedOptionId
                : undefined;
              const selectedColorOption = colorAttr?.options.find((o) => o.id === selectedColorId);
              const displayImageUrl = selectedColorOption?.imageUrl ?? item.product.imageUrl;

              // ── Per-size item → render as grouped card ──────────────────────
              if (item.product.quantityMode === "per-size") {
                const gNum = groupIndexMap.get(item.draftItemId)!;
                const activeSizes = (item.product.availableSizes ?? []).filter(
                  (size) => (item.sizeQuantities?.[size] ?? 0) > 0
                );

                return (
                  <div key={item.draftItemId} style={{
                    border: "1px solid var(--cim-border-base, #dadcdd)",
                    borderRadius: "6px",
                    overflow: "hidden",
                    background: "white",
                  }}>
                    {/* Group header bar */}
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "0 12px",
                      height: "48px",
                      background: "var(--cim-bg-subtle, #f8f9fa)",
                      borderBottom: "1px solid var(--cim-border-base, #dadcdd)",
                    }}>
                      <Checkbox
                        isSelected={selectedIds.has(item.draftItemId)}
                        onChange={() => toggleItem(item.draftItemId)}
                      />
                      <span style={{ flex: 1, fontSize: "0.9375rem", fontWeight: 600, color: "var(--cim-fg-base, #15191d)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        G{gNum}({activeSizes.length} item{activeSizes.length !== 1 ? "s" : ""}) - {item.product.name}
                      </span>
                      <button
                        style={{ ...iconBtnStyle, flexShrink: 0 }}
                        title="Remove group"
                        aria-label="Remove group"
                        onClick={() => setRemovingItemId(item.draftItemId)}
                      >
                        <IconTrash />
                      </button>
                    </div>

                    {/* Sub-item cards — one per active size */}
                    {activeSizes.length === 0 ? (
                      <div style={{ padding: "24px 16px", textAlign: "center", color: "var(--cim-fg-muted, #94979b)", fontSize: "0.875rem" }}>
                        No sizes selected
                      </div>
                    ) : (
                      <div>
                        {activeSizes.map((size, idx) => {
                          const sizeQty = item.sizeQuantities?.[size] ?? 0;
                          const sizeLineTotal = parseFloat((item.unitPrice * sizeQty).toFixed(2));
                          const sizeTax = parseFloat((sizeLineTotal * (taxRate / 100)).toFixed(2));
                          const stock = item.product.stockBySize?.[size];
                          const overStock = stock !== undefined && sizeQty > stock;

                          return (
                            <div key={size} style={{
                              borderTop: idx === 0 ? "none" : "1px solid var(--cim-border-subtle, #eaebeb)",
                            }}>
                              {/* Sub-item body */}
                              <div style={{ display: "flex", flexDirection: "column", gap: "16px", padding: "16px" }}>
                                {/* Sub-item header */}
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                                  <span style={{ fontSize: "1.125rem", fontWeight: 600, color: "var(--cim-fg-base, #15191d)" }}>
                                    {item.product.name} - {size}
                                  </span>
                                  <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
                                    <button style={iconBtnStyle} title="More options" aria-label="More options" onClick={() => {}}>
                                      <IconMenuMoreVertical />
                                    </button>
                                    <button style={iconBtnStyle} title="Edit" aria-label="Edit item" onClick={() => onEdit(item.draftItemId)}>
                                      <IconPencil />
                                    </button>
                                    <button
                                      style={iconBtnStyle}
                                      title="Remove size"
                                      aria-label={`Remove ${size} from order`}
                                      onClick={() => {
                                        const otherActiveSizes = Object.entries(item.sizeQuantities ?? {})
                                          .filter(([s, q]) => s !== size && (q ?? 0) > 0);
                                        setRemovingSize({
                                          draftItemId: item.draftItemId,
                                          size,
                                          isLastSize: otherActiveSizes.length === 0,
                                        });
                                      }}
                                    >
                                      <IconTrash />
                                    </button>
                                  </div>
                                </div>

                                {/* Image + qty + total */}
                                <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
                                  {/* Image */}
                                  <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", gap: "8px" }}>
                                    <div style={{
                                      width: "187px", height: "187px", borderRadius: "6px", overflow: "hidden",
                                      background: "white", border: "1px solid var(--cim-border-subtle, #eaebeb)",
                                      display: "flex", alignItems: "center", justifyContent: "center",
                                    }}>
                                      {displayImageUrl ? (
                                        <button
                                          onClick={() => setPreviewImage({ url: displayImageUrl, alt: selectedColorOption?.label ?? item.product.name })}
                                          style={{ width: "100%", height: "100%", padding: 0, border: "none", background: "none", cursor: "zoom-in", display: "flex" }}
                                          aria-label="Preview image"
                                        >
                                          {/* eslint-disable-next-line @next/next/no-img-element */}
                                          <img src={displayImageUrl} alt={selectedColorOption?.label ?? item.product.name}
                                            style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                        </button>
                                      ) : (
                                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                          <rect x="3" y="3" width="18" height="18" rx="2" stroke="var(--cim-fg-muted)" strokeWidth="1.5" />
                                        </svg>
                                      )}
                                    </div>
                                    <a
                                      href="https://pens.experience.cimpress.io/us/studio/?key=PRD-ZQO1BK4YA&productVersion=4&locale=en-us"
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      style={{ fontSize: "1rem", color: "var(--cim-fg-accent, #007798)", textDecoration: "underline" }}
                                    >
                                      Edit design
                                    </a>
                                  </div>

                                  {/* Right column: qty+total row + disclosure */}
                                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "16px", minWidth: 0 }}>
                                    {/* Quantity + item total row */}
                                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px" }}>
                                      {/* Quantity + stock */}
                                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                        <Select
                                          label="Quantity"
                                          selectedKey={String(sizeQty)}
                                          description={`Size: ${size}`}
                                          onSelectionChange={(val) => {
                                            const n = Number(val);
                                            if (n >= 0) onSizeQuantityChange?.(item.draftItemId, size, n);
                                          }}
                                        >
                                          {(() => {
                                            const maxOpt = stock ?? Math.min(item.product.maxOrderQty, 500);
                                            const opts: number[] = [];
                                            for (let q = 1; q <= maxOpt; q++) opts.push(q);
                                            return opts.map((q) => (
                                              <SelectItem key={String(q)} id={String(q)}>{q}</SelectItem>
                                            ));
                                          })()}
                                        </Select>
                                        {stock !== undefined && (
                                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                            <span style={{ color: overStock ? "var(--cim-fg-critical, #d10023)" : "var(--cim-fg-success, #007e3f)", display: "flex" }}>
                                              <IconCheckCircleFill />
                                            </span>
                                            <span style={{ fontSize: "0.875rem", color: overStock ? "var(--cim-fg-critical, #d10023)" : "var(--cim-fg-base, #15191d)" }}>
                                              {overStock ? `Over stock — only ${stock} left` : `In stock - ${stock}`}
                                            </span>
                                          </div>
                                        )}
                                      </div>

                                      {/* Item total */}
                                      <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px", minWidth: "160px" }}>
                                        <span style={{ fontSize: "1rem", fontWeight: 600, color: "var(--cim-fg-subtle, #5f6469)" }}>Item total</span>
                                        <span style={{ fontSize: "0.875rem", color: "var(--cim-fg-base, #15191d)" }}>Tax {sizeTax.toFixed(2)} USD</span>
                                        <span style={{ fontSize: "1.125rem", fontWeight: 600, color: "var(--cim-fg-base, #15191d)", marginTop: "4px" }}>
                                          {sizeLineTotal.toFixed(2)} USD
                                        </span>
                                        <span style={{ fontSize: "0.75rem", color: "var(--cim-fg-subtle, #5f6469)" }}>
                                          USD {item.unitPrice.toFixed(2)} / unit
                                        </span>
                                      </div>
                                    </div>

                                    {/* Selected options disclosure */}
                                    <Disclosure title="Selected options and details" variant="subtle">
                                      <div style={{ padding: "4px 0 8px", display: "flex", flexDirection: "column", gap: "6px" }}>
                                        {selectedColorOption && (
                                          <span style={{ fontSize: "0.875rem", color: "var(--cim-fg-base)" }}>
                                            Color: {selectedColorOption.label}
                                          </span>
                                        )}
                                        <span style={{ fontSize: "0.875rem", color: "var(--cim-fg-base)" }}>Size: {size}</span>
                                        <span style={{ fontSize: "0.875rem", color: "var(--cim-fg-base)" }}>
                                          {sizeQty} x <span style={{ color: "var(--cim-fg-subtle, #5f6469)" }}>(USD {item.unitPrice.toFixed(2)} / unit)</span>
                                        </span>
                                        {item.artworkType !== "none" && item.artworkFileName && (
                                          <span style={{ fontSize: "0.875rem", color: "var(--cim-fg-base)" }}>
                                            Artwork: {item.artworkFileName}
                                          </span>
                                        )}
                                      </div>
                                    </Disclosure>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              // ── Regular (non per-size) item card ───────────────────────────
              const taxAmount = item.lineTotal * (taxRate / 100);
              const stockQty = item.product.stockQuantity;
              const attributes = item.selectedAttributes
                .map((attr) => {
                  const productAttr = item.product.attributes.find((a) => a.id === attr.attributeId);
                  const option = productAttr?.options.find((o) => o.id === attr.selectedOptionId);
                  return option ? `${productAttr?.label}: ${option.label}` : null;
                })
                .filter(Boolean) as string[];

              return (
                <div key={item.draftItemId} style={{
                  background: "white",
                  border: "1px solid var(--cim-border-base, #dadcdd)",
                  borderRadius: "6px",
                  overflow: "hidden",
                }}>
                  {/* Card body */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "16px", padding: "16px" }}>
                    {/* Header: checkbox + name + action buttons */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
                        <Checkbox
                          isSelected={selectedIds.has(item.draftItemId)}
                          onChange={() => toggleItem(item.draftItemId)}
                        />
                        <span style={{ fontSize: "1.125rem", fontWeight: 600, color: "var(--cim-fg-base, #15191d)", whiteSpace: "nowrap" }}>
                          {item.product.name}
                        </span>
                      </div>
                      <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
                        <button style={iconBtnStyle} title="More options" aria-label="More options" onClick={() => {}}>
                          <IconMenuMoreVertical />
                        </button>
                        <button style={iconBtnStyle} title="Edit" aria-label="Edit item" onClick={() => onEdit(item.draftItemId)}>
                          <IconPencil />
                        </button>
                        <button
                          style={iconBtnStyle}
                          title="Remove"
                          aria-label="Remove item"
                          onClick={() => setRemovingItemId(item.draftItemId)}
                        >
                          <IconTrash />
                        </button>
                      </div>
                    </div>

                    {/* Body: image + quantity + item total */}
                    <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
                      {/* Product image + edit design link */}
                      <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", gap: "8px" }}>
                        <div style={{
                          width: "187px", height: "187px", borderRadius: "6px", overflow: "hidden",
                          background: "white", border: "1px solid var(--cim-border-subtle, #eaebeb)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          {displayImageUrl ? (
                            <button
                              onClick={() => setPreviewImage({ url: displayImageUrl, alt: selectedColorOption?.label ?? item.product.name })}
                              style={{ width: "100%", height: "100%", padding: 0, border: "none", background: "none", cursor: "zoom-in", display: "flex" }}
                              aria-label="Preview image"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={displayImageUrl} alt={selectedColorOption?.label ?? item.product.name}
                                style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            </button>
                          ) : (
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                              <rect x="3" y="3" width="18" height="18" rx="2" stroke="var(--cim-fg-muted)" strokeWidth="1.5" />
                            </svg>
                          )}
                        </div>
                        <a
                          href="https://pens.experience.cimpress.io/us/studio/?key=PRD-ZQO1BK4YA&productVersion=4&locale=en-us&selectedOptions=%7B%22Substrate%20Color%22%3A%22%23000000%22%7D&fullBleedElected=true&mpvId=portAuthorityWomensBrickJacketClone&qty=%7b%22S%22%3a0%2c%22M%22%3a0%2c%223XL%22%3a0%2c%22XS%22%3a5%7d"
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ fontSize: "1rem", color: "var(--cim-fg-accent, #007798)", textDecoration: "underline" }}
                        >
                          Edit design
                        </a>
                      </div>

                      {/* Right column: qty+total row + disclosure */}
                      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "16px", minWidth: 0 }}>
                        {/* Quantity + item total row */}
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px" }}>
                          {/* Quantity field + stock */}
                          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <div style={{ minWidth: 0 }}>
                                <Select
                                  label="Quantity"
                                  selectedKey={String(item.quantity)}
                                  onSelectionChange={(val) => {
                                    const n = Number(val);
                                    if (n > 0) onQuantityChange?.(item.draftItemId, n);
                                  }}
                                  description={`Qty has to be between ${item.product.minOrderQty} - ${item.product.maxOrderQty}`}
                                  isDisabled={!onQuantityChange}
                                >
                                  {generateGuideQuantities(item.product.pricingTiers, item.product.minOrderQty, item.product.maxOrderQty).map((q) => {
                                      const overStock = stockQty != null && q > stockQty;
                                      return (
                                        <SelectItem key={String(q)} id={String(q)} isDisabled={overStock}>
                                          {q}{overStock ? " (out of stock)" : ""}
                                        </SelectItem>
                                      );
                                    })}
                                </Select>
                              </div>
                              <button
                                aria-label="Quantity information"
                                style={{
                                  display: "flex", alignItems: "center", justifyContent: "center",
                                  background: "none", border: "none", cursor: "pointer",
                                  color: "var(--cim-fg-subtle, #5f6469)", padding: "4px",
                                  marginTop: "20px", flexShrink: 0,
                                }}
                              >
                                <IconInfoCircle size={24} />
                              </button>
                            </div>
                            {stockQty != null && (() => {
                              const overStock = item.quantity > 0 && item.quantity > stockQty;
                              return (
                                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                  <span style={{ color: overStock ? "var(--cim-fg-critical, #d10023)" : "var(--cim-fg-success, #007e3f)", display: "flex" }}>
                                    <IconCheckCircleFill />
                                  </span>
                                  <span style={{ fontSize: "0.875rem", color: overStock ? "var(--cim-fg-critical, #d10023)" : "var(--cim-fg-base, #15191d)" }}>
                                    In stock - {stockQty}
                                  </span>
                                </div>
                              );
                            })()}
                          </div>

                          {/* Item total */}
                          <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px", minWidth: "160px" }}>
                            <span style={{ fontSize: "1rem", fontWeight: 600, color: "var(--cim-fg-subtle, #5f6469)" }}>Item total</span>
                            <span style={{ fontSize: "0.875rem", color: "var(--cim-fg-base, #15191d)" }}>Tax {taxAmount.toFixed(2)} USD</span>
                            <span style={{ fontSize: "1.125rem", fontWeight: 600, color: "var(--cim-fg-base, #15191d)", marginTop: "4px" }}>
                              {item.lineTotal.toFixed(2)} USD
                            </span>
                            <span style={{ fontSize: "0.75rem", color: "var(--cim-fg-subtle, #5f6469)" }}>
                              USD {item.unitPrice.toFixed(2)} / unit
                            </span>
                          </div>
                        </div>

                        {/* Selected options disclosure */}
                        <Disclosure title="Selected options and details" variant="subtle">
                          <div style={{ padding: "4px 0 8px", display: "flex", flexDirection: "column", gap: "6px" }}>
                            {attributes.length > 0 ? (
                              attributes.map((attr, i) => (
                                <span key={i} style={{ fontSize: "0.875rem", color: "var(--cim-fg-base)" }}>{attr}</span>
                              ))
                            ) : (
                              <span style={{ fontSize: "0.875rem", color: "var(--cim-fg-muted)" }}>No attributes selected</span>
                            )}
                            <span style={{ fontSize: "0.875rem", color: "var(--cim-fg-base)" }}>
                              {item.quantity} x <span style={{ color: "var(--cim-fg-subtle, #5f6469)" }}>(USD {item.unitPrice.toFixed(2)} / unit)</span>
                            </span>
                            {item.artworkType !== "none" && item.artworkFileName && (
                              <span style={{ fontSize: "0.875rem", color: "var(--cim-fg-base)" }}>
                                Artwork: {item.artworkFileName}
                              </span>
                            )}
                            {item.itemDiscount > 0 && (
                              <span style={{ fontSize: "0.875rem", color: "var(--cim-fg-success, #15803d)", fontWeight: 500 }}>
                                {item.itemDiscount}% item discount applied
                              </span>
                            )}
                          </div>
                        </Disclosure>
                      </div>
                    </div>
                  </div>

                  {/* Accessories rows */}
                  {item.accessories && item.accessories.length > 0 && (
                    <div style={{ borderTop: "1px solid var(--cim-border-subtle, #eaebeb)" }}>
                      {item.accessories.map((acc) => (
                        <div
                          key={acc.id}
                          style={{
                            display: "flex", alignItems: "center", justifyContent: "space-between",
                            padding: "10px 16px", gap: "12px",
                          }}
                        >
                          <span style={{ fontSize: "0.875rem", color: "var(--cim-fg-base, #15191d)" }}>
                            {acc.quantity} {acc.label} added as an accessory (USD {(acc.quantity * acc.unitPrice).toFixed(2)})
                          </span>
                          <button
                            style={{ ...iconBtnStyle, flexShrink: 0 }}
                            title="Remove accessory"
                            aria-label={`Remove ${acc.label} accessory`}
                            onClick={() => setRemovingAccessory({ itemId: item.draftItemId, accessoryId: acc.id })}
                          >
                            <IconTrash />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })()}
    </div>
  );
}
