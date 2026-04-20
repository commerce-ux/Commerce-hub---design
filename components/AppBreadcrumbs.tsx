"use client";

import { Breadcrumbs, BreadcrumbItem } from "@cimpress-ui/react";

interface BreadcrumbItemDef {
  label: string;
  href?: string;
}

export function AppBreadcrumbs({ items }: { items: BreadcrumbItemDef[] }) {
  return (
    <Breadcrumbs aria-label="Current location">
      {items.map((item, index) => (
        <BreadcrumbItem key={index} href={item.href ?? "#"}>
          {item.label}
        </BreadcrumbItem>
      ))}
    </Breadcrumbs>
  );
}
