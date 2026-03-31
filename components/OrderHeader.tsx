"use client";

import { Button } from "@cimpress-ui/react";
import { IconMenuMoreVertical } from "@cimpress-ui/react/icons";

interface OrderHeaderProps {
  orderId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
}

export function OrderHeader({
  orderId,
  customerName,
  customerEmail,
  customerPhone,
}: OrderHeaderProps) {
  return (
    <div className="flex items-start justify-between w-full">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold text-[color:var(--cim-fg-base)] leading-8">
            {orderId}
          </h1>
          <button
            aria-label="Copy order ID"
            className="text-[color:var(--cim-fg-subtle)] hover:text-[color:var(--cim-fg-base)] transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          </button>
        </div>
        <div className="flex items-center gap-4 text-sm text-[color:var(--cim-fg-subtle)]">
          <span>{customerName}</span>
          <span>{customerEmail}</span>
          <span>{customerPhone}</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="secondary" tone="critical">
          Cancel
        </Button>
        <button
          aria-label="More options"
          className="flex items-center justify-center w-9 h-9 rounded border border-[var(--cim-border-base)] text-[color:var(--cim-fg-subtle)] hover:bg-[var(--cim-bg-hover)] transition-colors"
        >
          <IconMenuMoreVertical />
        </button>
      </div>
    </div>
  );
}
