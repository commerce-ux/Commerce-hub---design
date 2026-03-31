"use client";

import { Badge } from "@cimpress-ui/react";

interface AddressInfo {
  name: string;
  addressLines: string[];
  phone: string;
}

interface PricingLine {
  label: string;
  subLabel?: string;
  value: string;
  isSavings?: boolean;
}

interface OrderInfoPanelsProps {
  shipping: AddressInfo & { method: string };
  billing: AddressInfo;
  pricing: {
    status: string;
    lines: PricingLine[];
    total: string;
  };
}

export function OrderInfoPanels({ shipping, billing, pricing }: OrderInfoPanelsProps) {
  return (
    <div className="flex gap-4">
      {/* Shipping Details */}
      <div className="flex-1 bg-[var(--cim-bg-base)] p-6 flex flex-col justify-between gap-6 border border-[var(--cim-border-base)] rounded-[var(--cim-radius-6)]">
        <div className="flex flex-col gap-4">
          <h3 className="text-sm font-semibold text-[color:var(--cim-fg-base)]">
            Shipping Details
          </h3>
          <div className="flex flex-col gap-1 text-sm">
            <p className="text-[color:var(--cim-fg-base)]">{shipping.name}</p>
            {shipping.addressLines.map((line, i) => (
              <p key={i} className="text-[color:var(--cim-fg-subtle)]">{line}</p>
            ))}
            <p className="text-[color:var(--cim-fg-subtle)]">{shipping.phone}</p>
          </div>
        </div>
        <div className="flex items-center justify-between pt-4 border-t border-[var(--cim-border-base)]">
          <span className="text-sm text-[color:var(--cim-fg-subtle)]">Shipping Method</span>
          <span className="text-sm font-medium text-[color:var(--cim-fg-base)]">{shipping.method}</span>
        </div>
      </div>

      {/* Billing Details */}
      <div className="flex-1 bg-[var(--cim-bg-base)] p-6 flex flex-col gap-4 border border-[var(--cim-border-base)] rounded-[var(--cim-radius-6)]">
        <h3 className="text-sm font-semibold text-[color:var(--cim-fg-base)]">
          Billing Details
        </h3>
        <div className="flex flex-col gap-1 text-sm">
          <p className="text-[color:var(--cim-fg-base)]">{billing.name}</p>
          {billing.addressLines.map((line, i) => (
            <p key={i} className="text-[color:var(--cim-fg-subtle)]">{line}</p>
          ))}
          <p className="text-[color:var(--cim-fg-subtle)]">{billing.phone}</p>
        </div>
      </div>

      {/* Pricing */}
      <div className="flex-1 min-w-0 bg-[var(--cim-bg-base)] p-6 flex flex-col justify-between gap-4 border border-[var(--cim-border-base)] rounded-[var(--cim-radius-6)]">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[color:var(--cim-fg-base)]">Pricing</h3>
            <Badge tone="success" size="medium">{pricing.status}</Badge>
          </div>
          <div className="flex flex-col gap-3">
            {pricing.lines.map((line, i) => (
              <div key={i} className="flex flex-col gap-0.5">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-[color:var(--cim-fg-subtle)] whitespace-nowrap">{line.label}</span>
                  <span
                    className={`text-sm tabular-nums shrink-0 ${
                      line.isSavings
                        ? "text-[color:var(--cim-fg-success)]"
                        : "text-[color:var(--cim-fg-base)]"
                    }`}
                  >
                    {line.value}
                  </span>
                </div>
                {line.subLabel && (
                  <span className="text-xs text-[color:var(--cim-fg-success)]">
                    ({line.subLabel})
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between pt-4 border-t border-[var(--cim-border-base)]">
          <span className="text-sm font-semibold text-[color:var(--cim-fg-base)]">Total</span>
          <span className="text-2xl font-bold text-[color:var(--cim-fg-base)]">
            {pricing.total}
          </span>
        </div>
      </div>
    </div>
  );
}
