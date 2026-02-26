"use client";

import type { ContactChannel } from "@/types/domain";

interface ContactActionLinksProps {
  listingIdentifier: string;
  contactPhone: string;
  contactWhatsapp: string;
}

function buildContactClickUrl(identifier: string): string {
  return `/api/listings/${encodeURIComponent(identifier)}/contact-click`;
}

function trackContactClick(identifier: string, channel: ContactChannel): void {
  const url = buildContactClickUrl(identifier);
  const payload = JSON.stringify({ channel });

  if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
    const body = new Blob([payload], { type: "application/json" });
    navigator.sendBeacon(url, body);
    return;
  }

  void fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: payload,
    keepalive: true,
    credentials: "same-origin",
  }).catch(() => {
    // Contact navigation should not fail if analytics tracking fails.
  });
}

export function ContactActionLinks({
  listingIdentifier,
  contactPhone,
  contactWhatsapp,
}: ContactActionLinksProps) {
  return (
    <>
      <a
        className="button"
        href={`tel:${contactPhone}`}
        onClick={() => trackContactClick(listingIdentifier, "phone")}
      >
        Call Seller
      </a>
      <a
        className="button secondary"
        href={`https://wa.me/${contactWhatsapp.replace(/\D/g, "")}`}
        target="_blank"
        rel="noreferrer"
        onClick={() => trackContactClick(listingIdentifier, "whatsapp")}
      >
        WhatsApp Seller
      </a>
    </>
  );
}
