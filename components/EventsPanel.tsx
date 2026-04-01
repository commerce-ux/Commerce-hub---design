"use client";

import { useState } from "react";
import { UNSTABLE_Toggle, Text } from "@cimpress-ui/react";
import { IconSearch } from "@cimpress-ui/react/icons";
import { LineItemCard } from "./LineItemCard";
import { LINE_ITEMS, MOCK_ORDER } from "@/lib/mockData";
import type { OrderEvent } from "@/lib/types";

const CANCELLATION_REQUESTED_EVENT: OrderEvent = {
  id: "cancellation-requested",
  eventType: "line_item.cancellation_requested",
  name: "Cancellation requested",
  timestamp: new Date().toUTCString().replace("GMT", "GMT+0530 (India Standard Time)"),
  isoTimestamp: new Date().toISOString(),
  iconStatus: "error",
  category: "key_event",
  details: {
    subType: "CancellationRequested",
    description:
      "A cancellation request has been submitted for this line item. The request is being processed by the fulfilment platform.",
    source: "Commerce Hub – Customer Service Portal",
  },
};

export function EventsPanel({ isCancelled = false }: { isCancelled?: boolean }) {
  const [search, setSearch] = useState("");
  const [expandAll, setExpandAll] = useState(false);
  const [warningsOnly, setWarningsOnly] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    new Set(["item-1"]) // first item expanded by default
  );

  function handleExpandAllToggle(next: boolean) {
    setExpandAll(next);
    if (next) {
      setExpandedIds(new Set(LINE_ITEMS.map((i) => i.id)));
    } else {
      setExpandedIds(new Set(["item-1"]));
    }
  }

  function toggleItem(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const filteredItems = LINE_ITEMS.filter((item) => {
    if (
      search &&
      !item.name.toLowerCase().includes(search.toLowerCase()) &&
      !item.lineItemId.includes(search)
    )
      return false;
    return true;
  });

  const warningItemCount = LINE_ITEMS.filter((i) =>
    i.events.some((e) => e.category === "warning")
  ).length;

  return (
    <div className="flex flex-col gap-4">
      {/* Summary */}
      <div className="flex flex-col gap-1">
        <Text variant="title-6" as="p">
          {LINE_ITEMS.length}/{LINE_ITEMS.length} total items showing
          {warningItemCount > 0 && (
            <span className="ml-2 font-normal text-[color:var(--cim-fg-critical)]">
              · {warningItemCount} item{warningItemCount > 1 ? "s" : ""} need attention
            </span>
          )}
        </Text>
        <Text variant="body" as="p" tone="subtle">
          Estimated delivery {MOCK_ORDER.estimatedDelivery}
        </Text>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative flex items-center">
          <span className="absolute left-3 text-[color:var(--cim-fg-subtle)] pointer-events-none">
            <IconSearch />
          </span>
          <input
            type="text"
            placeholder="Search by item ID, item name, tracking ID"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-[var(--cim-border-base)] rounded-[var(--cim-radius-6)] text-sm text-[color:var(--cim-fg-base)] placeholder:text-[color:var(--cim-fg-subtle)] focus:outline-none focus:border-[var(--cim-fg-accent)] bg-white"
          />
        </div>
        <div className="flex items-center gap-4">
          <UNSTABLE_Toggle isSelected={expandAll} onChange={handleExpandAllToggle}>
            Expand all
          </UNSTABLE_Toggle>
          <UNSTABLE_Toggle isSelected={warningsOnly} onChange={setWarningsOnly}>
            View only warnings
          </UNSTABLE_Toggle>
        </div>
      </div>

      {/* Line item cards */}
      <div className="border border-[var(--cim-border-base)] rounded-[var(--cim-radius-6)] bg-[var(--cim-bg-base)] overflow-hidden">
        {filteredItems.length === 0 ? (
          <div className="p-6 text-center text-sm text-[color:var(--cim-fg-subtle)]">
            No items match your search.
          </div>
        ) : (
          filteredItems.map((item) => {
            const needsCancellation = isCancelled && item.status !== "cancel_succeeded";
            const displayBadgeLabel = needsCancellation ? "Cancellation requested" : item.badgeLabel;
            const displayBadgeTone = needsCancellation ? "warning" : item.badgeTone;
            const displayEvents = needsCancellation
              ? [CANCELLATION_REQUESTED_EVENT, ...item.events]
              : item.events;
            return (
              <LineItemCard
                key={item.id}
                id={item.id}
                name={item.name}
                badgeLabel={displayBadgeLabel}
                badgeTone={displayBadgeTone}
                imageUrl={item.imageUrl}
                itemId={item.lineItemId}
                warningCount={displayEvents.filter((e) => e.category === "warning").length}
                keyEventCount={displayEvents.filter((e) => e.category === "key_event").length}
                summaryText={needsCancellation ? "Cancellation requested" : item.summaryText}
                summaryTimestamp={needsCancellation ? CANCELLATION_REQUESTED_EVENT.timestamp : item.summaryTimestamp}
                progressSteps={[...item.progressSteps] as ("complete" | "error" | "pending")[]}
                events={displayEvents}
                warningsOnly={warningsOnly}
                isExpanded={expandedIds.has(item.id)}
                onToggle={() => toggleItem(item.id)}
              />
            );
          })
        )}
      </div>
    </div>
  );
}
