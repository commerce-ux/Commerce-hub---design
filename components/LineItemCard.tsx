"use client";

import { useState } from "react";
import { Badge, Disclosure } from "@cimpress-ui/react";
import { ItemProgressTracker } from "./ItemProgressTracker";
import { EventList } from "./EventList";
import type { OrderEvent, EventCategory } from "@/lib/types";

type StepState = "complete" | "error" | "pending";
type BadgeTone = "base" | "success" | "info" | "warning" | "critical";

interface LineItemCardProps {
  id: string;
  name: string;
  badgeLabel: string;
  badgeTone: BadgeTone;
  imageUrl?: string;
  itemId: string;
  warningCount: number;
  keyEventCount: number;
  summaryText: string;
  summaryTimestamp?: string;
  progressSteps: StepState[];
  events: OrderEvent[];
  warningsOnly?: boolean;
  isExpanded: boolean;
  onToggle: () => void;
}

export function LineItemCard({
  name,
  badgeLabel,
  badgeTone,
  imageUrl,
  itemId,
  warningCount,
  keyEventCount,
  summaryText,
  summaryTimestamp,
  progressSteps,
  events,
  warningsOnly = false,
  isExpanded,
  onToggle,
}: LineItemCardProps) {
  const [localFilter, setLocalFilter] = useState<EventCategory | "all">("all");

  return (
    <div className="border-b border-[var(--cim-border-base)] last:border-b-0">
      <Disclosure
        isExpanded={isExpanded}
        onExpandedChange={() => onToggle()}
        variant="subtle"
        UNSAFE_className="line-item-disclosure"
        title={name}
        badge={<Badge tone={badgeTone}>{badgeLabel}</Badge>}
        actions={
          <div className="flex gap-6 items-start w-full">
            {imageUrl && (
              <div className="flex-shrink-0 w-[72px] h-[72px] rounded-[var(--cim-radius-6)] overflow-hidden border border-[var(--cim-border-base)]">
                <img
                  src={imageUrl}
                  alt={name}
                  className="w-full h-full object-contain"
                />
              </div>
            )}

            <div className="flex flex-1 items-start justify-between min-w-0">
              <div className="flex flex-col gap-3">
                <span className="text-base text-[color:var(--cim-fg-base)]">
                  Item ID: {itemId}
                </span>
                <div className="flex items-center gap-6">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isExpanded && localFilter === "warning") { onToggle(); }
                      else { setLocalFilter("warning"); if (!isExpanded) onToggle(); }
                    }}
                    className="text-base text-[color:var(--cim-fg-accent)] underline decoration-[1.5px] text-left hover:opacity-80"
                  >
                    {warningCount} Warnings
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isExpanded && localFilter === "key_event") { onToggle(); }
                      else { setLocalFilter("key_event"); if (!isExpanded) onToggle(); }
                    }}
                    className="text-base text-[color:var(--cim-fg-accent)] underline decoration-[1.5px] text-left hover:opacity-80"
                  >
                    {keyEventCount} Key events
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isExpanded && localFilter === "all") { onToggle(); }
                      else { setLocalFilter("all"); if (!isExpanded) onToggle(); }
                    }}
                    className="text-base text-[color:var(--cim-fg-accent)] underline decoration-[1.5px] text-left hover:opacity-80"
                  >
                    All events
                  </button>
                </div>
                {!isExpanded && (
                  <div className="flex flex-col gap-1">
                    {(events[0]?.category === "warning" || events[0]?.iconStatus === "error") ? (
                      <>
                        <p className="text-sm text-[color:var(--cim-fg-base)]">{events[0].details?.description}</p>
                        <p className="text-xs text-[color:var(--cim-fg-subtle)]">{events[0].timestamp}</p>
                      </>
                    ) : (
                      <p className="text-sm text-[color:var(--cim-fg-subtle)]">Item is progressing as expected.</p>
                    )}
                  </div>
                )}
              </div>

              <div className="flex-shrink-0">
                <ItemProgressTracker steps={progressSteps} />
              </div>
            </div>
          </div>
        }
      >
        <div className="pb-4 pt-2">
          <EventList events={events} showFilter={false} warningsOnly={warningsOnly} filterOverride={localFilter} />
        </div>
      </Disclosure>
    </div>
  );
}
