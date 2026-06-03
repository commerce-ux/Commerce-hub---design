"use client";

import { useState } from "react";
import { Button, Drawer, DrawerBody, DrawerActions } from "@cimpress-ui/react";

export interface PreviousArtwork {
  id: string;
  name: string;       // e.g. "Artwork 1"
  orderId: string;    // e.g. "1230123123"
  uploadDate: string; // e.g. "23 March 2026"
  thumbnailUrl: string;
}

/** Generates an inline SVG data URI — no network, always renders */
function logo(bg: string, text: string, textColor = "white"): string {
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="240" viewBox="0 0 300 240">`,
    `<rect width="300" height="240" fill="${bg}"/>`,
    `<text x="150" y="120" font-size="72" font-family="Arial,Helvetica,sans-serif" font-weight="bold"`,
    ` text-anchor="middle" dominant-baseline="middle" fill="${textColor}">${text}</text>`,
    `</svg>`,
  ].join("");
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export const MOCK_PREVIOUS_ARTWORKS: PreviousArtwork[] = [
  { id: "art-1",  name: "Artwork 1",  orderId: "1230000001", uploadDate: "1 March 2026",   thumbnailUrl: logo("#555555", "🍎") },
  { id: "art-2",  name: "Artwork 2",  orderId: "1230000002", uploadDate: "8 March 2026",   thumbnailUrl: logo("#4285F4", "G") },
  { id: "art-3",  name: "Artwork 3",  orderId: "1230000003", uploadDate: "15 March 2026",  thumbnailUrl: logo("#00A4EF", "M") },
  { id: "art-4",  name: "Artwork 4",  orderId: "1230123123", uploadDate: "23 March 2026",  thumbnailUrl: logo("#FF9900", "a") },
  { id: "art-5",  name: "Artwork 5",  orderId: "1230456789", uploadDate: "5 April 2026",   thumbnailUrl: logo("#111111", "N") },
  { id: "art-6",  name: "Artwork 6",  orderId: "1230567890", uploadDate: "12 April 2026",  thumbnailUrl: logo("#00704A", "S") },
  { id: "art-7",  name: "Artwork 7",  orderId: "1230678901", uploadDate: "19 April 2026",  thumbnailUrl: logo("#E50914", "N") },
  { id: "art-8",  name: "Artwork 8",  orderId: "1230789012", uploadDate: "26 April 2026",  thumbnailUrl: logo("#1DB954", "S") },
  { id: "art-9",  name: "Artwork 9",  orderId: "1230890123", uploadDate: "3 May 2026",     thumbnailUrl: logo("#CC0000", "T") },
  { id: "art-10", name: "Artwork 10", orderId: "1230901234", uploadDate: "10 May 2026",    thumbnailUrl: logo("#FF5A5F", "A") },
  { id: "art-11", name: "Artwork 11", orderId: "1231012345", uploadDate: "17 May 2026",    thumbnailUrl: logo("#4A154B", "S") },
  { id: "art-12", name: "Artwork 12", orderId: "1231123456", uploadDate: "24 May 2026",    thumbnailUrl: logo("#0057FF", "P") },
];

interface PreviousArtworkModalProps {
  onConfirm: (artwork: PreviousArtwork) => void;
  onCancel: () => void;
}

export function PreviousArtworkModal({ onConfirm, onCancel }: PreviousArtworkModalProps) {
  // Default to first artwork selected, matching the Figma footer "Selected: Artwork 1"
  const [selectedId, setSelectedId] = useState<string>(MOCK_PREVIOUS_ARTWORKS[0].id);

  const selected = MOCK_PREVIOUS_ARTWORKS.find((a) => a.id === selectedId) ?? MOCK_PREVIOUS_ARTWORKS[0];

  return (
    <Drawer
      title="Select previous artwork"
      size="medium"
      isOpen
      onOpenChange={(open) => { if (!open) onCancel(); }}
    >
      <DrawerBody>
        {/* 4-column artwork grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "24px",
        }}>
          {MOCK_PREVIOUS_ARTWORKS.map((art) => {
            const isSelected = art.id === selectedId;
            return (
              <button
                key={art.id}
                onClick={() => setSelectedId(art.id)}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0",
                  border: "none",
                  background: "none",
                  padding: 0,
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                {/* Image area with radio button */}
                <div style={{
                  position: "relative",
                  width: "100%",
                  aspectRatio: "134 / 119",
                  borderRadius: "6px",
                  overflow: "hidden",
                  border: isSelected
                    ? "2px solid var(--cim-fg-accent, #0091b8)"
                    : "1.5px solid var(--cim-border-base, #dadcdd)",
                  marginBottom: "8px",
                }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={art.thumbnailUrl}
                    alt={art.name}
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  />
                  {/* Radio button — top-left corner of image */}
                  <div style={{
                    position: "absolute",
                    top: "8px",
                    left: "8px",
                    width: "16px",
                    height: "16px",
                    borderRadius: "50%",
                    background: isSelected ? "var(--cim-fg-accent, #0091b8)" : "white",
                    border: isSelected ? "none" : "1.5px solid var(--cim-border-base, #dadcdd)",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.18)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}>
                    {isSelected && (
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: "white" }} />
                    )}
                  </div>
                </div>

                {/* Artwork name */}
                <span style={{
                  fontSize: "0.875rem",
                  fontWeight: 400,
                  lineHeight: "20px",
                  color: "var(--cim-fg-base, #15191d)",
                  display: "block",
                }}>
                  {art.name}
                </span>
                {/* Date */}
                <span style={{
                  fontSize: "0.875rem",
                  lineHeight: "20px",
                  color: "var(--cim-fg-subtle, #5f6469)",
                  display: "block",
                }}>
                  {art.uploadDate}
                </span>
                {/* Order number */}
                <span style={{
                  fontSize: "0.875rem",
                  lineHeight: "20px",
                  color: "var(--cim-fg-subtle, #5f6469)",
                  display: "block",
                }}>
                  Order: {art.orderId}
                </span>
              </button>
            );
          })}
        </div>
      </DrawerBody>

      <DrawerActions>
        {/* Left: selected artwork info */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "2px" }}>
          <span style={{ fontSize: "1rem", fontWeight: 400, color: "var(--cim-fg-base, #15191d)", lineHeight: "24px" }}>
            Selected: <strong>{selected.name}</strong>
          </span>
          <span style={{ fontSize: "0.875rem", color: "var(--cim-fg-subtle, #5f6469)", lineHeight: "16px" }}>
            {selected.uploadDate}
          </span>
        </div>
        {/* Right: action buttons */}
        <Button variant="secondary" onPress={onCancel}>Cancel</Button>
        <Button
          variant="primary"
          onPress={() => onConfirm(selected)}
        >
          Use this artwork
        </Button>
      </DrawerActions>
    </Drawer>
  );
}
