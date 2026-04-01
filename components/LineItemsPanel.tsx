"use client";

import { useState } from "react";
import { Badge, Button, Checkbox, SearchField } from "@cimpress-ui/react";
import {
  IconMenuMoreVertical,
  IconInfoCircle,
  IconWarning,
  IconCheckCircle,
  IconChevronRightBold,
} from "@cimpress-ui/react/icons";

// ─── Types ────────────────────────────────────────────────────────────────────

type ShipmentType = "none" | "warning" | "info" | "success";

interface ShipmentInfo {
  type: ShipmentType;
  title: string;
  subtitle: string;
  showViewDetails?: boolean;
}

interface LineItem {
  id: string;
  name: string;
  badgeTone: "base" | "critical" | "info" | "success";
  badgeLabel: string;
  imageUrl: string;
  quantity: number;
  fulfiller: string;
  dateLabel: string;
  dateValue: string;
  tax: string;
  itemTotal: string;
  originalTotal?: string;
  shipment: ShipmentInfo;
  recare?: string;
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const LINE_ITEMS: LineItem[] = [
  {
    id: "1",
    name: "Zoom® Grid 15 TSA-Friendly Computer Backpack",
    badgeTone: "base",
    badgeLabel: "Initial",
    imageUrl: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=300&fit=crop",
    quantity: 5,
    fulfiller: "In house",
    dateLabel: "Expected date",
    dateValue: "NA",
    tax: "inc tax 1.00 USD",
    itemTotal: "10.00 USD",
    shipment: {
      type: "none",
      title: "No shipment info",
      subtitle: "Item is not in production yet",
    },
    recare: "Total Replacement 2 time",
  },
  {
    id: "2",
    name: "Personalized Note Cards",
    badgeTone: "critical",
    badgeLabel: "Delayed",
    imageUrl: "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=400&h=300&fit=crop",
    quantity: 4,
    fulfiller: "In house",
    dateLabel: "Expected date",
    dateValue: "Sat, 15 Nov 2025",
    tax: "inc tax 1.00 USD",
    itemTotal: "10.00 USD",
    shipment: {
      type: "warning",
      title: "2/2 shipments in progress",
      subtitle: "Delay in 1/2 shipments",
      showViewDetails: true,
    },
  },
  {
    id: "3",
    name: "Glossy Ceramic Campfire Mug – Set of 36",
    badgeTone: "info",
    badgeLabel: "Shipped",
    imageUrl: "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=400&h=300&fit=crop",
    quantity: 2,
    fulfiller: "In house",
    dateLabel: "Expected date",
    dateValue: "Wed, 6 Dec 2025",
    tax: "inc tax 2.00 USD",
    itemTotal: "50.00 USD",
    shipment: {
      type: "info",
      title: "2/2 shipments in progress",
      subtitle: "Expected delivery: Wed, 6 Dec 2025",
      showViewDetails: true,
    },
  },
  {
    id: "4",
    name: "VistaPrint® Large Zip Cotton Tote Bag",
    badgeTone: "success",
    badgeLabel: "Delivered",
    imageUrl: "https://images.unsplash.com/photo-1622560480605-d83c853bc5c3?w=400&h=300&fit=crop",
    quantity: 1,
    fulfiller: "In house",
    dateLabel: "Delivered on",
    dateValue: "Fri, 11 Nov 2025",
    tax: "inc tax 1.00 USD",
    itemTotal: "20.00 USD",
    originalTotal: "25.00 USD",
    shipment: {
      type: "success",
      title: "1/1 shipments delivered",
      subtitle: "Delivered on: Fri, 11 Nov 2025",
      showViewDetails: true,
    },
  },
];

// ─── Shipment banner ──────────────────────────────────────────────────────────

const SHIPMENT_CONFIG: Record<ShipmentType, { bg: string; iconColor: string }> = {
  none:    { bg: "bg-[#f8f9fa]",  iconColor: "text-[color:var(--cim-fg-subtle)]" },
  warning: { bg: "bg-[#fef2f2]",  iconColor: "text-[color:var(--cim-fg-critical)]" },
  info:    { bg: "bg-[#eff8fb]",  iconColor: "text-[color:var(--cim-fg-info)]" },
  success: { bg: "bg-[#f0faf4]",  iconColor: "text-[color:var(--cim-fg-success)]" },
};

function ShipmentIcon({ type, className }: { type: ShipmentType; className: string }) {
  if (type === "warning") return <span className={className}><IconWarning /></span>;
  if (type === "success") return <span className={className}><IconCheckCircle /></span>;
  return <span className={className}><IconInfoCircle /></span>;
}

function ShipmentBanner({ shipment }: { shipment: ShipmentInfo }) {
  const { bg, iconColor } = SHIPMENT_CONFIG[shipment.type];
  return (
    <div className={`${bg} flex gap-4 h-[115px] items-center overflow-clip p-2 rounded-lg shrink-0 w-full`}>
      <div className="flex-1 min-w-0">
        <div className="flex gap-3 items-start p-1">
          <ShipmentIcon type={shipment.type} className={`shrink-0 mt-0.5 ${iconColor}`} />
          <div className="flex flex-col gap-1 flex-1 min-w-0">
            <p className="font-semibold text-base leading-6 text-[color:var(--cim-fg-base)]">
              {shipment.title}
            </p>
            <p className="text-sm leading-5 text-[color:var(--cim-fg-base)]">
              {shipment.subtitle}
            </p>
            {shipment.showViewDetails && (
              <button className="flex items-center gap-0.5 text-sm text-[color:var(--cim-fg-accent)] hover:underline w-fit mt-0.5">
                View Details <IconChevronRightBold />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Line item card ───────────────────────────────────────────────────────────

function LineItemCard({
  item,
  isSelected,
  onSelect,
  isCancelled,
}: {
  item: LineItem;
  isSelected: boolean;
  onSelect: (checked: boolean) => void;
  isCancelled: boolean;
}) {
  return (
    <div
      className="bg-white border border-[#dadcdd] flex flex-col items-start overflow-clip rounded-lg shrink-0 w-[325px]"
      style={{ boxShadow: "0px 1px 1px 0px rgba(0,0,0,0.08), 0px 1px 3px 0px rgba(0,0,0,0.04)" }}
    >
      {/* Card header: checkbox + name/badge + kebab */}
      <div className="flex gap-3 items-start overflow-clip p-4 w-full min-h-[116px]">
        <div className="flex gap-2 items-center shrink-0 pt-1">
          <Checkbox isSelected={isSelected} onChange={onSelect} aria-label={`Select ${item.name}`} />
        </div>
        <div className="flex flex-1 flex-col gap-2 items-start min-w-0 self-stretch">
          <p className="font-semibold leading-6 text-base text-[color:var(--cim-fg-base)] w-full h-12 line-clamp-2 overflow-hidden">
            {item.name}
          </p>
          {isCancelled && item.badgeLabel !== "Delivered" ? (
            <Badge size="large" tone="warning">Cancellation requested</Badge>
          ) : (
            <Badge size="large" tone={item.badgeTone}>{item.badgeLabel}</Badge>
          )}
        </div>
        <button className="text-[color:var(--cim-fg-subtle)] hover:text-[color:var(--cim-fg-base)] shrink-0 pt-0.5" type="button">
          <IconMenuMoreVertical />
        </button>
      </div>

      {/* Product image */}
      <div className="h-[200px] w-full overflow-clip shrink-0">
        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
      </div>

      {/* Divider */}
      <div className="h-px w-full bg-[#dadcdd] shrink-0" />

      {/* Details + pricing + footer */}
      <div className="flex flex-1 flex-col items-start justify-between p-4 w-full gap-4">
        <div className="flex flex-col gap-4 items-start w-full">

          {/* Detail rows */}
          <div className="flex flex-col gap-3 items-start w-full">
            <div className="flex items-center justify-between w-full">
              <span className="text-base text-[color:var(--cim-fg-base)] leading-6">Total item quantity</span>
              <span className="text-base text-[color:var(--cim-fg-base)] leading-6">{item.quantity}</span>
            </div>
            <div className="flex items-center justify-between w-full">
              <span className="text-base text-[color:var(--cim-fg-base)] leading-6">Fulfiller</span>
              <span className="text-base text-[color:var(--cim-fg-base)] leading-6">{item.fulfiller}</span>
            </div>
            <div className="flex items-center justify-between w-full">
              <span className="text-base text-[color:var(--cim-fg-base)] leading-6">{item.dateLabel}</span>
              <span className="text-base text-[color:var(--cim-fg-base)] leading-6">{item.dateValue}</span>
            </div>
          </div>

          {/* Item Total */}
          <div className="flex flex-col gap-2 items-start w-full">
            <div className="h-px w-full bg-[#dadcdd]" />
            <div className="flex items-end justify-between w-full">
              <span className="text-base text-[color:var(--cim-fg-base)] leading-6">Item Total</span>
              <div className="flex flex-col gap-1 items-end">
                <span className="text-xs text-[color:var(--cim-fg-base)] leading-4">{item.tax}</span>
                <div className="flex gap-2 items-center">
                  {item.originalTotal && (
                    <span className="text-base text-[color:var(--cim-fg-subtle)] line-through leading-6">
                      {item.originalTotal}
                    </span>
                  )}
                  <span className="font-semibold text-base text-[color:var(--cim-fg-base)] leading-6">
                    {item.itemTotal}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Shipment banner */}
          <ShipmentBanner shipment={item.shipment} />

          {/* Re-Care Actions */}
          {item.recare && (
            <div className="flex flex-col gap-2 items-start w-full">
              <span className="text-base text-[color:var(--cim-fg-base)] leading-6">Re-Care Actions</span>
              <button className="text-base text-[color:var(--cim-fg-accent)] underline decoration-[1.5px] leading-6 hover:opacity-80">
                {item.recare}
              </button>
            </div>
          )}
        </div>

        {/* Attributes and IDs footer */}
        <div className="flex flex-col gap-4 items-start w-full">
          <div className="h-px w-full bg-[#dadcdd]" />
          <div className="flex items-center justify-between w-full">
            <span className="text-base text-[color:var(--cim-fg-base)] leading-6">Attributes and IDs</span>
            <span className="text-[color:var(--cim-fg-subtle)]"><IconChevronRightBold /></span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Exported so OrderHeader can check delivery status
export const allLineItemsDelivered = LINE_ITEMS.every((i) => i.badgeLabel === "Delivered");
export const hasDelayedItems = LINE_ITEMS.some((i) => i.badgeLabel === "Delayed");

// ─── Main panel ───────────────────────────────────────────────────────────────

export function LineItemsPanel({ isCancelled = false }: { isCancelled?: boolean }) {
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filteredItems = LINE_ITEMS.filter(
    (item) =>
      !search ||
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.id.includes(search)
  );

  const allSelected = filteredItems.length > 0 && filteredItems.every((i) => selectedIds.has(i.id));
  const someSelected = filteredItems.some((i) => selectedIds.has(i.id)) && !allSelected;
  const selectedCount = LINE_ITEMS.filter((i) => selectedIds.has(i.id)).length;
  const hasSelection = selectedCount > 0;
  const cancelDisabled = !hasSelection || LINE_ITEMS.filter((i) => selectedIds.has(i.id)).every((i) => i.badgeLabel === "Delivered");

  function handleSelectAll(checked: boolean) {
    setSelectedIds(checked ? new Set(filteredItems.map((i) => i.id)) : new Set());
  }

  function handleSelectItem(id: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-4 pt-6">
      {/* Summary */}
      <div className="flex flex-col gap-1">
        <p className="font-semibold text-base leading-6 text-[color:var(--cim-fg-base)]">
          4/4 total items showing
        </p>
        <p className="text-base leading-6 text-[color:var(--cim-fg-base)]">
          Estimated delivery date is Fri, 11 Nov 2025 - Tue, 16 Dec 2025
        </p>
      </div>

      {/* Search */}
      <SearchField
        aria-label="Search line items"
        placeholder="Search by item ID, item name, Tracking ID"
        value={search}
        onChange={setSearch}
      />

      {/* Selection toolbar */}
      <div className="bg-[#f8f9fa] flex h-12 items-center justify-between overflow-clip px-4 py-2 rounded-[var(--cim-radius-6)] w-full">
        <Checkbox
          isSelected={allSelected}
          isIndeterminate={someSelected}
          onChange={handleSelectAll}
        >
          {selectedCount} out of {LINE_ITEMS.length} items selected
        </Checkbox>
        <div className="flex gap-4 items-center">
          <Button variant="tertiary" size="small" isDisabled={!hasSelection}>Refund</Button>
          <Button variant="tertiary" size="small" isDisabled={!hasSelection}>Credit</Button>
          <Button variant="tertiary" size="small" isDisabled={!hasSelection}>Replace</Button>
          <Button variant="tertiary" size="small" isDisabled={!hasSelection}>Add to Cart</Button>
          <Button tone="critical" variant="tertiary" size="small" isDisabled={cancelDisabled}>Cancel</Button>
        </div>
      </div>

      {/* Cards grid */}
      <div className="flex flex-wrap gap-4">
        {filteredItems.map((item) => (
          <LineItemCard
            key={item.id}
            item={item}
            isSelected={selectedIds.has(item.id)}
            onSelect={(checked) => handleSelectItem(item.id, checked)}
            isCancelled={isCancelled}
          />
        ))}
      </div>
    </div>
  );
}
