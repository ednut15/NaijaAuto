import Link from "next/link";

import { ListingCard } from "@/components/listing-card";
import { demoUsers } from "@/data/demo";
import { marketplaceService } from "@/server/services/container";

export const dynamic = "force-dynamic";

const sandboxSeller = {
  id: demoUsers.sellerDealer.id,
  role: "seller" as const,
  sellerType: "dealer" as const,
  phoneVerified: true,
  email: demoUsers.sellerDealer.email,
};

export const metadata = {
  title: "Seller Dashboard",
  description: "Manage drafts, approvals, and featured listing checkout.",
};

export default async function SellerDashboardPage() {
  const dashboard = await marketplaceService.getSellerDashboard(sandboxSeller);

  return (
    <div className="page-shell">
      <header className="top-nav">
        <Link className="brand-mark" href="/">
          NaijaAuto Marketplace
        </Link>
      </header>

      <section className="section-head section">
        <div>
          <h2>Seller Dashboard (MVP Sandbox)</h2>
          <p>Using seeded seller context for local development flow validation.</p>
        </div>
      </section>

      <section className="section">
        <h3 style={{ marginBottom: 10 }}>My Listings</h3>
        {dashboard.listings.length ? (
          <div className="card-grid">
            {dashboard.listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        ) : (
          <div className="empty-state">You do not have any listing yet.</div>
        )}
      </section>

      <section className="section">
        <h3 style={{ marginBottom: 8 }}>Notifications</h3>
        {dashboard.notifications.length ? (
          <ul className="detail-list">
            {dashboard.notifications.map((note) => (
              <li key={note.id}>
                <strong>{note.title}:</strong> {note.body}
              </li>
            ))}
          </ul>
        ) : (
          <div className="empty-state">No notifications yet.</div>
        )}
      </section>
    </div>
  );
}
