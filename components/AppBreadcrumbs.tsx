"use client";

import { Breadcrumbs, BreadcrumbItem } from "@cimpress-ui/react";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

interface BreadcrumbItemDef {
  label: string;
  href?: string;
}

export function AppBreadcrumbs({ items }: { items: BreadcrumbItemDef[] }) {
  return (
    <Breadcrumbs aria-label="Current location">
      {items.map((item, index) => (
        <BreadcrumbItem key={index} href={item.href ? `${BASE_PATH}${item.href}` : "#"}>
          {item.label}
        </BreadcrumbItem>
      ))}
    </Breadcrumbs>
  );
}
