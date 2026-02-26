import { describe, expect, it } from "vitest";

import { getCoordinateBounds, projectCoordinate, projectCoordinatePoints } from "@/lib/map";

describe("map projection helpers", () => {
  it("expands bounds when coordinates are identical", () => {
    const bounds = getCoordinateBounds([
      { lat: 6.4698, lng: 3.5852 },
      { lat: 6.4698, lng: 3.5852 },
    ]);

    expect(bounds.maxLat - bounds.minLat).toBeGreaterThan(0);
    expect(bounds.maxLng - bounds.minLng).toBeGreaterThan(0);
  });

  it("projects coordinates into padded viewport percentages", () => {
    const bounds = getCoordinateBounds([
      { lat: 6.4, lng: 3.3 },
      { lat: 9.1, lng: 7.5 },
    ]);

    const projected = projectCoordinate({ lat: 6.4, lng: 3.3 }, bounds);

    expect(projected.leftPercent).toBeGreaterThanOrEqual(8);
    expect(projected.leftPercent).toBeLessThanOrEqual(92);
    expect(projected.topPercent).toBeGreaterThanOrEqual(8);
    expect(projected.topPercent).toBeLessThanOrEqual(92);
  });

  it("preserves item order while appending projected coordinates", () => {
    const items = [
      { id: "a", lat: 6.6, lng: 3.4 },
      { id: "b", lat: 9.0, lng: 7.4 },
    ];

    const projected = projectCoordinatePoints(items);

    expect(projected[0].id).toBe("a");
    expect(projected[1].id).toBe("b");
    expect(typeof projected[0].leftPercent).toBe("number");
    expect(typeof projected[0].topPercent).toBe("number");
  });
});
