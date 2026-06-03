"use client";

import { useState } from "react";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import {
  Button, TextField, Text, IconButton,
  Stack, Badge, Drawer, DrawerBody, DrawerActions,
  Table, TableBody, TableBodyCell, TableBodyRow,
  TableContainer, TableHeader, TableHeaderCell, TableHeaderRow,
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

// ── Mock Quotes ────────────────────────────────────────────────────────────────
interface Quote {
  id: string;
  orderId: string | null;
  createdBy: string;
  createdOn: string;
  validity: string;
  price: string;
  customerNumber: string;
  items: number;
}

const MOCK_QUOTES: Quote[] = [
  { id: "123456789012", orderId: null,           createdBy: "melekzribovista@gmail.com",   createdOn: "Fri, 8 Aug 2025 14:58:44", validity: "Fri, 8 Aug 2025", price: "317.32 USD", customerNumber: "1234567890", items: 1 },
  { id: "123456789013", orderId: "123456789012", createdBy: "melekzribovista@gmail.com",   createdOn: "Fri, 8 Aug 2025 14:58:44", validity: "Fri, 8 Aug 2025", price: "317.32 USD", customerNumber: "1234567890", items: 1 },
  { id: "234567890123", orderId: null,           createdBy: "j.blake@vistaprint.com",      createdOn: "Mon, 12 May 2025 09:30:00", validity: "Mon, 12 May 2025", price: "128.50 USD", customerNumber: "234567",     items: 2 },
  { id: "345678901234", orderId: "VP_WXY12AB",   createdBy: "s.chen@cimpress.com",         createdOn: "Tue, 3 Jun 2025 11:15:22", validity: "Tue, 3 Jun 2025", price: "542.00 USD", customerNumber: "345678",     items: 3 },
  { id: "456789012345", orderId: null,           createdBy: "arjun.sharma@gmail.com",      createdOn: "Wed, 18 Jun 2025 16:45:10", validity: "Wed, 18 Jun 2025", price: "89.99 USD",  customerNumber: "456789",     items: 1 },
  { id: "567890123456", orderId: "VP_LMN90OP",   createdBy: "f.hassan@outlook.com",        createdOn: "Thu, 24 Jul 2025 08:00:00", validity: "Thu, 24 Jul 2025", price: "210.75 USD", customerNumber: "550956",     items: 2 },
  { id: "678901234567", orderId: null,           createdBy: "dpark@yahoo.com",             createdOn: "Fri, 1 Aug 2025 13:22:45", validity: "Fri, 1 Aug 2025",  price: "430.00 USD", customerNumber: "667823",     items: 4 },
  { id: "789012345678", orderId: "VP_FGH78IJ",   createdBy: "emma.w@example.com",          createdOn: "Sat, 9 Aug 2025 10:05:33", validity: "Sat, 9 Aug 2025",  price: "75.20 USD",  customerNumber: "778234",     items: 1 },
  { id: "890123456789", orderId: null,           createdBy: "cmendoza@empresa.mx",         createdOn: "Sun, 10 Aug 2025 17:30:00", validity: "Sun, 10 Aug 2025", price: "610.40 USD", customerNumber: "889345",     items: 5 },
  { id: "901234567890", orderId: "VP_UVW34XY",   createdBy: "priya.patel@techco.in",       createdOn: "Mon, 11 Aug 2025 14:00:00", validity: "Mon, 11 Aug 2025", price: "299.00 USD", customerNumber: "990456",     items: 2 },
];

const ALL_QUOTE_IDS = new Set(MOCK_QUOTES.map(q => q.id));

function searchQuotes(quoteId: string): Quote[] {
  const q = quoteId.trim().toLowerCase();
  return MOCK_QUOTES.filter(quote => quote.id.toLowerCase().includes(q));
}

// ── Quotes Results Table ───────────────────────────────────────────────────────

// TableBodyRow doesn't expose onClick in its type — cast to allow it on quote rows
const ClickableQuoteRow = TableBodyRow as React.ComponentType<
  React.ComponentProps<typeof TableBodyRow> & { style?: React.CSSProperties }
>;

function QuotesTable({ quotes, count }: { quotes: Quote[]; count: number }) {
  const linkStyle: React.CSSProperties = {
    color: "var(--cim-fg-accent, #007798)",
    textDecoration: "underline",
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
        <Text as="p" variant="body-semibold">{count} search result{count !== 1 ? "s" : ""}</Text>
        <div style={{ display: "flex", gap: "8px" }}>
          <Button variant="tertiary" size="small">Filters</Button>
          <Button variant="tertiary" size="small">Edit columns</Button>
        </div>
      </div>
      <TableContainer>
        <Table aria-label="Quote search results">
          <TableHeader>
            <TableHeaderRow>
              <TableHeaderCell columnKey="quoteId">Quote ID</TableHeaderCell>
              <TableHeaderCell columnKey="orderId">Order ID</TableHeaderCell>
              <TableHeaderCell columnKey="createdBy">Created by</TableHeaderCell>
              <TableHeaderCell columnKey="createdOn">Created on</TableHeaderCell>
              <TableHeaderCell columnKey="validity">Quote validity</TableHeaderCell>
              <TableHeaderCell columnKey="price">Quote price</TableHeaderCell>
              <TableHeaderCell columnKey="customerNumber">Customer number</TableHeaderCell>
              <TableHeaderCell columnKey="items" columnContentAlignment="end">Items</TableHeaderCell>
            </TableHeaderRow>
          </TableHeader>
          <TableBody>
            {quotes.map((q, i) => (
              <ClickableQuoteRow key={q.id + i}>
                <TableBodyCell columnKey="quoteId">
                  <a href="#" style={linkStyle}>{q.id}</a>
                </TableBodyCell>
                <TableBodyCell columnKey="orderId">
                  {q.orderId
                    ? <NextLink href={`/orders/${q.orderId}`} style={linkStyle}>{q.orderId}</NextLink>
                    : <Text as="span" variant="medium" tone="subtle">-</Text>
                  }
                </TableBodyCell>
                <TableBodyCell columnKey="createdBy">
                  <Text as="span" variant="medium">{q.createdBy}</Text>
                </TableBodyCell>
                <TableBodyCell columnKey="createdOn">
                  <Text as="span" variant="medium">{q.createdOn}</Text>
                </TableBodyCell>
                <TableBodyCell columnKey="validity">
                  <Text as="span" variant="medium">{q.validity}</Text>
                </TableBodyCell>
                <TableBodyCell columnKey="price">
                  <Text as="span" variant="medium">{q.price}</Text>
                </TableBodyCell>
                <TableBodyCell columnKey="customerNumber">
                  <Text as="span" variant="medium">{q.customerNumber}</Text>
                </TableBodyCell>
                <TableBodyCell columnKey="items">
                  <div style={{ textAlign: "right" }}>{q.items}</div>
                </TableBodyCell>
              </ClickableQuoteRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
}

// ── Table layout constants ─────────────────────────────────────────────────────
const COLS = "1.5fr 1.5fr 1.2fr 0.8fr 0.6fr 0.6fr 0.6fr 0.6fr";

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

// ── Address card (Figma style) ─────────────────────────────────────────────────
function AddressCard({ label, customerName, addr }: {
  label: "Billing address" | "Shipping address";
  customerName: string;
  addr: import("@/lib/createOrderMockData").CustomerAddress | undefined;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {/* Section header */}
      <span style={{ fontSize: "0.875rem", color: "var(--cim-fg-subtle, #5f6469)", lineHeight: "20px" }}>
        {label}
      </span>
      {/* Card */}
      <div style={{
        border: "1px solid var(--cim-border-base, #dadcdd)",
        borderRadius: "var(--cim-radius-6, 6px)",
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        gap: "4px",
        background: "white",
      }}>
        {addr ? (
          <>
            {/* Name + Default badge */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
              <span style={{ fontSize: "1rem", fontWeight: 600, color: "var(--cim-fg-base, #15191d)" }}>
                {customerName}
              </span>
              <span style={{
                fontSize: "0.75rem",
                fontWeight: 500,
                color: "var(--cim-fg-info, #0078d4)",
                background: "var(--cim-bg-info-subtle, #e8f4fd)",
                borderRadius: "9999px",
                padding: "2px 10px",
                lineHeight: "20px",
              }}>
                Default
              </span>
            </div>
            {/* Address lines */}
            <div style={{ fontSize: "1rem", lineHeight: "28px", color: "var(--cim-fg-base, #15191d)", marginBottom: "12px" }}>
              <p>{addr.address},</p>
              <p>{addr.city}, {addr.state}</p>
              <p>{addr.zipcode}, {addr.country}</p>
            </div>
            {/* Edit | Change address */}
            <div style={{ display: "flex", gap: "16px" }}>
              <a href="#" style={{ color: "var(--cim-fg-accent, #007798)", fontSize: "1rem", textDecoration: "underline" }}>Edit</a>
              <a href="#" style={{ color: "var(--cim-fg-accent, #007798)", fontSize: "1rem", textDecoration: "underline" }}>Change address</a>
            </div>
          </>
        ) : (
          <span style={{ fontSize: "1rem", color: "var(--cim-fg-subtle, #5f6469)" }}>No address on file</span>
        )}
      </div>
    </div>
  );
}

// ── Results table ──────────────────────────────────────────────────────────────
function ResultsTable({ results, count }: { results: Customer[]; count: number }) {
  const [drawerCustomer, setDrawerCustomer] = useState<Customer | null>(null);
  const router = useRouter();

  function openDrawer(c: Customer) {
    setDrawerCustomer(c);
  }

  function closeDrawer() {
    setDrawerCustomer(null);
  }

  function confirmAddress() {
    if (!drawerCustomer) return;
    // Store is derived from billing address country; shipping address sets the default delivery address
    const billing  = drawerCustomer.addresses.find((a) => a.addressType === "billing")  ?? drawerCustomer.addresses[0];
    const shipping = drawerCustomer.addresses.find((a) => a.addressType === "shipping") ?? drawerCustomer.addresses[0];
    // Use router.push so Next.js automatically prepends the basePath (needed for GitHub Pages)
    router.push(`/customers/${drawerCustomer.id}/create-order?country=${encodeURIComponent(billing?.country ?? "")}&addressId=${encodeURIComponent(shipping?.id ?? "")}`);
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
          <div style={headerCellStyle}><Text as="span" variant="medium-semibold">Country</Text></div>
          <div style={headerCellStyle}><Text as="span" variant="medium-semibold">Orders</Text></div>
          <div style={headerCellStyle}><Text as="span" variant="medium-semibold">Quotes</Text></div>
          <div style={headerCellStyle}><Text as="span" variant="medium-semibold">Carts</Text></div>
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
              <div style={CELL}>
                {c.addresses[0]?.country
                  ? <Text as="span" variant="medium">{c.addresses[0].country}</Text>
                  : <Text as="span" variant="medium" tone="muted">—</Text>}
              </div>
              <div style={CELL_RIGHT}>
                {total > 0 ? (
                  <NextLink href={`/customers/${c.id}`} style={{ color: "var(--cim-fg-accent, #007798)", fontSize: "1rem" }}>{total}</NextLink>
                ) : (
                  <Text as="span" variant="medium" tone="muted">—</Text>
                )}
              </div>
              <div style={CELL_RIGHT}>
                {(c.quotesCount ?? 0) > 0 ? (
                  <NextLink href={`/customers/${c.id}`} style={{ color: "var(--cim-fg-accent, #007798)", fontSize: "1rem" }}>{c.quotesCount}</NextLink>
                ) : (
                  <Text as="span" variant="medium" tone="muted">—</Text>
                )}
              </div>
              <div style={CELL_RIGHT}>
                {(c.cartCount ?? 0) > 0 ? (
                  <NextLink href={`/customers/${c.id}`} style={{ color: "var(--cim-fg-accent, #007798)", fontSize: "1rem" }}>{c.cartCount}</NextLink>
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

      {/* Address drawer */}
      <Drawer
        title="Select Address to create order"
        size="medium"
        isOpen={drawerCustomer !== null}
        onOpenChange={(open) => { if (!open) closeDrawer(); }}
      >
        <DrawerBody>
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <AddressCard
              label="Billing address"
              customerName={drawerCustomer?.name ?? ""}
              addr={drawerCustomer?.addresses.find((a) => a.addressType === "billing")}
            />
            <AddressCard
              label="Shipping address"
              customerName={drawerCustomer?.name ?? ""}
              addr={drawerCustomer?.addresses.find((a) => a.addressType === "shipping")}
            />
          </div>
        </DrawerBody>
        <DrawerActions>
          <Button variant="secondary" onPress={closeDrawer}>Cancel</Button>
          <Button variant="primary" onPress={confirmAddress}>
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
  const [quoteResults, setQuoteResults]   = useState<Quote[]>([]);
  const [searchMode, setSearchMode]       = useState<"customers" | "quotes" | null>(null);

  function handleSearch() {
    if (!hasAnyInput(name, email, phone, accountNumber, postalCode, orderNumber, quoteId)) return;
    if (quoteId.trim()) {
      setQuoteResults(searchQuotes(quoteId));
      setSearchMode("quotes");
    } else {
      setResults(searchCustomers(name, email, phone, accountNumber, postalCode, orderNumber, quoteId));
      setSearchMode("customers");
    }
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

          {/* All fields on a 5-column grid so every field is equal width */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "16px", alignItems: "flex-start" }}>
            {[
              { label: "Customer name",  value: name,          setter: setName },
              { label: "Email",          value: email,         setter: setEmail },
              { label: "Account number", value: accountNumber, setter: setAccountNumber },
              { label: "Order number",   value: orderNumber,   setter: setOrderNumber },
              { label: "Quote ID",       value: quoteId,       setter: setQuoteId },
              { label: "Postal code",    value: postalCode,    setter: setPostalCode },
              { label: "Phone",          value: phone,         setter: setPhone },
            ].map(({ label, value, setter }) => (
              <div key={label} onKeyDown={handleKeyDown}>
                <TextField
                  aria-label={label}
                  placeholder={label}
                  value={value}
                  onChange={setter}
                />
              </div>
            ))}
            {/* Search button in the last cell of row 2, right-aligned */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gridColumn: "5" }}>
              <Button variant="primary" onPress={handleSearch}>Search</Button>
            </div>
          </div>

        </div>

        {/* Results */}
        {searchMode === "quotes" && (
          quoteResults.length === 0 ? (
            <div style={{ background: "white", borderRadius: "var(--cim-radius-6, 6px)", padding: "24px", boxShadow: "0px 1px 1px rgba(0,0,0,0.08), 0px 2px 2px rgba(0,0,0,0.06)", textAlign: "center" }}>
              <Text as="p" variant="body-semibold" tone="warning">No results</Text>
              <Text as="p" variant="body" tone="warning">No quote was found matching that ID. Please check and try again.</Text>
            </div>
          ) : (
            <QuotesTable quotes={quoteResults} count={quoteResults.length} />
          )
        )}
        {searchMode === "customers" && (
          results.length === 0 ? (
            <div style={{ background: "white", borderRadius: "var(--cim-radius-6, 6px)", padding: "24px", boxShadow: "0px 1px 1px rgba(0,0,0,0.08), 0px 2px 2px rgba(0,0,0,0.06)", textAlign: "center" }}>
              <Text as="p" variant="body-semibold" tone="warning">No results</Text>
              <Text as="p" variant="body" tone="warning">There are no customers that match your search. Please check and try again.</Text>
            </div>
          ) : (
            <ResultsTable results={results} count={results.length} />
          )
        )}
      </Stack>
    </div>
  );
}
