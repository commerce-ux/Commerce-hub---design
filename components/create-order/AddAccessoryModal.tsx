"use client";

import { useState, useEffect } from "react";
import { Button, ModalDialog, ModalDialogBody, ModalDialogActions } from "@cimpress-ui/react";
import type { DraftOrderItemAccessory } from "@/lib/types";

export interface AccessoryCatalogItem {
  id: string;
  name: string;
  itemId: string;
  imageUrl: string;
  unitPrice: number;
  minQty: number;
  maxQty: number;
}

export const MOCK_ACCESSORIES: AccessoryCatalogItem[] = [
  {
    id: "acc-standard-backpack",
    name: "Standard Backpack",
    itemId: "PRD-666QNK",
    imageUrl: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=300&h=300&fit=crop",
    unitPrice: 15.99,
    minQty: 5,
    maxQty: 250,
  },
  {
    id: "acc-tote-bag",
    name: "Canvas Tote Bag",
    itemId: "PRD-TT2847",
    imageUrl: "https://images.unsplash.com/photo-1544816155-12df9643f363?w=300&h=300&fit=crop",
    unitPrice: 8.50,
    minQty: 10,
    maxQty: 500,
  },
  {
    id: "acc-lanyard",
    name: "Custom Lanyard",
    itemId: "PRD-LY9934",
    imageUrl: "https://images.unsplash.com/photo-1609709295948-17d77cb2a69b?w=300&h=300&fit=crop",
    unitPrice: 3.25,
    minQty: 25,
    maxQty: 1000,
  },
  {
    id: "acc-notebook",
    name: "Branded Notebook",
    itemId: "PRD-NB4421",
    imageUrl: "https://images.unsplash.com/photo-1531346878377-a5be20888e57?w=300&h=300&fit=crop",
    unitPrice: 6.75,
    minQty: 10,
    maxQty: 300,
  },
  {
    id: "acc-mug",
    name: "Ceramic Coffee Mug",
    itemId: "PRD-MG8812",
    imageUrl: "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=300&h=300&fit=crop",
    unitPrice: 9.50,
    minQty: 12,
    maxQty: 200,
  },
  {
    id: "acc-pen-set",
    name: "Branded Pen Set",
    itemId: "PRD-PS3301",
    imageUrl: "https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=300&h=300&fit=crop",
    unitPrice: 4.99,
    minQty: 50,
    maxQty: 1000,
  },
];


interface AccessoryCardProps {
  item: AccessoryCatalogItem;
  onAdd: (acc: DraftOrderItemAccessory) => void;
  isAdded?: boolean;
  onRemove?: () => void;
  mainItemQty?: number;
}

export function AccessoryCard({ item, onAdd, isAdded = false, onRemove, mainItemQty = 0 }: AccessoryCardProps) {
  const [qty, setQty] = useState<number>(0);

  useEffect(() => {
    if (!isAdded) setQty(0);
  }, [isAdded]);

  const effectiveMax = mainItemQty > 0 ? Math.min(item.maxQty, mainItemQty) : item.maxQty;

  useEffect(() => {
    if (qty > effectiveMax) setQty(effectiveMax > 0 ? effectiveMax : 0);
  }, [effectiveMax, qty]);

  const itemTotal = qty * item.unitPrice;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px", border: "1px solid var(--cim-border-base, #dadcdd)", borderRadius: "6px", padding: "12px" }}>
      {/* Name + ID */}
      <div>
        <p style={{ margin: 0, fontSize: "1rem", fontWeight: 600, color: "var(--cim-fg-base, #15191d)", lineHeight: "24px" }}>
          {item.name}
        </p>
        <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--cim-fg-subtle, #5f6469)", lineHeight: "16px" }}>
          {item.itemId}
        </p>
      </div>

      {/* Image — full width, centered */}
      <div style={{ width: "100%", height: "120px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "6px", overflow: "hidden", background: "var(--cim-bg-subtle, #f8f9fa)" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={item.imageUrl} alt={item.name} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
      </div>

      {/* Quantity input */}
      <div style={{ background: "white", border: "1px solid var(--cim-border-base, #dadcdd)", borderRadius: "var(--cim-radius-4, 4px)", minHeight: "40px", display: "flex", alignItems: "center", padding: "0 4px 0 12px", gap: "4px" }}>
        <input
          type="number"
          value={qty === 0 ? "" : qty}
          placeholder="0"
          onChange={(e) => {
            const val = Math.max(0, parseInt(e.target.value, 10) || 0);
            setQty(Math.min(val, effectiveMax));
          }}
          style={{ flex: 1, border: "none", outline: "none", fontSize: "1rem", color: qty > 0 ? "var(--cim-fg-base, #15191d)" : "var(--cim-fg-subtle, #5f6469)", background: "transparent", MozAppearance: "textfield" } as React.CSSProperties}
        />
      </div>

      {/* Unit price (right-aligned) + Item Total row */}
      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
        <div style={{ textAlign: "right", fontSize: "0.75rem", color: "var(--cim-fg-subtle, #5f6469)" }}>
          {item.unitPrice.toFixed(2)} USD /unit
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ fontSize: "0.875rem", color: "var(--cim-fg-base, #15191d)" }}>Item Total</span>
          <span style={{ fontSize: "1rem", fontWeight: 600, color: "var(--cim-fg-base, #15191d)" }}>{itemTotal.toFixed(2)} USD</span>
        </div>
      </div>

      {/* Add / Remove button — full width */}
      {isAdded ? (
        <Button tone="critical" onPress={() => onRemove?.()}>Remove</Button>
      ) : (
        <Button variant="secondary" onPress={() => onAdd({ id: item.id, label: item.name, quantity: qty, unitPrice: item.unitPrice })}>
          Add to item
        </Button>
      )}
    </div>
  );
}

interface AddAccessoryModalProps {
  onAdd: (acc: DraftOrderItemAccessory) => void;
  onRemove?: (accessoryId: string) => void;
  onCancel: () => void;
  existingAccessories?: DraftOrderItemAccessory[];
  mainItemQty?: number;
}

export function AddAccessoryModal({ onAdd, onRemove, onCancel, existingAccessories = [], mainItemQty = 0 }: AddAccessoryModalProps) {
  const addedCount = existingAccessories.length;
  return (
    <ModalDialog
      title={`Add Accessory${addedCount > 0 ? ` (${addedCount})` : ""}`}
      size="large"
      isOpen
      onOpenChange={(open) => { if (!open) onCancel(); }}
      isDismissible
    >
      <ModalDialogBody>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px" }}>
          {MOCK_ACCESSORIES.map((acc) => {
            const existing = existingAccessories.find((e) => e.id === acc.id);
            return (
              <AccessoryCard
                key={acc.id}
                item={acc}
                isAdded={Boolean(existing)}
                mainItemQty={mainItemQty}
                onAdd={(added) => onAdd(added)}
                onRemove={existing ? () => onRemove?.(acc.id) : undefined}
              />
            );
          })}
        </div>
      </ModalDialogBody>
      <ModalDialogActions>
        <Button variant="secondary" onPress={onCancel}>Close</Button>
      </ModalDialogActions>
    </ModalDialog>
  );
}
