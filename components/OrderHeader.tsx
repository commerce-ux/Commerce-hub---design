"use client";

import { useState, useCallback, useRef } from "react";
import { Button, CopyInline, Tooltip } from "@cimpress-ui/react";
import { IconMenuMoreVertical } from "@cimpress-ui/react/icons";
import { CancelOrderModal } from "./CancelOrderModal";
import { Toast, ToastVariant } from "./Toast";

interface OrderHeaderProps {
  orderId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  allItemsDelivered?: boolean;
  isCancelled: boolean;
  onCancelled: () => void;
}

/** Simulates an async cancellation API call. Returns true on success. */
async function simulateCancelApi(): Promise<boolean> {
  await new Promise((r) => setTimeout(r, 600));
  // 80% success rate for demo purposes
  return Math.random() < 0.8;
}

export function OrderHeader({
  orderId,
  customerName,
  customerEmail,
  customerPhone,
  allItemsDelivered = false,
  isCancelled,
  onCancelled,
}: OrderHeaderProps) {
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [toast, setToast] = useState<ToastVariant | null>(null);
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const cancelSpanRef = useRef<HTMLSpanElement>(null);

  const dismissToast = useCallback(() => setToast(null), []);

  const handleConfirm = async () => {
    setShowCancelModal(false);
    const success = await simulateCancelApi();
    if (success) {
      onCancelled();
      setToast("success");
    } else {
      setToast("failure");
    }
  };

  const cancelDisabled = allItemsDelivered || isCancelled;

  return (
    <>
      <div className="flex items-start justify-between w-full">
        <div className="flex flex-col gap-1">
          <h1>
            <CopyInline variant="title-3">{orderId}</CopyInline>
          </h1>
          <div className="flex items-center gap-4 text-sm text-[color:var(--cim-fg-subtle)]">
            <span>{customerName}</span>
            <span>{customerEmail}</span>
            <span>{customerPhone}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Tooltip
            label="This order cannot be cancelled because of the status of all line items. Please recreate the order or contact support."
            isDisabled={!cancelDisabled}
            isOpen={cancelDisabled && tooltipOpen}
            onOpenChange={setTooltipOpen}
            placement="bottom"
            triggerRef={cancelSpanRef}
          >
            <span
              ref={cancelSpanRef}
              className="inline-block"
              tabIndex={cancelDisabled ? 0 : -1}
              style={cancelDisabled ? { cursor: "not-allowed" } : undefined}
              onMouseEnter={() => { if (cancelDisabled) setTooltipOpen(true); }}
              onMouseLeave={() => setTooltipOpen(false)}
              onFocus={() => { if (cancelDisabled) setTooltipOpen(true); }}
              onBlur={() => setTooltipOpen(false)}
            >
              <Button
                variant="secondary"
                tone="critical"
                isDisabled={cancelDisabled}
                onPress={() => setShowCancelModal(true)}
                UNSAFE_style={cancelDisabled ? { pointerEvents: "none" } : undefined}
              >
                Cancel
              </Button>
            </span>
          </Tooltip>
          <button
            aria-label="More options"
            className="flex items-center justify-center w-9 h-9 rounded border border-[var(--cim-border-base)] text-[color:var(--cim-fg-subtle)] hover:bg-[var(--cim-bg-hover)] transition-colors"
          >
            <IconMenuMoreVertical />
          </button>
        </div>
      </div>

      {showCancelModal && (
        <CancelOrderModal
          orderId={orderId}
          onClose={() => setShowCancelModal(false)}
          onConfirm={handleConfirm}
        />
      )}

      {toast && (
        <Toast
          variant={toast}
          orderId={orderId}
          onDismiss={dismissToast}
        />
      )}
    </>
  );
}
