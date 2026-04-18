"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, SearchField, Text } from "@cimpress-ui/react";
import { AppBreadcrumbs } from "./AppBreadcrumbs";
import { IconAdd } from "@cimpress-ui/react/icons";
import { CUSTOMER_DATABASE } from "@/lib/createOrderMockData";
import type { Customer } from "@/lib/createOrderMockData";

function searchCustomers(name: string, email: string, phone: string, customerId: string): Customer[] {
  const n = name.trim().toLowerCase();
  const e = email.trim().toLowerCase();
  const p = phone.trim();
  const id = customerId.trim().toLowerCase();

  return CUSTOMER_DATABASE.filter((c) => {
    const nameOk = !n || c.name.toLowerCase().includes(n);
    const emailOk = !e || c.email.toLowerCase().includes(e);
    const phoneOk = !p || c.phone.includes(p);
    const idOk = !id || c.id.toLowerCase().includes(id);
    return nameOk && emailOk && phoneOk && idOk;
  });
}

function hasAnyInput(name: string, email: string, phone: string, customerId: string) {
  return name.trim() || email.trim() || phone.trim() || customerId.trim();
}

// ── Icons ──────────────────────────────────────────────────────────────────────
function CreateOrderIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 8v8M8 12h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function OrderHistoryIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function KebabIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="12" cy="5" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="12" cy="19" r="1.5" />
    </svg>
  );
}

function SortIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true" style={{ display: "inline", marginLeft: "4px", verticalAlign: "middle" }}>
      <path d="M8 2L5 6h6L8 2zm0 12l3-4H5l3 4z" fill="currentColor" opacity="0.6" />
    </svg>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const thStyle: React.CSSProperties = {
  padding: "0 16px",
  height: "40px",
  background: "var(--cim-bg-subtle, #f8f9fa)",
  fontSize: "0.875rem",
  fontWeight: 600,
  color: "var(--cim-fg-base, #15191d)",
  textAlign: "left",
  borderBottom: "1px solid var(--cim-border-base, #dadcdd)",
  whiteSpace: "nowrap",
};

const tdStyle: React.CSSProperties = {
  padding: "0 16px",
  height: "48px",
  fontSize: "0.875rem",
  color: "var(--cim-fg-base, #15191d)",
  borderBottom: "1px solid var(--cim-border-subtle, #eaebeb)",
  whiteSpace: "nowrap",
};

const iconBtnStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "28px",
  height: "28px",
  border: "none",
  background: "none",
  cursor: "pointer",
  borderRadius: "4px",
  color: "var(--cim-fg-accent, #0e7490)",
};

type SortField = "store" | null;
type SortDir = "asc" | "desc";

export function CustomerManagementPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [customerId, setCustomerId] = useState("");

  const [results, setResults] = useState<Customer[]>([]);
  const [searched, setSearched] = useState(false);

  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  function handleSearch() {
    if (!hasAnyInput(name, email, phone, customerId)) return;
    const found = searchCustomers(name, email, phone, customerId);
    setResults(found);
    setSearched(true);
  }

  function handleSortStore() {
    if (sortField === "store") {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField("store");
      setSortDir("asc");
    }
  }

  const sortedResults = [...results].sort((a, b) => {
    if (sortField === "store") {
      return sortDir === "asc"
        ? a.store.localeCompare(b.store)
        : b.store.localeCompare(a.store);
    }
    return 0;
  });

  function validateEmail(val: string) {
    if (val && !val.includes("@")) return "Please enter a valid email address";
  }

  function validatePhone(val: string) {
    if (val && /[a-zA-Z]/.test(val)) return "Phone number must contain numbers only";
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, background: "var(--cim-bg-subtle, #f8f9fa)" }}>
      <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
        <AppBreadcrumbs items={[
          { label: "Dashboard", href: "/" },
          { label: "Customer management" },
        ]} />

        {/* Heading row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Text as="h1" variant="title-4">Find customer</Text>
          <Button variant="secondary" iconStart={<IconAdd />}>
            Add new customer
          </Button>
        </div>
        {/* Search card */}
        <div style={{
          background: "white",
          border: "1px solid var(--cim-border-subtle, #eaebeb)",
          borderRadius: "6px",
          padding: "12px 16px",
          display: "flex",
          alignItems: "flex-start",
          gap: "12px",
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <SearchField
              aria-label="Customer name"
              placeholder="Customer name"
              value={name}
              onChange={setName}
              onSubmit={handleSearch}
              onClear={() => setName("")}
            />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <SearchField
              aria-label="Customer email ID"
              placeholder="Customer email ID"
              value={email}
              onChange={setEmail}
              onSubmit={handleSearch}
              onClear={() => setEmail("")}
              validate={validateEmail}
            />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <SearchField
              aria-label="Customer phone number"
              placeholder="Customer phone number"
              value={phone}
              onChange={setPhone}
              onSubmit={handleSearch}
              onClear={() => setPhone("")}
              validate={validatePhone}
              inputMode="tel"
            />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <SearchField
              aria-label="Customer ID"
              placeholder="Customer ID"
              value={customerId}
              onChange={setCustomerId}
              onSubmit={handleSearch}
              onClear={() => setCustomerId("")}
            />
          </div>
          <Button variant="primary" onPress={handleSearch}>
            Search
          </Button>
        </div>

        {/* Results */}
        {searched && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {sortedResults.length === 0 ? (
              <div style={{
                background: "white",
                border: "1px solid var(--cim-border-subtle)",
                borderRadius: "6px",
                padding: "32px 16px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "8px",
                textAlign: "center",
              }}>
                <p style={{ fontWeight: 600, fontSize: "1rem", color: "var(--cim-fg-warning, #a15e0c)", margin: 0 }}>
                  No results
                </p>
                <p style={{ fontSize: "0.875rem", color: "var(--cim-fg-warning, #a15e0c)", margin: 0 }}>
                  There are no customers that match your search. Please check and try again.
                </p>
              </div>
            ) : (
              <>
                <p style={{ fontWeight: 600, fontSize: "1rem", color: "var(--cim-fg-base)", margin: 0 }}>
                  {sortedResults.length} Search Result{sortedResults.length !== 1 ? "s" : ""}
                </p>
                <div style={{ background: "white", border: "1px solid var(--cim-border-subtle)", borderRadius: "6px", overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        <th style={thStyle}>Name</th>
                        <th style={thStyle}>Email ID</th>
                        <th style={thStyle}>Customer ID</th>
                        <th
                          style={{ ...thStyle, cursor: "pointer", userSelect: "none" }}
                          onClick={handleSortStore}
                        >
                          Store <SortIcon />
                        </th>
                        <th style={{ ...thStyle, width: "80px" }}>Orders</th>
                        <th style={{ ...thStyle, width: "100px" }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedResults.map((c, i) => (
                        <tr
                          key={c.id}
                          style={{ background: i % 2 === 1 ? "var(--cim-bg-subtle, #f8f9fa)" : "white" }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--cim-bg-hover, #eef6fa)")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = i % 2 === 1 ? "var(--cim-bg-subtle, #f8f9fa)" : "white")}
                        >
                          <td style={tdStyle}>{c.name}</td>
                          <td style={tdStyle}>{c.email}</td>
                          <td style={{ ...tdStyle, color: "var(--cim-fg-subtle)", maxWidth: "260px", overflow: "hidden", textOverflow: "ellipsis" }}>{c.id}</td>
                          <td style={tdStyle}>{c.store}</td>
                          <td style={{ ...tdStyle, width: "80px" }}>{c.orderCount}</td>
                          <td style={{ ...tdStyle, width: "100px" }} onClick={(e) => e.stopPropagation()}>
                            <div style={{ display: "flex", gap: "2px", alignItems: "center", justifyContent: "flex-end" }}>
                              <button
                                title="Create order"
                                aria-label={`Create order for ${c.name}`}
                                style={iconBtnStyle}
                                onClick={() => router.push(`/customers/${c.id}/create-order`)}
                                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--cim-bg-hover, #eef6fa)")}
                                onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                              >
                                <CreateOrderIcon />
                              </button>
                              <button
                                title="Order history"
                                aria-label={`View order history for ${c.name}`}
                                style={{ ...iconBtnStyle, color: "var(--cim-fg-accent, #0e7490)" }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--cim-bg-hover, #eef6fa)")}
                                onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                              >
                                <OrderHistoryIcon />
                              </button>
                              <button
                                title="More options"
                                aria-label={`More options for ${c.name}`}
                                style={{ ...iconBtnStyle, color: "var(--cim-fg-subtle, #6b7280)" }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--cim-bg-hover, #eef6fa)")}
                                onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                              >
                                <KebabIcon />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
