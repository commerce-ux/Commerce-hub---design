"use client";

import { Breadcrumbs, BreadcrumbItem } from "@cimpress-ui/react";

interface BreadcrumbItemDef {
  label: string;
  href?: string;
}

export function AppBreadcrumbs({ items }: { items: BreadcrumbItemDef[] }) {
  return (
    <Breadcrumbs aria-label="Current location">
      {items.map((item, index) =>
        item.href ? (
          <BreadcrumbItem key={index} href={item.href}>
            {item.label}
          </BreadcrumbItem>
        ) : (
          <BreadcrumbItem key={index}>{item.label}</BreadcrumbItem>
        )
      )}
    </Breadcrumbs>
  );
}
