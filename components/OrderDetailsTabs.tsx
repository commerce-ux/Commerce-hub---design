"use client";

import { Tabs, TabList, Tab, TabPanels, TabPanel } from "@cimpress-ui/react";
import { EventsPanel } from "./EventsPanel";
import { LineItemsPanel } from "./LineItemsPanel";

interface OrderDetailsTabsProps {
  defaultTab?: string;
  isCancelled?: boolean;
}

export function OrderDetailsTabs({ defaultTab = "events", isCancelled = false }: OrderDetailsTabsProps) {
  return (
    <Tabs defaultSelectedKey={defaultTab} aria-label="Order details">
      <TabList>
        <Tab id="line-items">Line Items</Tab>
        <Tab id="shipment-info">Shipment info</Tab>
        <Tab id="events">Events</Tab>
      </TabList>
      <TabPanels>
        <TabPanel id="line-items">
          <LineItemsPanel isCancelled={isCancelled} />
        </TabPanel>
        <TabPanel id="shipment-info">
          <div className="py-6 text-[color:var(--cim-fg-subtle)]">
            Shipment info content
          </div>
        </TabPanel>
        <TabPanel id="events">
          <div className="pt-4">
            <EventsPanel isCancelled={isCancelled} />
          </div>
        </TabPanel>
      </TabPanels>
    </Tabs>
  );
}
