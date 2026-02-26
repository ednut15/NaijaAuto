import Link from "next/link";

import { projectCoordinatePoints } from "@/lib/map";

interface ListingsMapBoardItem {
  id: string;
  slug: string;
  title: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
}

interface ListingsMapBoardProps {
  items: ListingsMapBoardItem[];
}

export function ListingsMapBoard({ items }: ListingsMapBoardProps) {
  if (!items.length) {
    return (
      <section className="section map-board">
        <h3 style={{ marginTop: 0 }}>Map Pins</h3>
        <p style={{ color: "var(--muted)", marginTop: 0 }}>
          No coordinates to map for this filter set yet.
        </p>
      </section>
    );
  }

  const projected = projectCoordinatePoints(items);

  return (
    <section className="section map-board">
      <div className="section-head" style={{ marginBottom: 8 }}>
        <div>
          <h3 style={{ margin: 0 }}>Map Pins</h3>
          <p style={{ color: "var(--muted)", margin: "4px 0 0" }}>
            Click pins to open listing details. Coordinates are projected for a fast, interactive map view.
          </p>
        </div>
      </div>

      <div
        className="map-board__surface"
        role="img"
        aria-label={`Mapped locations for ${projected.length} listing${projected.length > 1 ? "s" : ""}.`}
      >
        <div className="map-board__grid" aria-hidden />
        {projected.map((item, index) => (
          <Link
            key={item.id}
            href={`/listings/${item.slug}`}
            className="map-board__pin"
            style={{
              left: `${item.leftPercent}%`,
              top: `${item.topPercent}%`,
            }}
            aria-label={`${item.title} in ${item.city}, ${item.state}`}
            title={item.title}
          >
            <span className="map-board__pin-index">{index + 1}</span>
            <span className="map-board__pin-tooltip">{item.title}</span>
          </Link>
        ))}
      </div>

      <ol className="map-board__list">
        {projected.slice(0, 10).map((item, index) => (
          <li key={`${item.id}-map-row`}>
            <strong>{index + 1}.</strong>{" "}
            <Link href={`/listings/${item.slug}`}>{item.title}</Link> ({item.city}, {item.state}) ·{" "}
            <a
              href={`https://maps.google.com/?q=${item.lat},${item.lng}`}
              target="_blank"
              rel="noreferrer"
            >
              Open in Google Maps
            </a>
          </li>
        ))}
      </ol>
    </section>
  );
}
