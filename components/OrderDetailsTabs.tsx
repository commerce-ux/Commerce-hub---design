"use client";

import { Tabs, TabList, Tab, TabPanels, TabPanel } from "@cimpress-ui/react";
import { EventsPanel } from "./EventsPanel";

interface OrderDetailsTabsProps {
  defaultTab?: string;
}

export function OrderDetailsTabs({ defaultTab = "events" }: OrderDetailsTabsProps) {
  return (
    <Tabs defaultSelectedKey={defaultTab} aria-label="Order details">
      <TabList>
        <Tab id="line-items">Line Items</Tab>
        <Tab id="shipment-info">Shipment info</Tab>
        <Tab id="events">Events</Tab>
      </TabList>
      <TabPanels>
        <TabPanel id="line-items">
          <div className="py-6 text-[color:var(--cim-fg-subtle)]">
            Line items content
          </div>
        </TabPanel>
        <TabPanel id="shipment-info">
          <div className="py-6 text-[color:var(--cim-fg-subtle)]">
            Shipment info content
          </div>
        </TabPanel>
        <TabPanel id="events">
          <div className="pt-6">
            <EventsPanel />
          </div>
        </TabPanel>
      </TabPanels>
    </Tabs>
  );
}
