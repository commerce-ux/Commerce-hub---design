"use client";

import { useState } from "react";
import NextLink from "next/link";
import {
  Button, TextField, Text, IconButton,
  Stack, Badge, Drawer, DrawerBody, DrawerActions,
} from "@cimpress-ui/react";
import { AppBreadcrumbs } from "./AppBreadcrumbs";
import { IconAddCircle } from "@cimpress-ui/react/icons";
import { CUSTOMER_DATABASE, getTotalOrders } from "@/lib/createOrderMockData";
import type { Customer } from "@/lib/createOrderMockData";
import { generateNameVariants } from "@/lib/customerUtils";

// ── Search ─────────────────────────────────────────────────────────────────────

/**
 * Full search pool: every real customer PLUS all their name-search variants.
 * This ensures that variant data (email, ID, phone) returned by a name search
 * remains findable when the user plugs those values into other search fields.
 */
function buildSearchPool(): Customer[] {
  const pool: Customer[] = [];
  const seen = new Set<string>();
  for (const base of CUSTOMER_DATABASE) {
    if (!seen.has(base.id)) { pool.push(base); seen.add(base.id); }
    for (const v of generateNameVariants(base)) {
      if (!seen.has(v.id)) { pool.push(v); seen.add(v.id); }
    }
  }
  return pool;
}

function searchCustomers(
  name: string,
  email: string,
  phone: string,
  accountNumber: string,
  postalCode: string,
  orderNumber: string,
  quoteId: string,
): Customer[] {
  const n  = name.trim().toLowerCase();
  const e  = email.trim().toLowerCase();
  const p  = phone.trim();
  const an = accountNumber.trim().toLowerCase();
  const z  = postalCode.trim();

  // Name-only: return all variants of the matched base customer (existing behaviour)
  if (n && !e && !p && !an && !z) {
    const matched = CUSTOMER_DATABASE.filter(c => c.name.toLowerCase().includes(n));
    if (matched.length > 0) return generateNameVariants(matched[0]);
    return [];
  }

  // All other searches: filter the full pool (real + variants)
  return buildSearchPool().filter((c) => {
    const nameOk    = !n  || c.name.toLowerCase().includes(n);
    const emailOk   = !e  || c.email.toLowerCase() === e;
    const phoneOk   = !p  || c.phone === p;
    const numberOk  = !an || c.id.toLowerCase() === an || c.shopperId.toLowerCase() === an;
    const zipOk     = !z  || c.addresses.some(a => a.zipcode.includes(z));
    return nameOk && emailOk && phoneOk && numberOk && zipOk;
  });
}

function hasAnyInput(name: string, email: string, phone: string, accountNumber: string, postalCode: string, orderNumber: string, quoteId: string) {
  return name.trim() || email.trim() || phone.trim() || accountNumber.trim() || postalCode.trim() || orderNumber.trim() || quoteId.trim();
}

// ── Table layout constants ─────────────────────────────────────────────────────
const COLS = "1.5fr 1.5fr 1.2fr 0.6fr 0.6fr";

const CELL: React.CSSProperties = { padding: "0 16px", minWidth: 0, overflow: "hidden" };
const CELL_RIGHT: React.CSSProperties = { ...CELL };
const headerCellStyle: React.CSSProperties = { padding: "0 16px", textAlign: "left", whiteSpace: "nowrap" };

const gridRow = (cols: string, bg = "white"): React.CSSProperties => ({
  display: "grid",
  gridTemplateColumns: cols,
  alignItems: "center",
  height: "48px",
  background: bg,
});

// ── Results table ──────────────────────────────────────────────────────────────
function ResultsTable({ results, count }: { results: Customer[]; count: number }) {
  const [drawerCustomer, setDrawerCustomer] = useState<Customer | null>(null);
  const [selectedAddressId, setSelectedAddressId] = useState<string>("");

  function openDrawer(c: Customer) {
    setDrawerCustomer(c);
    setSelectedAddressId(c.addresses[0]?.id ?? "");
  }

  function closeDrawer() {
    setDrawerCustomer(null);
    setSelectedAddressId("");
  }

  function confirmAddress() {
    if (!drawerCustomer || !selectedAddressId) return;
    const addr = drawerCustomer.addresses.find((a) => a.id === selectedAddressId);
    window.location.href = `/customers/${drawerCustomer.id}/create-order?country=${encodeURIComponent(addr?.country ?? "")}&addressId=${encodeURIComponent(selectedAddressId)}`;
  }

  return (
    <div>
      {/* Above-table row: count + Filters / Edit columns */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
        <Text as="p" variant="body-semibold">{count} search result{count !== 1 ? "s" : ""}</Text>
        <div style={{ display: "flex", gap: "8px" }}>
          <Button variant="tertiary" size="small">Filters</Button>
          <Button variant="tertiary" size="small">Edit columns</Button>
        </div>
      </div>

      {/* Table */}
      <div style={{ border: "1px solid var(--cim-border-subtle, #eaebeb)", borderRadius: "var(--cim-radius-4, 4px)", overflow: "hidden" }}>

        {/* Header */}
        <div style={{ ...gridRow(COLS, "var(--cim-bg-subtle, #f8f9fa)"), borderBottom: "1px solid var(--cim-border-base, #dadcdd)" }}>
          <div style={headerCellStyle}><Text as="span" variant="medium-semibold">Name</Text></div>
          <div style={headerCellStyle}><Text as="span" variant="medium-semibold">Email ID</Text></div>
          <div style={headerCellStyle}><Text as="span" variant="medium-semibold">Account number</Text></div>
          <div style={headerCellStyle}><Text as="span" variant="medium-semibold">Orders</Text></div>
          <div style={headerCellStyle}><Text as="span" variant="medium-semibold">Actions</Text></div>
        </div>

        {/* Rows */}
        {results.map((c) => {
          const total = getTotalOrders(c);
          const isOrg = c.type === "org";
          return (
            <div key={c.id} style={{ ...gridRow(COLS), borderTop: "1px solid var(--cim-border-subtle, #eaebeb)" }}>
              <div style={{ ...CELL, display: "flex", alignItems: "center", gap: "8px" }}>
                <NextLink href={`/customers/${c.id}`} style={{ color: "var(--cim-fg-accent, #007798)", fontSize: "1rem" }}>{c.name}</NextLink>
                {isOrg && <Badge tone="warning">Org</Badge>}
              </div>
              <div style={CELL}>
                <Text as="span" variant="medium" UNSAFE_style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>{c.email}</Text>
              </div>
              <div style={CELL}>
                <Text as="span" variant="medium">{c.id}</Text>
              </div>
              <div style={CELL_RIGHT}>
                {total > 0 ? (
                  <NextLink href={`/customers/${c.id}`} style={{ color: "var(--cim-fg-accent, #007798)", fontSize: "1rem" }}>{total}</NextLink>
                ) : (
                  <Text as="span" variant="medium" tone="muted">—</Text>
                )}
              </div>
              <div style={{ ...CELL, display: "flex", alignItems: "center" }}>
                {!isOrg && (
                  <IconButton
                    aria-label={`Create order for ${c.name}`}
                    icon={<IconAddCircle />}
                    variant="tertiary"
                    size="medium"
                    onPress={() => openDrawer(c)}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Address selection drawer */}
      <Drawer
        title="Select Address to create order"
        size="medium"
        isOpen={drawerCustomer !== null}
        onOpenChange={(open) => { if (!open) closeDrawer(); }}
      >
        <DrawerBody>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {drawerCustomer?.addresses.map((addr, idx) => {
              const isSelected = selectedAddressId === addr.id;
              const isPrimary = idx === 0;
              return (
                <div
                  key={addr.id}
                  onClick={() => setSelectedAddressId(addr.id)}
                  style={{
                    border: `1px solid ${isSelected ? "var(--cim-border-accent, #0091b8)" : "var(--cim-border-base, #dadcdd)"}`,
                    background: isSelected ? "var(--cim-bg-subtle, #f8f9fa)" : "white",
                    borderRadius: "var(--cim-radius-6, 6px)",
                    padding: "12px 16px",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                  }}
                >
                  {/* Radio + name + Primary badge */}
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{
                      width: 16, height: 16, borderRadius: "50%", flexShrink: 0,
                      background: isSelected ? "var(--cim-bg-accent, #0281a1)" : "white",
                      border: isSelected ? "none" : "1px solid var(--cim-fg-base, #15191d)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {isSelected && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "white" }} />}
                    </div>
                    <span style={{ fontSize: "1rem", fontWeight: 600, color: "var(--cim-fg-base, #15191d)" }}>
                      {drawerCustomer.name}
                    </span>
                    {isPrimary && <Badge tone="warning">Primary</Badge>}
                  </div>

                  {/* Address lines */}
                  <div style={{ fontSize: "1rem", lineHeight: "24px", color: "var(--cim-fg-base, #15191d)" }}>
                    <p style={{ marginBottom: "12px" }}>{addr.address},</p>
                    <p style={{ marginBottom: "12px" }}>{addr.city}, {addr.state}</p>
                    <p>{addr.zipcode}, {addr.country}</p>
                  </div>

                  {/* Edit link */}
                  <a href="#" style={{ color: "var(--cim-fg-accent, #007798)", fontSize: "1rem", textDecoration: "underline" }}>Edit</a>

                  {/* Divider */}
                  <div style={{ height: "1px", background: "var(--cim-border-base, #dadcdd)" }} />

                  {/* Orders in previous 30 days */}
                  <p style={{ fontSize: "1rem", color: "var(--cim-fg-base, #15191d)" }}>
                    Orders in previous 30 days: <strong>{addr.orderCount > 0 ? "YES" : "NO"}</strong>
                  </p>
                </div>
              );
            })}
          </div>
        </DrawerBody>
        <DrawerActions>
          <Button variant="secondary" onPress={closeDrawer}>Cancel</Button>
          <Button variant="primary" isDisabled={!selectedAddressId} onPress={confirmAddress}>
            Confirm Address to create order
          </Button>
        </DrawerActions>
      </Drawer>
    </div>
  );
}

// ── Page component ─────────────────────────────────────────────────────────────
export function CustomerManagementPage() {
  const [name, setName]                   = useState("");
  const [email, setEmail]                 = useState("");
  const [phone, setPhone]                 = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [postalCode, setPostalCode]       = useState("");
  const [orderNumber, setOrderNumber]     = useState("");
  const [quoteId, setQuoteId]             = useState("");
  const [results, setResults]             = useState<Customer[]>([]);
  const [searched, setSearched]           = useState(false);

  function handleSearch() {
    if (!hasAnyInput(name, email, phone, accountNumber, postalCode, orderNumber, quoteId)) return;
    setResults(searchCustomers(name, email, phone, accountNumber, postalCode, orderNumber, quoteId));
    setSearched(true);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleSearch();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, background: "var(--cim-bg-subtle, #f8f9fa)" }}>
      <Stack gap={24} UNSAFE_style={{ padding: "24px" }}>
        <AppBreadcrumbs items={[
          { label: "Dashboard", href: "/" },
          { label: "Search" },
        ]} />

        {/* Search form — plain white container, no card title */}
        <div style={{
          background: "white",
          borderRadius: "var(--cim-radius-6, 6px)",
          padding: "12px",
          boxShadow: "0px 1px 1px rgba(0,0,0,0.08), 0px 2px 2px rgba(0,0,0,0.06), 0px 4px 4px rgba(0,0,0,0.04)",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}>

          {/* Row 1: Customer name, Email, Account number, Order number, Quote ID */}
          <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
            {[
              { label: "Customer name",  value: name,          setter: setName },
              { label: "Email",          value: email,         setter: setEmail },
              { label: "Account number", value: accountNumber, setter: setAccountNumber },
              { label: "Order number",   value: orderNumber,   setter: setOrderNumber },
              { label: "Quote ID",       value: quoteId,       setter: setQuoteId },
            ].map(({ label, value, setter }) => (
              <div key={label} style={{ flex: 1, minWidth: 0 }} onKeyDown={handleKeyDown}>
                <TextField
                  aria-label={label}
                  placeholder={label}
                  value={value}
                  onChange={setter}
                />
              </div>
            ))}
          </div>

          {/* Row 2: Postal code, Phone (left) + Search button (right) */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", gap: "16px" }}>
              {[
                { label: "Postal code", value: postalCode, setter: setPostalCode },
                { label: "Phone",       value: phone,      setter: setPhone },
              ].map(({ label, value, setter }) => (
                <div key={label} style={{ width: "250px" }} onKeyDown={handleKeyDown}>
                  <TextField
                    aria-label={label}
                    placeholder={label}
                    value={value}
                    onChange={setter}
                  />
                </div>
              ))}
            </div>
            <Button variant="primary" onPress={handleSearch}>Search</Button>
          </div>

        </div>

        {/* Results */}
        {searched && (
          results.length === 0 ? (
            <div style={{
              background: "white",
              borderRadius: "var(--cim-radius-6, 6px)",
              padding: "24px",
              boxShadow: "0px 1px 1px rgba(0,0,0,0.08), 0px 2px 2px rgba(0,0,0,0.06)",
              textAlign: "center",
            }}>
              <Text as="p" variant="body-semibold" tone="warning">No results</Text>
              <Text as="p" variant="body" tone="warning">
                There are no customers that match your search. Please check and try again.
              </Text>
            </div>
          ) : (
            <ResultsTable results={results} count={results.length} />
          )
        )}
      </Stack>
    </div>
  );
}
