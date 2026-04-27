"use client";

import { useState, useEffect, useRef } from "react";
import {
  Checkbox, Button, Disclosure, AlertDialog, AlertDialogBody, AlertDialogActions,
  TextField,
} from "@cimpress-ui/react";
import {
  IconTrash,
  IconPencil,
  IconMenuMoreVertical,
  IconCheckCircleFill,
  IconInfoCircle,
} from "@cimpress-ui/react/icons";
import type { DraftOrderItem } from "@/lib/types";
import { Toast } from "@/components/Toast";

interface OrderItemsListProps {
  items: DraftOrderItem[];
  onEdit: (draftItemId: string) => void;
  onRemove: (draftItemId: string) => void;
  onDuplicate: (draftItemId: string) => void;
  onQuantityChange?: (draftItemId: string, newQty: number) => void;
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
};

export function OrderItemsList({ items, onEdit, onRemove, onDuplicate, onQuantityChange, onAccessoryRemove }: OrderItemsListProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [removingItemId, setRemovingItemId] = useState<string | null>(null);
  const [removingAccessory, setRemovingAccessory] = useState<{ itemId: string; accessoryId: string } | null>(null);
  const [sizePopoverOpenId, setSizePopoverOpenId] = useState<string | null>(null);
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
          Remove all Items
        </Button>
      </div>

      {/* Item cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {items.map((item) => {
          const taxRate = item.product.taxRate ?? 8;
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
                    <button
                      style={iconBtnStyle}
                      title="More options"
                      aria-label="More options"
                      onClick={() => {}}
                    >
                      <IconMenuMoreVertical />
                    </button>
                    <button
                      style={iconBtnStyle}
                      title="Edit"
                      aria-label="Edit item"
                      onClick={() => onEdit(item.draftItemId)}
                    >
                      <IconPencil />
                    </button>
                    <button
                      style={{ ...iconBtnStyle, color: "var(--cim-fg-critical, #d10023)" }}
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
                      width: "187px",
                      height: "187px",
                      borderRadius: "6px",
                      overflow: "hidden",
                      background: "white",
                      border: "1px solid var(--cim-border-subtle, #eaebeb)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}>
                      {item.product.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.product.imageUrl}
                          alt={item.product.name}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
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

                  {/* Quantity field + stock (left) */}
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px", minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <div style={{ flex: 1, minWidth: 0, position: "relative" }}>
                        <TextField
                          label={item.product.quantityMode === "per-size" ? "Total Quantity" : "Quantity"}
                          value={String(item.quantity)}
                          description={item.product.quantityMode !== "per-size"
                            ? `Between ${item.product.minOrderQty} – ${item.product.maxOrderQty}`
                            : undefined}
                          isInvalid={
                            item.quantity < item.product.minOrderQty || item.quantity > item.product.maxOrderQty
                          }
                          onChange={(val) => {
                            const n = parseInt(val, 10);
                            if (!isNaN(n) && n >= item.product.minOrderQty && n <= item.product.maxOrderQty) {
                              onQuantityChange?.(item.draftItemId, n);
                            }
                          }}
                          inputMode="numeric"
                          isDisabled={!onQuantityChange || item.product.quantityMode === "per-size"}
                          isReadOnly={item.product.quantityMode === "per-size"}
                        />

                        {/* Clickable "Aggregated across sizes" description + popover */}
                        {item.product.quantityMode === "per-size" && (
                          <div style={{ position: "relative" }} ref={sizePopoverOpenId === item.draftItemId ? popoverRef : undefined}>
                            <button
                              onClick={() => setSizePopoverOpenId(
                                sizePopoverOpenId === item.draftItemId ? null : item.draftItemId
                              )}
                              style={{
                                background: "none",
                                border: "none",
                                padding: "2px 0 0",
                                cursor: "pointer",
                                fontSize: "0.875rem",
                                color: "var(--cim-fg-accent, #007798)",
                                textDecoration: "underline",
                                textDecorationStyle: "dotted",
                                display: "flex",
                                alignItems: "center",
                                gap: "4px",
                              }}
                            >
                              <IconInfoCircle size={16} />
                              Aggregated across sizes
                            </button>

                            {sizePopoverOpenId === item.draftItemId && (
                              <div
                                style={{
                                  position: "absolute",
                                  top: "calc(100% + 6px)",
                                  left: 0,
                                  zIndex: 200,
                                  background: "white",
                                  border: "1px solid var(--cim-border-base, #dadcdd)",
                                  borderRadius: "8px",
                                  padding: "12px 14px",
                                  boxShadow: "0 4px 16px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.08)",
                                  minWidth: "200px",
                                  maxWidth: "280px",
                                }}
                              >
                                <p style={{ margin: "0 0 10px", fontSize: "0.875rem", fontWeight: 600, color: "var(--cim-fg-base, #15191d)" }}>
                                  Size breakdown
                                </p>
                                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                  {item.product.availableSizes
                                    ? item.product.availableSizes.map((size) => {
                                        const qty = item.sizeQuantities?.[size] ?? 0;
                                        return (
                                          <div
                                            key={size}
                                            style={{
                                              display: "flex",
                                              justifyContent: "space-between",
                                              alignItems: "center",
                                              padding: "4px 8px",
                                              borderRadius: "4px",
                                              background: qty > 0 ? "var(--cim-bg-info-subtle, #e8f4f8)" : "transparent",
                                            }}
                                          >
                                            <span style={{ fontSize: "0.875rem", color: qty > 0 ? "var(--cim-fg-base, #15191d)" : "var(--cim-fg-muted, #94979b)", fontWeight: qty > 0 ? 600 : 400 }}>
                                              {size}
                                            </span>
                                            <span style={{ fontSize: "0.875rem", color: qty > 0 ? "var(--cim-fg-base, #15191d)" : "var(--cim-fg-muted, #94979b)", fontWeight: qty > 0 ? 600 : 400 }}>
                                              {qty}
                                            </span>
                                          </div>
                                        );
                                      })
                                    : (
                                      <span style={{ fontSize: "0.875rem", color: "var(--cim-fg-muted)" }}>No size data</span>
                                    )}
                                </div>
                                <div style={{ borderTop: "1px solid var(--cim-border-subtle, #eaebeb)", marginTop: "10px", paddingTop: "8px", display: "flex", justifyContent: "space-between" }}>
                                  <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--cim-fg-base, #15191d)" }}>Total</span>
                                  <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--cim-fg-base, #15191d)" }}>{item.quantity}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      {item.product.quantityMode !== "per-size" && (
                        <div style={{ marginTop: "20px", color: "var(--cim-fg-subtle, #5f6469)", display: "flex", flexShrink: 0 }}>
                          <IconInfoCircle />
                        </div>
                      )}
                    </div>
                    {stockQty != null && (
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ color: "var(--cim-fg-success, #007e3f)", display: "flex" }}>
                          <IconCheckCircleFill />
                        </span>
                        <span style={{ fontSize: "0.875rem", color: "var(--cim-fg-base, #15191d)" }}>
                          In stock - {stockQty}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Item total section (right-aligned) */}
                  <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px", minWidth: "160px" }}>
                    <span style={{ fontSize: "1rem", fontWeight: 600, color: "var(--cim-fg-subtle, #5f6469)" }}>
                      Item total
                    </span>
                    <span style={{ fontSize: "0.875rem", color: "var(--cim-fg-base, #15191d)" }}>
                      Unit Price {item.unitPrice.toFixed(2)} USD
                    </span>
                    <span style={{ fontSize: "0.875rem", color: "var(--cim-fg-base, #15191d)" }}>
                      Tax {taxAmount.toFixed(2)} USD
                    </span>
                    <span style={{ fontSize: "1.125rem", fontWeight: 600, color: "var(--cim-fg-base, #15191d)", marginTop: "4px" }}>
                      {item.lineTotal.toFixed(2)} USD
                    </span>
                  </div>
                </div>
              </div>

              {/* Selected options disclosure */}
              <div style={{ borderTop: "1px solid var(--cim-border-subtle, #eaebeb)" }}>
                <Disclosure title="Selected options and details" variant="subtle">
                  <div style={{ padding: "12px 16px 16px", display: "flex", flexDirection: "column", gap: "6px" }}>
                    {attributes.length > 0 ? (
                      attributes.map((attr, i) => (
                        <span key={i} style={{ fontSize: "0.875rem", color: "var(--cim-fg-base)" }}>{attr}</span>
                      ))
                    ) : (
                      <span style={{ fontSize: "0.875rem", color: "var(--cim-fg-muted)" }}>No attributes selected</span>
                    )}
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

              {/* Accessories rows */}
              {item.accessories && item.accessories.length > 0 && (
                <div style={{ borderTop: "1px solid var(--cim-border-subtle, #eaebeb)" }}>
                  {item.accessories.map((acc) => (
                    <div
                      key={acc.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 16px",
                        gap: "12px",
                      }}
                    >
                      <span style={{ fontSize: "0.875rem", color: "var(--cim-fg-base, #15191d)" }}>
                        {acc.quantity} {acc.label} added as an accessory (USD {(acc.quantity * acc.unitPrice).toFixed(2)})
                      </span>
                      <button
                        style={{ ...iconBtnStyle, color: "var(--cim-fg-critical, #d10023)", flexShrink: 0 }}
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
    </div>
  );
}
