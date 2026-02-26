import Link from "next/link";

import { requireServerUser } from "@/lib/auth";
import { marketplaceService } from "@/server/services/container";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Moderation Queue",
  description: "Review and process pending listing submissions within SLA.",
};

export default async function ModeratorQueuePage() {
  let user;
  let accessError: string | null = null;

  try {
    user = await requireServerUser(["moderator", "super_admin"]);
  } catch (error) {
    accessError = error instanceof Error ? error.message : "Unable to load moderation dashboard.";
  }

  if (!user) {
    return (
      <div className="page-shell">
        <header className="top-nav">
          <Link className="brand-mark" href="/">
            NaijaAuto Marketplace
          </Link>
          <nav className="nav-links">
            <Link className="nav-link" href="/sign-in?next=/moderator/queue">
              Sign In
            </Link>
          </nav>
        </header>

        <section className="section">
          <div className="empty-state">
            <h2 style={{ marginTop: 0 }}>Moderator access required</h2>
            <p>{accessError ?? "Sign in with a moderator or super admin account to continue."}</p>
          </div>
        </section>
      </div>
    );
  }

  const dashboard = await marketplaceService.getModerationSlaDashboard(user);
  const { queue, metrics, throughputByDay } = dashboard;

  return (
    <div className="page-shell">
      <header className="top-nav">
        <Link className="brand-mark" href="/">
          NaijaAuto Marketplace
        </Link>
        <nav className="nav-links">
          <Link className="nav-link" href="/admin/packages">
            Admin Packages
          </Link>
          <Link className="nav-link" href="/sign-out">
            Sign Out
          </Link>
        </nav>
      </header>

      <section className="section-head section">
        <div>
          <h2>Moderation Queue</h2>
          <p>{metrics.totalPending} listings currently waiting review.</p>
        </div>
      </section>

      <section className="section">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 10,
          }}
        >
          <div className="filter-panel">
            <strong>{metrics.breachedOver120Count}</strong>
            <p style={{ margin: "6px 0 0", color: "var(--muted)" }}>Breached over 120min</p>
          </div>
          <div className="filter-panel">
            <strong>{metrics.highRiskCount}</strong>
            <p style={{ margin: "6px 0 0", color: "var(--muted)" }}>High risk queue items</p>
          </div>
          <div className="filter-panel">
            <strong>{metrics.averageAgeMinutes} min</strong>
            <p style={{ margin: "6px 0 0", color: "var(--muted)" }}>Average queue age</p>
          </div>
          <div className="filter-panel">
            <strong>{metrics.oldestAgeMinutes} min</strong>
            <p style={{ margin: "6px 0 0", color: "var(--muted)" }}>Oldest pending age</p>
          </div>
          <div className="filter-panel">
            <strong>{metrics.processedLast24h}</strong>
            <p style={{ margin: "6px 0 0", color: "var(--muted)" }}>Processed in 24h</p>
          </div>
          <div className="filter-panel">
            <strong>{metrics.processedLast7d}</strong>
            <p style={{ margin: "6px 0 0", color: "var(--muted)" }}>Processed in 7d</p>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="filter-panel">
          <h3 style={{ marginTop: 0 }}>Queue Age Distribution</h3>
          <p style={{ marginTop: 6, color: "var(--muted)" }}>
            &lt;60m: {metrics.queueAgeDistribution.under60} • 60-119m:{" "}
            {metrics.queueAgeDistribution.between60And119} • 120-179m:{" "}
            {metrics.queueAgeDistribution.between120And179} • 180m+: {metrics.queueAgeDistribution.over180}
          </p>
        </div>
      </section>

      <section className="section">
        <div className="filter-panel">
          <h3 style={{ marginTop: 0 }}>Throughput Trend (Last 7 Days)</h3>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid var(--line)" }}>
                <th style={{ paddingBottom: 8 }}>Date</th>
                <th style={{ paddingBottom: 8 }}>Approved</th>
                <th style={{ paddingBottom: 8 }}>Rejected</th>
                <th style={{ paddingBottom: 8 }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {throughputByDay.map((point) => (
                <tr key={point.date} style={{ borderBottom: "1px solid var(--line)" }}>
                  <td style={{ padding: "8px 0" }}>{point.date}</td>
                  <td style={{ padding: "8px 0" }}>{point.approved}</td>
                  <td style={{ padding: "8px 0" }}>{point.rejected}</td>
                  <td style={{ padding: "8px 0" }}>{point.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
