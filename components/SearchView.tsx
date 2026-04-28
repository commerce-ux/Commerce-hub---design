"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button, Select, SelectItem, SearchField, Text, IconButton,
  Table, TableBody, TableBodyCell, TableBodyRow,
  TableContainer, TableHeader, TableHeaderCell, TableHeaderRow,
} from "@cimpress-ui/react";
import {
  IconChevronDown, IconArrowLeft, IconAddCircle, IconMenuMoreVertical,
} from "@cimpress-ui/react/icons";
import type { Key } from "@cimpress-ui/react";
import { CUSTOMER_DATABASE } from "@/lib/createOrderMockData";
import type { Customer } from "@/lib/createOrderMockData";

// Re-export for any legacy imports
export { CUSTOMER_DATABASE };

interface SearchViewProps {
  tenant: string;
  userName: string;
  onCustomerSelect?: (name: string | null) => void;
}

interface Order {
  id: string;
  createdOn: string;
  timezone: string;
  estimatedArrival: string;
  shippingCost: string;
  orderTotal: string;
  tax: string;
}

// All valid order IDs (flat list for quick lookup)
const ALL_ORDER_IDS = new Set(CUSTOMER_DATABASE.flatMap((c) => c.orderIds));

// ── Search helpers ─────────────────────────────────────────────────────────────
function searchCustomers(name: string, email: string, phone: string): Customer[] {
  const n = name.trim().toLowerCase();
  const e = email.trim().toLowerCase();
  const p = phone.trim();

  return CUSTOMER_DATABASE.filter((c) => {
    const nameOk = !n || c.name.toLowerCase().includes(n);
    const emailOk = !e || c.email.toLowerCase().includes(e);
    const phoneOk = !p || c.phone.includes(p);
    return nameOk && emailOk && phoneOk;
  });
}

// ── Mock order rows (for the order detail table) ───────────────────────────────
const MOCK_ORDERS: Order[] = [
  { id: "VP_LPHSW5Q", createdOn: "6 June 2026  05:50", timezone: "GMT +5:30 (IST)", estimatedArrival: "Fri, 12 June 2026", shippingCost: "USD 4.56", orderTotal: "USD 34.59", tax: "USD 1.80 tax" },
  { id: "VP_KJH23NM", createdOn: "14 May 2026  09:12", timezone: "GMT +5:30 (IST)", estimatedArrival: "Mon, 20 May 2026", shippingCost: "USD 3.20", orderTotal: "USD 22.40", tax: "USD 1.10 tax" },
  { id: "VP_QAZ11WS", createdOn: "2 Apr 2026  14:35", timezone: "GMT +5:30 (IST)", estimatedArrival: "Sat, 7 Apr 2026", shippingCost: "USD 5.00", orderTotal: "USD 41.00", tax: "USD 2.05 tax" },
];

// ── View state ─────────────────────────────────────────────────────────────────
type View = "empty" | "customers" | "orders" | "no_results";

// ── Icons ──────────────────────────────────────────────────────────────────────
function WarningCircleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 5a1 1 0 0 1 1 1v4a1 1 0 1 1-2 0V8a1 1 0 0 1 1-1zm0 8a1 1 0 1 0 0 2 1 1 0 0 0 0-2z" />
    </svg>
  );
}

function SortIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true" style={{ display: "inline", marginLeft: "4px", verticalAlign: "middle" }}>
      <path d="M8 2L5 6h6L8 2zm0 12l3-4H5l3 4z" fill="currentColor" opacity="0.5" />
    </svg>
  );
}

function ReplaceIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 12c0-4.4 3.6-8 8-8 2.3 0 4.3 1 5.8 2.5L20 9M20 9V4M20 9h-5M20 12c0 4.4-3.6 8-8 8-2.3 0-4.3-1-5.8-2.5L4 15M4 15v5M4 15h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CancelIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
      <path d="M15 9l-6 6M9 9l6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// TableBodyRow doesn't expose onClick in its props type — cast to allow it
const ClickableTableBodyRow = TableBodyRow as React.ComponentType<
  React.ComponentProps<typeof TableBodyRow> & { onClick?: () => void; style?: React.CSSProperties }
>;

// ── Orders table styles (kept for the order detail table only) ─────────────────
const orderTh: React.CSSProperties = {
  padding: "0 12px", height: "40px", background: "var(--cim-bg-subtle, #f8f9fa)",
  fontSize: "0.875rem", fontWeight: 600, color: "var(--cim-fg-base, #15191d)",
  textAlign: "left", borderBottom: "1px solid var(--cim-border-base, #dadcdd)", whiteSpace: "nowrap",
};
const orderTd: React.CSSProperties = {
  padding: "0 12px", height: "40px", fontSize: "0.875rem",
  color: "var(--cim-fg-base, #15191d)", borderBottom: "1px solid var(--cim-border-base, #dadcdd)", whiteSpace: "nowrap",
};

// ── Component ──────────────────────────────────────────────────────────────────
export function SearchView({ onCustomerSelect }: SearchViewProps) {
  const router = useRouter();

  // Search inputs
  const [customerName, setCustomerName] = useState("");
  const [emailId, setEmailId] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [orderNumber, setOrderNumber] = useState("");

  // Filters
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [storeFilter, setStoreFilter] = useState<Key | null>(null);
  const [orderTypeFilter, setOrderTypeFilter] = useState<Key | null>(null);
  const [itemStatusFilter, setItemStatusFilter] = useState<Key | null>(null);
  const [lineItemTypeFilter, setLineItemTypeFilter] = useState<Key | null>(null);

  // Results state
  const [view, setView] = useState<View>("empty");
  const [noResultsMessage, setNoResultsMessage] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [orderAction, setOrderAction] = useState<{ orderId: string; action: "replace" | "cancel" } | null>(null);

  // ── Field validation ────────────────────────────────────────────────────────
  function validatePhone(val: string): string | undefined {
    if (val && /[a-zA-Z]/.test(val)) return "Phone number must contain numbers only";
  }

  function validateEmail(val: string): string | undefined {
    if (val && !val.includes("@")) return "Please enter a valid email address (must contain @)";
  }

  const phoneHasError = Boolean(validatePhone(phoneNumber));
  const emailHasError = Boolean(validateEmail(emailId));

  // ── Handlers ────────────────────────────────────────────────────────────────
  function handleSearch() {
    if (phoneHasError || emailHasError) return;

    // ── Order number: look up in database ──────────────────────────────────
    if (orderNumber.trim()) {
      const orderId = orderNumber.trim().toUpperCase();
      if (ALL_ORDER_IDS.has(orderId)) {
        router.push(`/orders/${orderId}`);
      } else {
        setNoResultsMessage(
          `No order was found matching "${orderNumber.trim()}". Please check the order ID and try again.`
        );
        setView("no_results");
      }
      return;
    }

    // ── Customer search: look up in database ───────────────────────────────
    const hasName = customerName.trim();
    const hasEmail = emailId.trim();
    const hasPhone = phoneNumber.trim();

    if (!hasName && !hasEmail && !hasPhone) return;

    const results = searchCustomers(customerName, emailId, phoneNumber);

    if (results.length === 0) {
      setNoResultsMessage(
        "There are no customers that match your search. Please check and try again"
      );
      setView("no_results");
      return;
    }

    setCustomers(results);
    setView("customers");
    setSelectedCustomer(null);
    onCustomerSelect?.(null);
    setNoResultsMessage("");
  }

  function handleClear() {
    setCustomerName("");
    setEmailId("");
    setPhoneNumber("");
    setOrderNumber("");
    setStoreFilter(null);
    setOrderTypeFilter(null);
    setItemStatusFilter(null);
    setLineItemTypeFilter(null);
    setView("empty");
    setCustomers([]);
    setSelectedCustomer(null);
    onCustomerSelect?.(null);
    setOrderAction(null);
    setNoResultsMessage("");
  }

  function handleSelectCustomer(customer: Customer) {
    setSelectedCustomer(customer);
    setView("orders");
    onCustomerSelect?.(customer.name);
    setOrderAction(null);
  }

  function handleBackToCustomers() {
    setView("customers");
    setSelectedCustomer(null);
    onCustomerSelect?.(null);
    setOrderAction(null);
  }

  function handleReplaceOrder(orderId: string, e: React.MouseEvent) {
    e.stopPropagation();
    setOrderAction({ orderId, action: "replace" });
  }

  function handleCancelOrder(orderId: string, e: React.MouseEvent) {
    e.stopPropagation();
    setOrderAction({ orderId, action: "cancel" });
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Page title */}
      <Text as="h1" variant="title-4">Find order or customer</Text>

      {/* Search card */}
      <div style={{ background: "white", border: "1px solid var(--cim-border-subtle, #eaebeb)", borderRadius: "6px", boxShadow: "0px 1px 2px rgba(0,0,0,0.08), 0px 2px 4px rgba(0,0,0,0.06), 0px 4px 8px rgba(0,0,0,0.04)", padding: "16px", display: "flex", flexDirection: "column", gap: "24px" }}>

        {/* 4 inputs */}
        <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <SearchField
              aria-label="Customer full name"
              placeholder="Customer full name"
              value={customerName}
              onChange={setCustomerName}
              onSubmit={handleSearch}
              onClear={() => setCustomerName("")}
            />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <SearchField
              aria-label="Customer email ID"
              placeholder="Customer email ID"
              value={emailId}
              onChange={setEmailId}
              onSubmit={handleSearch}
              onClear={() => setEmailId("")}
              validate={validateEmail}
            />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <SearchField
              aria-label="Customer phone number"
              placeholder="Customer phone number"
              value={phoneNumber}
              onChange={setPhoneNumber}
              onSubmit={handleSearch}
              onClear={() => setPhoneNumber("")}
              validate={validatePhone}
              inputMode="tel"
            />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <SearchField
              aria-label="Order number"
              placeholder="Order number"
              value={orderNumber}
              onChange={setOrderNumber}
              onSubmit={handleSearch}
              onClear={() => setOrderNumber("")}
            />
          </div>
        </div>

        {/* Quick filters */}
        {filtersOpen && (
          <div style={{ display: "flex", gap: "16px" }}>
            <Select label="Select store" placeholder="Select" selectedKey={storeFilter} onSelectionChange={setStoreFilter}>
              <SelectItem id="store-us">US Store</SelectItem>
              <SelectItem id="store-eu">EU Store</SelectItem>
            </Select>
            <Select label="Select order type" placeholder="Select" selectedKey={orderTypeFilter} onSelectionChange={setOrderTypeFilter}>
              <SelectItem id="standard">Standard</SelectItem>
              <SelectItem id="express">Express</SelectItem>
            </Select>
            <Select label="Select item status" placeholder="Select" selectedKey={itemStatusFilter} onSelectionChange={setItemStatusFilter}>
              <SelectItem id="initial">Initial</SelectItem>
              <SelectItem id="in-production">In Production</SelectItem>
              <SelectItem id="shipped">Shipped</SelectItem>
            </Select>
            <Select label="Select line item type" placeholder="Select" selectedKey={lineItemTypeFilter} onSelectionChange={setLineItemTypeFilter}>
              <SelectItem id="print">Print</SelectItem>
              <SelectItem id="digital">Digital</SelectItem>
            </Select>
          </div>
        )}

        {/* Action row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Button variant="tertiary" iconEnd={<IconChevronDown />} onPress={() => setFiltersOpen((o) => !o)}>
            Quick filters
          </Button>
          <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
            <Button variant="tertiary" onPress={handleClear}>Clear</Button>
            <Button variant="primary" onPress={handleSearch}>Search</Button>
          </div>
        </div>
      </div>

      {/* ── Empty state (pre-search) ── */}
      {view === "empty" && (
        <div style={{ background: "white", border: "1px solid var(--cim-border-subtle, #eaebeb)", borderRadius: "6px", padding: "16px 16px 24px", display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", textAlign: "center" }}>
          <p className="font-semibold" style={{ fontSize: "1rem", lineHeight: "1.5rem", color: "var(--cim-fg-muted, #94979b)", margin: 0 }}>No result</p>
          <p style={{ fontSize: "0.875rem", color: "var(--cim-fg-muted, #94979b)", margin: 0 }}>It seems you haven&apos;t searched for anything yet</p>
        </div>
      )}

      {/* ── No results error state ── */}
      {view === "no_results" && (
        <div style={{ background: "white", border: "1px solid var(--cim-border-subtle, #eaebeb)", borderRadius: "6px", padding: "16px", display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", textAlign: "center" }}>
          <span style={{ color: "var(--cim-fg-warning, #a15e0c)", display: "flex" }}>
            <WarningCircleIcon />
          </span>
          <p className="font-semibold" style={{ fontSize: "1rem", lineHeight: "1.5rem", color: "var(--cim-fg-warning, #a15e0c)", margin: 0 }}>No result</p>
          <p style={{ fontSize: "0.875rem", lineHeight: "1.25rem", color: "var(--cim-fg-warning, #a15e0c)", margin: 0 }}>{noResultsMessage}</p>
        </div>
      )}

      {/* ── Customer list ── */}
      {view === "customers" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <p className="font-semibold" style={{ fontSize: "1rem", lineHeight: "1.5rem", color: "var(--cim-fg-base)", margin: 0 }}>
            {customers.length} Search Result{customers.length !== 1 ? "s" : ""}
          </p>
          <TableContainer>
            <Table aria-label="Customer search results">
              <TableHeader>
                <TableHeaderRow>
                  <TableHeaderCell columnKey="name">Name</TableHeaderCell>
                  <TableHeaderCell columnKey="email">Email ID</TableHeaderCell>
                  <TableHeaderCell columnKey="id">Customer ID</TableHeaderCell>
                  <TableHeaderCell columnKey="orders" columnContentAlignment="end">Orders</TableHeaderCell>
                  <TableHeaderCell columnKey="actions" columnContentAlignment="end">{""}</TableHeaderCell>
                </TableHeaderRow>
              </TableHeader>
              <TableBody>
                {customers.map((c) => (
                  <ClickableTableBodyRow key={c.id} onClick={() => handleSelectCustomer(c)} style={{ cursor: "pointer" }}>
                    <TableBodyCell columnKey="name">{c.name}</TableBodyCell>
                    <TableBodyCell columnKey="email">{c.email}</TableBodyCell>
                    <TableBodyCell columnKey="id">
                      <span style={{ color: "var(--cim-fg-subtle)", fontFamily: "monospace", fontSize: "0.8125rem" }}>
                        {c.id}
                      </span>
                    </TableBodyCell>
                    <TableBodyCell columnKey="orders">
                      <div style={{ textAlign: "right" }}>{c.orderCount}</div>
                    </TableBodyCell>
                    <TableBodyCell columnKey="actions">
                      <div style={{ display: "flex", gap: "4px", alignItems: "center", justifyContent: "flex-end" }}>
                        <IconButton
                          aria-label={`Create order for ${c.name}`}
                          icon={<IconAddCircle />}
                          variant="tertiary"
                          size="medium"
                          onPress={() => router.push(`/customers/${c.id}/create-order`)}
                        />
                        <IconButton
                          aria-label={`More options for ${c.name}`}
                          icon={<IconMenuMoreVertical />}
                          variant="tertiary"
                          size="medium"
                        />
                      </div>
                    </TableBodyCell>
                  </ClickableTableBodyRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </div>
      )}

      {/* ── Order list ── */}
      {view === "orders" && selectedCustomer && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Customer header */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button
              onClick={handleBackToCustomers}
              style={{ display: "flex", alignItems: "center", background: "none", border: "none", cursor: "pointer", color: "var(--cim-fg-base)", padding: "4px" }}
              aria-label="Back to customer list"
            >
              <IconArrowLeft />
            </button>
            <span className="font-semibold" style={{ fontSize: "1rem", color: "var(--cim-fg-base)" }}>{selectedCustomer.name}</span>
            <span style={{ fontSize: "0.875rem", color: "var(--cim-fg-subtle)" }}>{selectedCustomer.email}</span>
          </div>

          {/* Order action feedback */}
          {orderAction && (
            <div style={{ padding: "8px 12px", background: orderAction.action === "replace" ? "#e8f5e9" : "#fce4ec", borderRadius: "4px", fontSize: "0.875rem", color: orderAction.action === "replace" ? "#2e7d32" : "#c62828", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span>{orderAction.action === "replace" ? `Order ${orderAction.orderId} replacement initiated` : `Order ${orderAction.orderId} cancellation requested`}</span>
              <button onClick={() => setOrderAction(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1rem", lineHeight: 1 }}>×</button>
            </div>
          )}

          {/* Orders table */}
          <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid var(--cim-border-subtle, #eaebeb)", borderRadius: "4px", overflow: "hidden" }}>
            <thead>
              <tr>
                <th style={orderTh}>Order ID</th>
                <th style={orderTh}>Created on <SortIcon /></th>
                <th style={orderTh}>Estimated arrival <SortIcon /></th>
                <th style={orderTh}>Shipping costs</th>
                <th style={orderTh}>Order total <SortIcon /></th>
                <th style={{ ...orderTh, width: "80px" }}></th>
              </tr>
            </thead>
            <tbody>
              {MOCK_ORDERS.slice(0, selectedCustomer.orderCount).map((order, i) => (
                <tr
                  key={`${order.id}-${i}`}
                  onClick={() => router.push(`/orders/${order.id}`)}
                  style={{ background: i % 2 === 1 ? "var(--cim-bg-subtle, #f8f9fa)" : "white", cursor: "pointer" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--cim-bg-hover, #eef6fa)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = i % 2 === 1 ? "var(--cim-bg-subtle, #f8f9fa)" : "white")}
                >
                  <td style={orderTd}>{selectedCustomer.orderIds[i]}</td>
                  <td style={orderTd}>{order.createdOn}&nbsp;<span style={{ fontSize: "0.75rem", color: "var(--cim-fg-subtle)" }}>{order.timezone}</span></td>
                  <td style={orderTd}>{order.estimatedArrival}</td>
                  <td style={orderTd}>{order.shippingCost}</td>
                  <td style={orderTd}>{order.orderTotal}&nbsp;<span style={{ fontSize: "0.75rem", color: "var(--cim-fg-subtle)" }}>{order.tax}</span></td>
                  <td style={{ ...orderTd, width: "80px" }}>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                      <button onClick={(e) => handleReplaceOrder(selectedCustomer.orderIds[i], e)} title="Replace order" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "28px", height: "28px", border: "none", background: "none", cursor: "pointer", borderRadius: "4px", color: "var(--cim-fg-subtle)" }} onMouseEnter={(e) => (e.currentTarget.style.background = "var(--cim-bg-subtle)")} onMouseLeave={(e) => (e.currentTarget.style.background = "none")}><ReplaceIcon /></button>
                      <button onClick={(e) => handleCancelOrder(selectedCustomer.orderIds[i], e)} title="Cancel order" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "28px", height: "28px", border: "none", background: "none", cursor: "pointer", borderRadius: "4px", color: "var(--cim-fg-subtle)" }} onMouseEnter={(e) => (e.currentTarget.style.background = "var(--cim-bg-subtle)")} onMouseLeave={(e) => (e.currentTarget.style.background = "none")}><CancelIcon /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
