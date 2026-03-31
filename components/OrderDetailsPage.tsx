"use client";

import { useState } from "react";
import { CommerceHubHeader } from "./CommerceHubHeader";
import { OrderHeader } from "./OrderHeader";
import { OrderStepper } from "./OrderStepper";
import { OrderInfoPanels } from "./OrderInfoPanels";
import { OrderDetailsTabs } from "./OrderDetailsTabs";
import { allLineItemsDelivered } from "./LineItemsPanel";
import { Breadcrumbs, BreadcrumbItem } from "@cimpress-ui/react";

const BASE_ORDER_STEPS = [
  {
    label: "Order created",
    description: "on Mon 21 Oct 2025 (GMT+0530 India Standard Time)",
    status: "complete" as const,
  },
  {
    label: "Production in progress",
    description: "for 1 items",
    status: "complete" as const,
  },
  {
    label: "Shipment started",
    description: "for 2 items",
    status: "error" as const,
  },
  {
    label: "Order delivered",
    description: "",
    status: "incomplete" as const,
  },
];

const CANCELLATION_STEP = {
  label: "Order cancellation in progress",
  description: "",
  status: "in-progress" as const,
};

const SHIPPING_INFO = {
  name: "Tanishq Bhatia",
  addressLines: [
    "70 Washington Square,",
    "South, New York, NY",
    "10012, United States",
  ],
  phone: "+9 12123012033",
  method: "Economy",
};

const BILLING_INFO = {
  name: "Tanishq Bhatia",
  addressLines: [
    "70 Washington Square,",
    "South, New York, NY",
    "10012, United States",
  ],
  phone: "+9 12123012033",
};

const PRICING_INFO = {
  status: "Paid",
  lines: [
    { label: "Price (4 items)", value: "USD 90.00" },
    { label: "Shipping fee (Standard)", value: "USD 10.00" },
    { label: "Taxes", value: "USD 5.00" },
    { label: "Savings", subLabel: "Coupon: SAVEBIG", value: "- USD 5.00", isSavings: true },
  ],
  total: "USD 100.00",
};

interface OrderDetailsPageProps {
  orderId: string;
}

export function OrderDetailsPage({ orderId }: OrderDetailsPageProps) {
  const [isCancelled, setIsCancelled] = useState(false);

  const steps = isCancelled
    ? [...BASE_ORDER_STEPS, CANCELLATION_STEP]
    : BASE_ORDER_STEPS;

  return (
    <div className="flex flex-col min-h-screen">
      <CommerceHubHeader />
      <main className="flex-1 px-6 py-6 max-w-[1440px] mx-auto w-full">
        <div className="flex flex-col gap-6">
          <Breadcrumbs aria-label="Order navigation">
            <BreadcrumbItem href="/orders">Order</BreadcrumbItem>
            <BreadcrumbItem href={`/orders/${orderId}`}>{orderId}</BreadcrumbItem>
          </Breadcrumbs>

          <OrderHeader
            orderId={orderId}
            customerName="Tanishq Bhatia"
            customerEmail="tanishq.bhatia@cimpress.com"
            customerPhone="+9 12123012033"
            allItemsDelivered={allLineItemsDelivered}
            isCancelled={isCancelled}
            onCancelled={() => setIsCancelled(true)}
          />

          <OrderStepper steps={steps} />

          <OrderInfoPanels
            shipping={SHIPPING_INFO}
            billing={BILLING_INFO}
            pricing={PRICING_INFO}
          />

          <OrderDetailsTabs defaultTab="events" />
        </div>
      </main>
    </div>
  );
}
