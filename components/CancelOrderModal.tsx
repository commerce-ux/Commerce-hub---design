"use client";

import { useState } from "react";
import { Button, Alert } from "@cimpress-ui/react";
import { IconCloseBold, IconTrash } from "@cimpress-ui/react/icons";
import { LINE_ITEMS } from "@/lib/mockData";

// Price and quantity data per lineItemId (from LineItemsPanel mock data)
const ITEM_DETAILS: Record<string, { quantity: number; price: string; imageUrl: string }> = {
  "154811849422": { quantity: 5, price: "10.00 USD", imageUrl: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=300&fit=crop" },
  "154811849423": { quantity: 4, price: "10.00 USD", imageUrl: "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=400&h=300&fit=crop" },
  "154811849424": { quantity: 2, price: "50.00 USD", imageUrl: "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=400&h=300&fit=crop" },
};

const CANCEL_REASONS = [
  "Customer requested cancellation",
  "Duplicate order",
  "Item out of stock",
  "Incorrect item ordered",
  "Shipping address issue",
  "Payment issue",
  "Other",
];

// Items eligible for cancellation: anything not Delivered and not already Cancelled
const ELIGIBLE_ITEMS = LINE_ITEMS.filter(
  (i) => i.badgeLabel !== "Delivered" && i.status !== "cancel_succeeded"
);
const INELIGIBLE_ITEMS = LINE_ITEMS.filter(
  (i) => i.badgeLabel === "Delivered" || i.status === "cancel_succeeded"
);

// Parse numeric value from e.g. "10.00 USD" or "USD 10.00"
function parseValue(val: string): number {
  const match = val.replace(/,/g, "").match(/[\d.]+/);
  return match ? parseFloat(match[0]) : 0;
}

const ELIGIBLE_TOTAL = ELIGIBLE_ITEMS.reduce(
  (sum, i) => sum + parseValue(ITEM_DETAILS[i.lineItemId]?.price ?? "0"),
  0
);

interface CancelOrderModalProps {
  orderId: string;
  onClose: () => void;
  onConfirm: () => void;
}

export function CancelOrderModal({ orderId, onClose, onConfirm }: CancelOrderModalProps) {
  const [concession, setConcession] = useState<"yes" | "no" | null>(null);
  const [reason, setReason] = useState("");
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());

  const visibleEligible = ELIGIBLE_ITEMS.filter((i) => !removedIds.has(i.id));
  const someRemoved = removedIds.size > 0;
  const canSubmit = concession !== null && reason !== "" && visibleEligible.length > 0;

  function removeItem(id: string) {
    setRemovedIds((prev) => new Set([...prev, id]));
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-white rounded-[var(--cim-radius-8)] w-full max-w-[864px] flex flex-col overflow-hidden max-h-[90vh]"
        style={{
          boxShadow:
            "0px 2px 8px rgba(0,0,0,0.12), 0px 8px 16px rgba(0,0,0,0.11), 0px 16px 24px rgba(0,0,0,0.10), 0px 16px 32px rgba(0,0,0,0.09), 0px 24px 48px rgba(0,0,0,0.08)",
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancel-modal-title"
      >
        {/* Header */}
        <div className="flex items-center gap-4 justify-between px-6 pt-6 pb-4 border-b border-[var(--cim-border-subtle)] shrink-0">
          <div className="flex flex-col gap-1">
            <p id="cancel-modal-title" className="text-lg font-semibold text-[color:var(--cim-fg-base)] leading-6">
              Cancel selected items
            </p>
            <p className="text-sm text-[color:var(--cim-fg-subtle)] leading-5">
              {orderId} | {ELIGIBLE_ITEMS.length} out of {LINE_ITEMS.length} items eligible for cancellation
            </p>
          </div>
          <button
            aria-label="Close"
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-[var(--cim-radius-4)] text-[color:var(--cim-fg-base)] hover:bg-[var(--cim-bg-hover)] transition-colors"
          >
            <IconCloseBold />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex flex-col gap-6 p-6 overflow-y-auto flex-1">

          {/* Warning text */}
          <p className="text-sm text-[color:var(--cim-fg-warning)] leading-5">
            Cancelling items does not automatically issue a refund or credit.
          </p>

          {/* Partial cancellation alert */}
          {someRemoved && (
            <Alert tone="warning">
              Removing items means this will not cancel the entire order — only the remaining selected items will be cancelled.
            </Alert>
          )}

          {/* Eligible items */}
          <div className="flex flex-col gap-3">
            <p className="text-base font-semibold text-[color:var(--cim-fg-base)] leading-6">
              {visibleEligible.length} items eligible for cancellation
            </p>
            <div className="border border-[var(--cim-border-base)] rounded-[var(--cim-radius-6)] overflow-hidden">
              {visibleEligible.map((item, idx) => (
                <div
                  key={item.id}
                  className={`flex flex-col gap-3 p-4 ${idx < visibleEligible.length - 1 ? "border-b border-[var(--cim-border-base)]" : ""}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-[color:var(--cim-fg-base)] leading-5">{item.name}</span>
                        <span className="text-xs text-[color:var(--cim-fg-subtle)] bg-[var(--cim-bg-subtle)] px-2 py-0.5 rounded">{item.badgeLabel}</span>
                      </div>
                      <span className="text-xs text-[color:var(--cim-fg-subtle)] leading-4">Item id  {item.lineItemId}</span>
                    </div>
                    <button
                      aria-label={`Remove ${item.name} from cancellation`}
                      onClick={() => removeItem(item.id)}
                      className="text-[color:var(--cim-fg-subtle)] hover:text-[color:var(--cim-fg-critical)] shrink-0 mt-0.5"
                    >
                      <IconTrash />
                    </button>
                  </div>
                  <div className="flex gap-4 items-start">
                    <img src={ITEM_DETAILS[item.lineItemId]?.imageUrl ?? item.imageUrl ?? ""} alt={item.name} className="w-16 h-16 object-cover rounded shrink-0" />
                    <div className="flex gap-8 text-sm text-[color:var(--cim-fg-base)] leading-5">
                      <span>Original Quantity: {ITEM_DETAILS[item.lineItemId]?.quantity ?? 1}</span>
                      <span>Item Price: USD {parseValue(ITEM_DETAILS[item.lineItemId]?.price ?? "0").toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Ineligible items */}
          {INELIGIBLE_ITEMS.length > 0 && (
            <div className="flex flex-col gap-3">
              <p className="text-base font-semibold text-[color:var(--cim-fg-base)] leading-6">
                {INELIGIBLE_ITEMS.length} items ineligible for cancellation
              </p>
              <div className="border border-[var(--cim-border-base)] rounded-[var(--cim-radius-6)] overflow-hidden">
                {INELIGIBLE_ITEMS.map((item, idx) => (
                  <div
                    key={item.id}
                    className={`flex flex-col gap-3 p-4 ${idx < INELIGIBLE_ITEMS.length - 1 ? "border-b border-[var(--cim-border-base)]" : ""}`}
                  >
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-[color:var(--cim-fg-base)] leading-5">{item.name}</span>
                        <span className="text-xs text-[color:var(--cim-fg-subtle)] bg-[var(--cim-bg-subtle)] px-2 py-0.5 rounded">{item.badgeLabel}</span>
                      </div>
                      <span className="text-xs text-[color:var(--cim-fg-subtle)] leading-4">Item id  {item.lineItemId}</span>
                    </div>
                    <div className="flex gap-4 items-start">
                      <img src={ITEM_DETAILS[item.lineItemId]?.imageUrl ?? item.imageUrl ?? ""} alt={item.name} className="w-16 h-16 object-cover rounded shrink-0" />
                      <div className="flex gap-8 text-sm text-[color:var(--cim-fg-base)] leading-5">
                        <span>Original Quantity: {ITEM_DETAILS[item.lineItemId]?.quantity ?? 1}</span>
                        <span>Item Price: USD {parseValue(ITEM_DETAILS[item.lineItemId]?.price ?? "0").toFixed(2)}</span>
                      </div>
                    </div>
                    <Alert tone="warning">
                      {item.status === "cancel_succeeded"
                        ? "This item cannot be cancelled because it has already been cancelled"
                        : "This item cannot be cancelled because it has already been delivered"}
                    </Alert>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Form */}
          <div className="flex flex-col gap-4">
            {/* Concession radio */}
            <div className="flex items-center gap-10">
              <p className="text-base text-[color:var(--cim-fg-base)] leading-6 whitespace-nowrap">
                Is this a concession?{" "}
                <span className="text-[color:var(--cim-fg-critical)]">*</span>
              </p>
              <div className="flex items-center gap-4">
                {(["yes", "no"] as const).map((val) => (
                  <label
                    key={val}
                    className="flex items-center gap-2 cursor-pointer text-base text-[color:var(--cim-fg-base)] leading-6 select-none"
                  >
                    <span
                      className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                        concession === val
                          ? "border-[var(--cim-fg-accent)] border-[5px]"
                          : "border-[var(--cim-fg-base)] bg-white"
                      }`}
                    />
                    <input
                      type="radio"
                      name="concession"
                      value={val}
                      checked={concession === val}
                      onChange={() => setConcession(val)}
                      className="sr-only"
                    />
                    {val === "yes" ? "Yes" : "No"}
                  </label>
                ))}
              </div>
            </div>

            {/* Reason select */}
            <div className="flex flex-col gap-1">
              <label className="flex items-center gap-1 text-sm text-[color:var(--cim-fg-base)] leading-4">
                Select a reason for cancellation
                <span className="text-[color:var(--cim-fg-critical)]">*</span>
              </label>
              <div className="relative">
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full appearance-none bg-white border border-[var(--cim-border-base)] rounded-[var(--cim-radius-4)] px-3 py-2.5 text-base leading-6 text-[color:var(--cim-fg-base)] focus:outline-none focus:border-[var(--cim-fg-accent)] pr-10"
                >
                  <option value="" disabled>Select reason here</option>
                  {CANCEL_REASONS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
                <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[color:var(--cim-fg-subtle)]">
                  <svg width="16" height="16" viewBox="0 0 32 32" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 10.293a1 1 0 0 1 1.414 0L16 19.586l9.293-9.293a1 1 0 1 1 1.414 1.414l-10 10a1 1 0 0 1-1.414 0l-10-10a1 1 0 0 1 0-1.414z" />
                  </svg>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[var(--cim-border-subtle)] shrink-0">
          <p className="text-base font-semibold text-[color:var(--cim-fg-base)] leading-6">
            Total Cancellation Value{" "}
            <span className="ml-4">USD {ELIGIBLE_TOTAL.toFixed(2)}</span>
          </p>
          <div className="flex items-center gap-4">
            <Button variant="secondary" onPress={onClose}>Go back</Button>
            <Button
              variant="primary"
              tone="critical"
              isDisabled={!canSubmit}
              onPress={() => { if (canSubmit) onConfirm(); }}
            >
              Cancel item
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
