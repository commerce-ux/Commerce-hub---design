"use client";

import { useEffect, useState } from "react";
import { AppHeader } from "@cimpress-ui/react";
import {
  IconSettingsCog,
  IconChevronDown,
} from "@cimpress-ui/react/icons";
import { getAuth, getTenant, setTenant as saveTenant, getTenantLabel } from "@/lib/auth";
import { TenantDropdown } from "./TenantDropdown";

interface CommerceHubHeaderProps {
  tenant?: string | null;
  userName?: string;
  onTenantChange?: (id: string) => void;
}

export function CommerceHubHeader({
  tenant: tenantProp,
  userName: userNameProp,
  onTenantChange,
}: CommerceHubHeaderProps = {}) {
  const [resolvedTenant, setResolvedTenant] = useState<string | null>(
    tenantProp !== undefined ? tenantProp : null
  );
  const [resolvedName, setResolvedName] = useState(userNameProp ?? "");

  useEffect(() => {
    if (tenantProp === undefined) {
      setResolvedTenant(getTenant());
    }
    if (userNameProp === undefined) {
      const auth = getAuth();
      if (auth) setResolvedName(auth.name);
    }
  }, [tenantProp, userNameProp]);

  // Keep in sync with prop changes (e.g. when HomePage updates tenant)
  useEffect(() => {
    if (tenantProp !== undefined) {
      setResolvedTenant(tenantProp);
    }
  }, [tenantProp]);

  useEffect(() => {
    if (userNameProp !== undefined) {
      setResolvedName(userNameProp);
    }
  }, [userNameProp]);

  function handleTenantChange(id: string) {
    saveTenant(id);
    setResolvedTenant(id);
    onTenantChange?.(id);
  }

  const bp = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

  const initials = resolvedName
    ? resolvedName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "JA";

  const displayName = resolvedName || "Jonathan Appleseed";

  return (
    <AppHeader
      title="Commerce hub"
      titleLink={{ href: `${bp}/orders/VP_8WZ3DJ32` }}
      tools={
        <div className="flex items-center gap-1">
          <button
            aria-label="Settings"
            style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "2rem", height: "2rem", borderRadius: "4px", color: "var(--cim-fg-subtle)", background: "none", border: "none", cursor: "pointer" }}
          >
            <IconSettingsCog />
          </button>

          {resolvedTenant ? (
            <TenantDropdown
              activeTenantId={resolvedTenant}
              activeTenantLabel={getTenantLabel(resolvedTenant)}
              onTenantChange={handleTenantChange}
            />
          ) : (
            <button
              aria-label="Select tenant"
              className="flex items-center gap-1 px-2 h-8 rounded text-[color:var(--cim-fg-subtle)] text-sm hover:bg-[var(--cim-bg-hover)] transition-colors"
            >
              Select tenant
              <IconChevronDown />
            </button>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginLeft: "0.25rem" }}>
            <span className="text-sm text-[color:var(--cim-fg-base)]">
              {displayName}
            </span>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "2rem",
                height: "2rem",
                borderRadius: "50%",
                background: "#9b59b6",
                color: "white",
                fontSize: "0.75rem",
                fontWeight: 600,
              }}
              aria-label={`User: ${displayName}`}
            >
              {initials}
            </div>
          </div>
        </div>
      }
    />
  );
}
