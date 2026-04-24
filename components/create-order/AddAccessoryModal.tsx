"use client";

import { useState, useEffect } from "react";
import { Button, ModalDialog, ModalDialogBody, ModalDialogActions, Select, SelectItem } from "@cimpress-ui/react";
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

function generateQtyOptions(minQty: number, maxQty: number): number[] {
  const opts = new Set<number>([0, minQty]);
  const range = maxQty - minQty;
  const step = range <= 50 ? 5 : range <= 200 ? 25 : range <= 500 ? 50 : 100;
  for (let q = minQty; q <= maxQty; q += step) opts.add(q);
  opts.add(maxQty);
  return [...opts].filter((q) => q <= maxQty).sort((a, b) => a - b);
}

interface AccessoryCardProps {
  item: AccessoryCatalogItem;
  onAdd: (acc: DraftOrderItemAccessory) => void;
  isAdded?: boolean;
  onRemove?: () => void;
}

export function AccessoryCard({ item, onAdd, isAdded = false, onRemove }: AccessoryCardProps) {
  const [qty, setQty] = useState<number>(0);

  useEffect(() => {
    if (!isAdded) setQty(0);
  }, [isAdded]);

  const qtyOptions = generateQtyOptions(item.minQty, item.maxQty);
  const itemTotal = qty * item.unitPrice;
  const hasQty = qty > 0;

  return (
    <div style={{
      background: "white",
      border: "1px solid var(--cim-border-base, #dadcdd)",
      borderRadius: "8px",
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
      boxShadow: "0px 1px 1px 0px rgba(0,0,0,0.08), 0px 1px 3px 0px rgba(0,0,0,0.04)",
      flex: "1 0 0",
      minWidth: 0,
    }}>
      {/* Card header */}
      <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "4px" }}>
        <span style={{ fontSize: "1rem", fontWeight: 600, color: "var(--cim-fg-base, #15191d)", lineHeight: "24px" }}>
          {item.name}
        </span>
        <span style={{ fontSize: "0.75rem", color: "var(--cim-fg-subtle, #5f6469)", lineHeight: "16px" }}>
          Item ID {item.itemId}
        </span>
      </div>

      {/* Image */}
      <div style={{
        height: "200px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        background: "var(--cim-bg-subtle, #f8f9fa)",
      }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.imageUrl}
          alt={item.name}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </div>

      {/* Divider */}
      <div style={{ height: "1px", background: "var(--cim-border-subtle, #eaebeb)" }} />

      {/* Pricing section */}
      <div style={{
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        borderTop: "1px solid var(--cim-border-base, #dadcdd)",
        background: "white",
      }}>
        {/* Quantity select */}
        <Select
          label="Quantity"
          selectedKey={String(qty)}
          onSelectionChange={(val) => setQty(Number(val))}
          description={`Quantity has to be between ${item.minQty} - ${item.maxQty}`}
        >
          {qtyOptions.map((q) => (
            <SelectItem key={String(q)} id={String(q)}>{q}</SelectItem>
          ))}
        </Select>

        {/* Divider */}
        <div style={{ height: "1px", background: "var(--cim-border-subtle, #eaebeb)" }} />

        {/* Item total row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: "1rem", color: "var(--cim-fg-base, #15191d)", lineHeight: "24px" }}>
            Item Total
          </span>
          <span style={{
            fontSize: "1rem",
            fontWeight: 600,
            color: (isAdded || hasQty) ? "var(--cim-fg-base, #15191d)" : "var(--cim-fg-muted, #94979b)",
            lineHeight: "24px",
          }}>
            USD {itemTotal.toFixed(2)}
          </span>
        </div>

        {/* Add / Remove button */}
        {isAdded ? (
          <button
            onClick={() => onRemove?.()}
            style={{
              width: "100%",
              padding: "8px 16px",
              border: "1px solid var(--cim-fg-critical, #d10023)",
              borderRadius: "4px",
              background: "white",
              color: "var(--cim-fg-critical, #d10023)",
              fontSize: "1rem",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Remove item
          </button>
        ) : (
          <Button
            variant="secondary"
            onPress={() => onAdd({ id: item.id, label: item.name, quantity: qty, unitPrice: item.unitPrice })}
          >
            Add to item
          </Button>
        )}
      </div>
    </div>
  );
}

interface AddAccessoryModalProps {
  onAdd: (acc: DraftOrderItemAccessory) => void;
  onCancel: () => void;
}

export function AddAccessoryModal({ onAdd, onCancel }: AddAccessoryModalProps) {
  return (
    <ModalDialog
      title="Add accessory"
      size="large"
      isOpen
      onOpenChange={(open) => { if (!open) onCancel(); }}
      isDismissible
    >
      <ModalDialogBody>
        <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
          {MOCK_ACCESSORIES.map((acc) => (
            <AccessoryCard
              key={acc.id}
              item={acc}
              onAdd={(added) => { onAdd(added); onCancel(); }}
            />
          ))}
        </div>
      </ModalDialogBody>
      <ModalDialogActions>
        <Button variant="secondary" onPress={onCancel}>Cancel</Button>
      </ModalDialogActions>
    </ModalDialog>
  );
}
