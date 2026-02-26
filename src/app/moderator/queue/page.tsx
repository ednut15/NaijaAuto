import Link from "next/link";

import { marketplaceService } from "@/server/services/container";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Moderation Queue",
  description: "Review and process pending listing submissions within SLA.",
};

export default async function ModeratorQueuePage() {
  const queue = await marketplaceService.getModerationQueue();

  return (
    <div className="page-shell">
      <header className="top-nav">
        <Link className="brand-mark" href="/">
          NaijaAuto Marketplace
        </Link>
      </header>

      <section className="section-head section">
        <div>
          <h2>Moderation Queue</h2>
          <p>{queue.length} listings currently waiting review.</p>
        </div>
      </section>

      <section className="section">
        {queue.length ? (
          <div className="filter-panel">
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ textAlign: "left", borderBottom: "1px solid var(--line)" }}>
                  <th style={{ paddingBottom: 8 }}>Listing</th>
                  <th style={{ paddingBottom: 8 }}>City</th>
                  <th style={{ paddingBottom: 8 }}>Age (min)</th>
                  <th style={{ paddingBottom: 8 }}>SLA Risk</th>
                </tr>
              </thead>
              <tbody>
                {queue.map((item) => (
                  <tr key={item.listing.id} style={{ borderBottom: "1px solid var(--line)" }}>
                    <td style={{ padding: "8px 0" }}>{item.listing.title}</td>
                    <td style={{ padding: "8px 0" }}>
                      {item.listing.city}, {item.listing.state}
                    </td>
                    <td style={{ padding: "8px 0" }}>{item.ageMinutes}</td>
                    <td style={{ padding: "8px 0", textTransform: "uppercase" }}>{item.slaRisk}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">Moderation queue is clear.</div>
        )}
      </section>
    </div>
  );
}
