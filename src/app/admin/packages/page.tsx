import Link from "next/link";

import { FeaturedPackagesManager } from "@/app/admin/packages/featured-packages-manager";
import { requireServerUser } from "@/lib/auth";
import { marketplaceService } from "@/server/services/container";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Admin Featured Packages",
  description: "Configure featured listing package pricing and availability.",
};

export default async function AdminFeaturedPackagesPage() {
  let user;
  let accessError: string | null = null;

  try {
    user = await requireServerUser(["super_admin"]);
  } catch (error) {
    accessError = error instanceof Error ? error.message : "Unable to load admin package manager.";
  }

  if (!user) {
    return (
      <div className="page-shell">
        <header className="top-nav">
          <Link className="brand-mark" href="/">
            NaijaAuto Marketplace
          </Link>
        </header>

        <section className="section">
          <div className="empty-state">
            <h2 style={{ marginTop: 0 }}>Super admin access required</h2>
            <p>{accessError ?? "Sign in with a super admin account to continue."}</p>
          </div>
        </section>
      </div>
    );
  }

  const packages = await marketplaceService.listFeaturedPackagesForAdmin(user);

  return (
    <div className="page-shell">
      <header className="top-nav">
        <Link className="brand-mark" href="/">
          NaijaAuto Marketplace
        </Link>
      </header>

      <section className="section-head section">
        <div>
          <h2>Featured Package Management</h2>
          <p>Adjust package price, duration, and activation state for seller boosts.</p>
        </div>
      </section>

      <FeaturedPackagesManager initialPackages={packages} />
    </div>
  );
}
