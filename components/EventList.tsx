"use client";

import { useState, useEffect } from "react";
import { RadioGroup, Radio, Pagination, Badge } from "@cimpress-ui/react";
import { IconCheckCircleFill, IconCloseCircleFill, IconWarningCircleFill, IconSearch } from "@cimpress-ui/react/icons";
import type { OrderEvent, EventCategory } from "@/lib/types";

interface EventListProps {
  events: OrderEvent[];
  totalPages?: number;
  showFilter?: boolean;
  warningsOnly?: boolean;
  filterOverride?: EventCategory | "all";
}

const FILTER_OPTIONS: { value: EventCategory | "all"; label: string }[] = [
  { value: "all", label: "All events" },
  { value: "warning", label: "Warnings" },
  { value: "key_event", label: "Key Events" },
  { value: "update", label: "Updates" },
];

export function EventList({ events, totalPages = 1, showFilter = true, warningsOnly = false, filterOverride }: EventListProps) {
  const [filter, setFilter] = useState<EventCategory | "all">(filterOverride ?? "all");
  const [search, setSearch] = useState("");
  const [expandedEventId, setExpandedEventId] = useState<string | null>(events[0]?.id ?? null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (filterOverride !== undefined) {
      setFilter(filterOverride);
      setCurrentPage(1);
    }
  }, [filterOverride]);
  const pageSize = 10;

  const filteredEvents = events.filter((e) => {
    if (warningsOnly && e.category !== "warning") return false;
    if (filter !== "all" && e.category !== filter) return false;
    if (search && !e.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const pageCount = Math.max(1, Math.ceil(filteredEvents.length / pageSize));
  const pagedEvents = filteredEvents.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const counts = {
    all: events.length,
    warning: events.filter((e) => e.category === "warning").length,
    key_event: events.filter((e) => e.category === "key_event").length,
    update: events.filter((e) => e.category === "update").length,
  };

  return (
    <div className="flex flex-col border border-[var(--cim-border-base)] rounded-[var(--cim-radius-6)] bg-[var(--cim-bg-base)] overflow-hidden">
      {/* Search */}
      <div className="p-4 border-b border-[var(--cim-border-base)]">
        <div className="relative flex items-center">
          <span className="absolute left-3 text-[color:var(--cim-fg-subtle)] pointer-events-none">
            <IconSearch />
          </span>
          <input
            type="text"
            placeholder="Search by event name"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            className="w-full pl-9 pr-3 py-2 border border-[var(--cim-border-base)] rounded-[var(--cim-radius-6)] text-sm text-[color:var(--cim-fg-base)] placeholder:text-[color:var(--cim-fg-subtle)] focus:outline-none focus:border-[var(--cim-fg-accent)] bg-white"
          />
        </div>
      </div>

      {/* Filter */}
      {showFilter && (
        <div className="px-4 py-3 border-b border-[var(--cim-border-base)]">
          <RadioGroup
            label="Filter by"
            direction="horizontal"
            value={filter}
            onChange={(v) => { setFilter(v as EventCategory | "all"); setCurrentPage(1); }}
          >
            {FILTER_OPTIONS.map(({ value, label }) => (
              <Radio key={value} value={value}>
                {label}
                <span className="ml-1 text-xs text-[color:var(--cim-fg-subtle)]">
                  ({counts[value as keyof typeof counts]})
                </span>
              </Radio>
            ))}
          </RadioGroup>
        </div>
      )}

      {/* Event rows — vertical timeline */}
      <div className="flex flex-col">
        {pagedEvents.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-[color:var(--cim-fg-subtle)]">
            {warningsOnly && filteredEvents.length === 0
              ? "This item has no warning events and is progressing as expected."
              : "No events match your filter."}
          </div>
        ) : (
          pagedEvents.map((event, index) => {
            const isExpanded = expandedEventId === event.id;
            const isLast = index === pagedEvents.length - 1;
            return (
              <div key={event.id} className="flex gap-3 px-4 py-3 border-b border-[var(--cim-border-base)] last:border-b-0">
                {/* Left: icon + vertical track */}
                <div className="flex flex-col items-center flex-shrink-0 w-5">
                  <div
                    className={`w-5 h-5 flex items-center justify-center ${
                      event.category === "warning"
                        ? "text-[color:var(--cim-fg-warning)]"
                        : event.iconStatus === "success"
                        ? "text-[color:var(--cim-fg-accent)]"
                        : "text-[color:var(--cim-fg-critical)]"
                    }`}
                  >
                    {event.category === "warning" ? (
                      <IconWarningCircleFill />
                    ) : event.iconStatus === "success" ? (
                      <IconCheckCircleFill />
                    ) : (
                      <IconCloseCircleFill />
                    )}
                  </div>
                  {!isLast && (
                    <div className="w-[2px] flex-1 mt-1 min-h-[16px] bg-[var(--cim-border-base-hover)]" />
                  )}
                </div>

                {/* Right: content */}
                <div className="flex flex-1 min-w-0 justify-between gap-3">
                  <div className="flex flex-col gap-1 flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[color:var(--cim-fg-base)]">
                      {event.name}
                    </p>
                    <p className="text-xs text-[color:var(--cim-fg-subtle)]">
                      {event.timestamp}
                    </p>

                    {/* Expanded details */}
                    {isExpanded && event.details && (
                      <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-[var(--cim-border-base)]">
                        {event.details.subType && (
                          <p className="text-sm text-[color:var(--cim-fg-subtle)]">
                            Event sub type:{" "}
                            <span className="font-medium">{event.details.subType}</span>
                          </p>
                        )}
                        <p className="text-sm text-[color:var(--cim-fg-base)]">
                          {event.details.description}
                        </p>
                        {event.details.metadata && (
                          <div className="flex flex-col gap-1">
                            {Object.entries(event.details.metadata).map(([key, val]) => (
                              <p key={key} className="text-xs text-[color:var(--cim-fg-subtle)]">
                                <span className="font-medium">{key}:</span> {val}
                              </p>
                            ))}
                          </div>
                        )}
                        <p className="text-xs text-[color:var(--cim-fg-subtle)]">
                          Source — {event.details.source}
                        </p>
                        <button
                          onClick={() => setExpandedEventId(null)}
                          className="text-sm text-[color:var(--cim-fg-accent)] underline decoration-[1.5px] text-left hover:opacity-80 w-fit"
                        >
                          Hide details
                        </button>
                      </div>
                    )}

                    {/* View details */}
                    {!isExpanded && event.details && (
                      <button
                        onClick={() => setExpandedEventId(event.id)}
                        className="text-sm text-[color:var(--cim-fg-accent)] underline decoration-[1.5px] text-left hover:opacity-80 w-fit"
                      >
                        View details
                      </button>
                    )}
                  </div>

                  {/* Category badges */}
                  <div className="flex-shrink-0 flex flex-col gap-1 items-end">
                    {event.category === "warning" && (
                      <Badge tone="warning">Warning</Badge>
                    )}
                    {event.category === "key_event" && (
                      <Badge tone="info">Key Event</Badge>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination — only show when needed */}
      {pageCount > 1 && (
        <div className="flex items-center justify-end gap-4 p-4 border-t border-[var(--cim-border-base)]">
          <Pagination
            currentPage={currentPage}
            pageCount={pageCount}
            onPageChange={setCurrentPage}
            aria-label="Event list pagination"
          />
        </div>
      )}
    </div>
  );
}
