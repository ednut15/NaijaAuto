"use client";

import { useMemo, useState } from "react";

import type { FeaturedPackageAdmin } from "@/types/domain";

interface FeaturedPackagesManagerProps {
  initialPackages: FeaturedPackageAdmin[];
}

interface PackageResponse {
  package: FeaturedPackageAdmin;
}

interface ErrorResponse {
  error?: string;
}

function getErrorMessage(payload: unknown, fallback: string): string {
  if (payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string") {
    return payload.error;
  }

  return fallback;
}

export function FeaturedPackagesManager({ initialPackages }: FeaturedPackagesManagerProps) {
  const [packages, setPackages] = useState<FeaturedPackageAdmin[]>(initialPackages);
  const [savingByCode, setSavingByCode] = useState<Record<string, boolean>>({});
  const [messageByCode, setMessageByCode] = useState<Record<string, string>>({});
  const [errorByCode, setErrorByCode] = useState<Record<string, string>>({});

  const sortedPackages = useMemo(
    () => [...packages].sort((a, b) => a.amountNgn - b.amountNgn),
    [packages],
  );

  function setPackageField<K extends keyof FeaturedPackageAdmin>(
    code: string,
    key: K,
    value: FeaturedPackageAdmin[K],
  ): void {
    setPackages((current) =>
      current.map((item) => (item.code === code ? { ...item, [key]: value } : item)),
    );
  }

  async function savePackage(code: string): Promise<void> {
    const target = packages.find((item) => item.code === code);
    if (!target) {
      return;
    }

    setSavingByCode((current) => ({ ...current, [code]: true }));
    setMessageByCode((current) => ({ ...current, [code]: "" }));
    setErrorByCode((current) => ({ ...current, [code]: "" }));

    try {
      const response = await fetch(`/api/admin/featured-packages/${encodeURIComponent(code)}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          name: target.name,
          durationDays: target.durationDays,
          amountNgn: target.amountNgn,
          isActive: target.isActive,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as PackageResponse | ErrorResponse;
      if (!response.ok || !("package" in payload)) {
        throw new Error(getErrorMessage(payload, "Unable to save featured package."));
      }

      setPackages((current) =>
        current.map((item) => (item.code === code ? payload.package : item)),
      );
      setMessageByCode((current) => ({ ...current, [code]: "Saved." }));
    } catch (error) {
      setErrorByCode((current) => ({
        ...current,
        [code]: error instanceof Error ? error.message : "Unable to save package.",
      }));
    } finally {
      setSavingByCode((current) => ({ ...current, [code]: false }));
    }
  }

  return (
    <section className="section">
      <div className="filter-panel">
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid var(--line)" }}>
              <th style={{ paddingBottom: 10 }}>Code</th>
              <th style={{ paddingBottom: 10 }}>Name</th>
              <th style={{ paddingBottom: 10 }}>Duration (Days)</th>
              <th style={{ paddingBottom: 10 }}>Amount (NGN)</th>
              <th style={{ paddingBottom: 10 }}>Active</th>
              <th style={{ paddingBottom: 10 }}></th>
            </tr>
          </thead>
          <tbody>
            {sortedPackages.map((pkg) => (
              <tr key={pkg.code} style={{ borderBottom: "1px solid var(--line)" }}>
                <td style={{ padding: "10px 0", fontFamily: "var(--font-ibm-plex-mono)" }}>{pkg.code}</td>
                <td style={{ padding: "10px 0", minWidth: 240 }}>
                  <input
                    className="input"
                    value={pkg.name}
                    onChange={(event) => setPackageField(pkg.code, "name", event.target.value)}
                    minLength={3}
                    maxLength={100}
                  />
                </td>
                <td style={{ padding: "10px 0", minWidth: 140 }}>
                  <input
                    className="input"
                    type="number"
                    min={1}
                    max={90}
                    value={pkg.durationDays}
                    onChange={(event) =>
                      setPackageField(pkg.code, "durationDays", Number(event.target.value))
                    }
                  />
                </td>
                <td style={{ padding: "10px 0", minWidth: 170 }}>
                  <input
                    className="input"
                    type="number"
                    min={1000}
                    step={100}
                    value={pkg.amountNgn}
                    onChange={(event) => setPackageField(pkg.code, "amountNgn", Number(event.target.value))}
                  />
                </td>
                <td style={{ padding: "10px 0" }}>
                  <label style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                    <input
                      type="checkbox"
                      checked={pkg.isActive}
                      onChange={(event) => setPackageField(pkg.code, "isActive", event.target.checked)}
                    />
                    <span>{pkg.isActive ? "Yes" : "No"}</span>
                  </label>
                </td>
                <td style={{ padding: "10px 0" }}>
                  <button
                    className="button"
                    type="button"
                    disabled={savingByCode[pkg.code]}
                    onClick={() => void savePackage(pkg.code)}
                  >
                    {savingByCode[pkg.code] ? "Saving..." : "Save"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {sortedPackages.map((pkg) => (
          <div key={`${pkg.code}-status`} style={{ marginTop: 8 }}>
            {errorByCode[pkg.code] ? (
              <div className="empty-state">{pkg.code}: {errorByCode[pkg.code]}</div>
            ) : null}
            {messageByCode[pkg.code] ? (
              <p style={{ margin: 0, color: "var(--teal-700)" }}>
                {pkg.code}: {messageByCode[pkg.code]}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
