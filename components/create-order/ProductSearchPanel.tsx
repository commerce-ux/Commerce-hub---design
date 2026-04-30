"use client";

import { useState } from "react";
import { SearchField } from "@cimpress-ui/react";
import type { ProductCatalogItem, DraftOrderItem } from "@/lib/types";
import { MOCK_PRODUCT_CATALOG } from "@/lib/createOrderMockData";
import { ProductResultsTable } from "./ProductResultsTable";
import { ItemModificationPanel } from "./ItemModificationPanel";
import { OrderItemsList } from "./OrderItemsList";

interface ProductSearchPanelProps {
  draftItems: DraftOrderItem[];
  onAddToOrder: (item: DraftOrderItem) => void;
  onEditItem: (draftItemId: string) => void;
  onRemoveItem: (draftItemId: string) => void;
  onDuplicateItem: (draftItemId: string) => void;
  onQuantityChange: (draftItemId: string, newQty: number) => void;
  onSizeQuantityChange?: (draftItemId: string, size: string, newQty: number) => void;
  onAccessoryRemove: (draftItemId: string, accessoryId: string) => void;
  editingItem: DraftOrderItem | null;
}

function searchProducts(query: string): ProductCatalogItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return MOCK_PRODUCT_CATALOG.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.id.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q)
  );
}

export function ProductSearchPanel({
  draftItems,
  onAddToOrder,
  onEditItem,
  onRemoveItem,
  onDuplicateItem,
  onQuantityChange,
  onSizeQuantityChange,
  onAccessoryRemove,
  editingItem,
}: ProductSearchPanelProps) {
  const [searchQuery, setSearchQuery] = useState(editingItem ? editingItem.product.name : "");
  const [searchResults, setSearchResults] = useState<ProductCatalogItem[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductCatalogItem | null>(
    editingItem ? editingItem.product : null
  );

  function handleSearch() {
    if (!searchQuery.trim()) return;
    const results = searchProducts(searchQuery);
    setSearchResults(results);
    setHasSearched(true);
    setSelectedProduct(null);
  }

  function handleProductSelect(product: ProductCatalogItem) {
    setSelectedProduct(product);
    setSearchResults([]);
    setHasSearched(false);
  }

  function handleAddToOrder(item: DraftOrderItem) {
    onAddToOrder(item);
    // Reset search state after adding
    setSelectedProduct(null);
    setSearchQuery("");
    setSearchResults([]);
    setHasSearched(false);
  }

  function handleCancelModification() {
    setSelectedProduct(null);
    setSearchResults([]);
    setHasSearched(false);
    if (!editingItem) {
      setSearchQuery("");
    }
  }

  function handleEditItem(draftItemId: string) {
    onEditItem(draftItemId);
    // Find the item and select its product
    const item = draftItems.find((i) => i.draftItemId === draftItemId);
    if (item) {
      setSelectedProduct(item.product);
      setSearchQuery(item.product.name);
      setSearchResults([]);
      setHasSearched(false);
    }
  }

  return (
    <div
      style={{
        background: "white",
        border: "1px solid var(--cim-border-subtle, #eaebeb)",
        borderRadius: "6px",
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        boxShadow: "0px 1px 2px rgba(0,0,0,0.08), 0px 2px 4px rgba(0,0,0,0.06), 0px 4px 8px rgba(0,0,0,0.04)",
      }}
    >
      {/* Search field */}
      <SearchField
        aria-label="Search products by name or CIM ID"
        placeholder="Search for product"
        value={searchQuery}
        onChange={(val) => {
          setSearchQuery(val);
          if (!val.trim()) {
            setHasSearched(false);
            setSearchResults([]);
            setSelectedProduct(null);
          }
        }}
        onSubmit={handleSearch}
        onClear={() => {
          setSearchQuery("");
          setHasSearched(false);
          setSearchResults([]);
          setSelectedProduct(null);
        }}
      />

      {/* Show item modification panel when a product is selected */}
      {selectedProduct ? (
        <ItemModificationPanel
          product={selectedProduct}
          initialValues={editingItem && editingItem.product.id === selectedProduct.id ? editingItem : undefined}
          onAddToOrder={handleAddToOrder}
          onCancel={handleCancelModification}
        />
      ) : hasSearched ? (
        <ProductResultsTable
          results={searchResults}
          hasSearched={hasSearched}
          searchQuery={searchQuery}
          onSelect={handleProductSelect}
        />
      ) : null}

      {/* Order items list — always shown below */}
      {draftItems.length > 0 && (
        <OrderItemsList
          items={draftItems}
          onEdit={handleEditItem}
          onRemove={onRemoveItem}
          onDuplicate={onDuplicateItem}
          onQuantityChange={onQuantityChange}
          onSizeQuantityChange={onSizeQuantityChange}
          onAccessoryRemove={onAccessoryRemove}
        />
      )}
    </div>
  );
}
