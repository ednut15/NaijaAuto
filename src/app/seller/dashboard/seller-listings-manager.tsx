"use client";

import { FormEvent, useMemo, useState } from "react";

import type { FeaturedPackage, Listing } from "@/types/domain";

const MIN_SUBMIT_PHOTOS = 15;
const MAX_PHOTOS = 30;

interface ListingResponse {
  listing: Listing;
}

interface FeaturedCheckoutResponse {
  checkoutUrl: string;
  accessCode: string;
  reference: string;
  amountNgn: number;
}

function getErrorMessage(payload: unknown, fallback: string): string {
  if (payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string") {
    return payload.error;
  }

  return fallback;
}

function toNumber(value: FormDataEntryValue | null): number {
  return typeof value === "string" ? Number(value) : Number.NaN;
}

function canEditListing(listing: Listing): boolean {
  return listing.status === "draft" || listing.status === "rejected";
}

function statusTone(status: Listing["status"]): string {
  switch (status) {
    case "approved":
      return "#0f5f67";
    case "pending_review":
      return "#7a5a00";
    case "rejected":
      return "#8a2d2d";
    default:
      return "#3a5257";
  }
}

interface SellerListingsManagerProps {
  initialListings: Listing[];
  featuredPackages: FeaturedPackage[];
}

interface ListingEditorProps {
  listing: Listing;
  onSaved: (listing: Listing) => void;
  onCancel: () => void;
}

interface UploadResponse {
  photo: {
    url: string;
  };
}

const NGN_FORMATTER = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

function formatNgn(amount: number): string {
  return NGN_FORMATTER.format(amount);
}

function ListingEditor({ listing, onSaved, onCancel }: ListingEditorProps) {
  const [photos, setPhotos] = useState<string[]>(listing.photos);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const photosRemaining = useMemo(() => Math.max(0, MIN_SUBMIT_PHOTOS - photos.length), [photos.length]);

  async function uploadFiles(fileList: FileList | null): Promise<void> {
    if (!fileList || fileList.length === 0) {
      return;
    }

    const remainingCapacity = MAX_PHOTOS - photos.length;
    if (remainingCapacity <= 0) {
      setError(`Maximum ${MAX_PHOTOS} photos allowed.`);
      return;
    }

    const files = Array.from(fileList).slice(0, remainingCapacity);
    setError(null);
    setSuccess(null);
    setIsUploading(true);

    try {
      for (const file of files) {
        const body = new FormData();
        body.set("file", file);

        const response = await fetch("/api/uploads/listing-photo", {
          method: "POST",
          body,
        });

        const payload = (await response.json().catch(() => ({}))) as UploadResponse | { error?: string };
        if (!response.ok) {
          throw new Error(getErrorMessage(payload, "Unable to upload image."));
        }

        if (!("photo" in payload) || !payload.photo?.url) {
          throw new Error("Upload response missing photo URL.");
        }

        setPhotos((current) => [...current, payload.photo.url]);
      }
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Photo upload failed.");
    } finally {
      setIsUploading(false);
    }
  }

  function removePhoto(index: number): void {
    setPhotos((current) => current.filter((_, idx) => idx !== index));
  }

  async function handleSave(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSaving(true);

    const formData = new FormData(event.currentTarget);

    const payload = {
      title: String(formData.get("title") ?? ""),
      description: String(formData.get("description") ?? ""),
      priceNgn: toNumber(formData.get("priceNgn")),
      year: toNumber(formData.get("year")),
      make: String(formData.get("make") ?? ""),
      model: String(formData.get("model") ?? ""),
      bodyType: String(formData.get("bodyType") ?? ""),
      mileageKm: toNumber(formData.get("mileageKm")),
      transmission: String(formData.get("transmission") ?? ""),
      fuelType: String(formData.get("fuelType") ?? ""),
      vin: String(formData.get("vin") ?? ""),
      state: String(formData.get("state") ?? ""),
      city: String(formData.get("city") ?? ""),
      lat: toNumber(formData.get("lat")),
      lng: toNumber(formData.get("lng")),
      contactPhone: String(formData.get("contactPhone") ?? ""),
      contactWhatsapp: String(formData.get("contactWhatsapp") ?? ""),
      photos,
    };

    try {
      const response = await fetch(`/api/listings/${listing.id}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = (await response.json().catch(() => ({}))) as ListingResponse | { error?: string };
      if (!response.ok || !("listing" in result)) {
        throw new Error(getErrorMessage(result, "Unable to save listing changes."));
      }

      onSaved(result.listing);
      setSuccess("Listing changes saved.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save listing.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="filter-panel" style={{ marginTop: 10 }}>
      {error ? <div className="empty-state" style={{ marginBottom: 10 }}>{error}</div> : null}
      {success ? <div className="filter-panel" style={{ marginBottom: 10 }}>{success}</div> : null}

      <form onSubmit={handleSave}>
        <div className="filter-grid">
          <div>
            <label className="label" htmlFor={`title-${listing.id}`}>
              Title
            </label>
            <input
              className="input"
              id={`title-${listing.id}`}
              name="title"
              required
              minLength={10}
              maxLength={120}
              defaultValue={listing.title}
            />
          </div>

          <div>
            <label className="label" htmlFor={`make-${listing.id}`}>
              Make
            </label>
            <input className="input" id={`make-${listing.id}`} name="make" required defaultValue={listing.make} />
          </div>

          <div>
            <label className="label" htmlFor={`model-${listing.id}`}>
              Model
            </label>
            <input className="input" id={`model-${listing.id}`} name="model" required defaultValue={listing.model} />
          </div>

          <div>
            <label className="label" htmlFor={`year-${listing.id}`}>
              Year
            </label>
            <input
              className="input"
              id={`year-${listing.id}`}
              name="year"
              type="number"
              required
              min={1980}
              max={new Date().getFullYear() + 1}
              defaultValue={listing.year}
            />
          </div>

          <div>
            <label className="label" htmlFor={`price-${listing.id}`}>
              Price (NGN)
            </label>
            <input
              className="input"
              id={`price-${listing.id}`}
              name="priceNgn"
              type="number"
              required
              min={500000}
              step={1}
              defaultValue={listing.priceNgn}
            />
          </div>

          <div>
            <label className="label" htmlFor={`body-${listing.id}`}>
              Body Type
            </label>
            <select className="select" id={`body-${listing.id}`} name="bodyType" defaultValue={listing.bodyType}>
              <option value="car">Car</option>
              <option value="suv">SUV</option>
              <option value="pickup">Pickup</option>
            </select>
          </div>

          <div>
            <label className="label" htmlFor={`mileage-${listing.id}`}>
              Mileage (km)
            </label>
            <input
              className="input"
              id={`mileage-${listing.id}`}
              name="mileageKm"
              type="number"
              required
              min={0}
              step={1}
              defaultValue={listing.mileageKm}
            />
          </div>

          <div>
            <label className="label" htmlFor={`transmission-${listing.id}`}>
              Transmission
            </label>
            <select
              className="select"
              id={`transmission-${listing.id}`}
              name="transmission"
              defaultValue={listing.transmission}
            >
              <option value="automatic">Automatic</option>
              <option value="manual">Manual</option>
            </select>
          </div>

          <div>
            <label className="label" htmlFor={`fuel-${listing.id}`}>
              Fuel Type
            </label>
            <select className="select" id={`fuel-${listing.id}`} name="fuelType" defaultValue={listing.fuelType}>
              <option value="petrol">Petrol</option>
              <option value="diesel">Diesel</option>
              <option value="hybrid">Hybrid</option>
              <option value="electric">Electric</option>
            </select>
          </div>

          <div>
            <label className="label" htmlFor={`vin-${listing.id}`}>
              VIN
            </label>
            <input
              className="input"
              id={`vin-${listing.id}`}
              name="vin"
              required
              minLength={17}
              maxLength={17}
              defaultValue={listing.vin}
            />
          </div>

          <div>
            <label className="label" htmlFor={`state-${listing.id}`}>
              State
            </label>
            <input className="input" id={`state-${listing.id}`} name="state" required defaultValue={listing.state} />
          </div>

          <div>
            <label className="label" htmlFor={`city-${listing.id}`}>
              City
            </label>
            <input className="input" id={`city-${listing.id}`} name="city" required defaultValue={listing.city} />
          </div>

          <div>
            <label className="label" htmlFor={`lat-${listing.id}`}>
              Latitude
            </label>
            <input
              className="input"
              id={`lat-${listing.id}`}
              name="lat"
              type="number"
              required
              step="0.000001"
              defaultValue={listing.lat}
            />
          </div>

          <div>
            <label className="label" htmlFor={`lng-${listing.id}`}>
              Longitude
            </label>
            <input
              className="input"
              id={`lng-${listing.id}`}
              name="lng"
              type="number"
              required
              step="0.000001"
              defaultValue={listing.lng}
            />
          </div>

          <div>
            <label className="label" htmlFor={`phone-${listing.id}`}>
              Contact Phone
            </label>
            <input
              className="input"
              id={`phone-${listing.id}`}
              name="contactPhone"
              required
              defaultValue={listing.contactPhone}
            />
          </div>

          <div>
            <label className="label" htmlFor={`whatsapp-${listing.id}`}>
              WhatsApp
            </label>
            <input
              className="input"
              id={`whatsapp-${listing.id}`}
              name="contactWhatsapp"
              required
              defaultValue={listing.contactWhatsapp}
            />
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <label className="label" htmlFor={`description-${listing.id}`}>
            Description
          </label>
          <textarea
            className="input"
            id={`description-${listing.id}`}
            name="description"
            rows={4}
            required
            minLength={40}
            defaultValue={listing.description}
          />
        </div>

        <div style={{ marginTop: 12 }}>
          <label className="label" htmlFor={`photos-${listing.id}`}>
            Photos ({photos.length}/{MAX_PHOTOS})
          </label>
          <input
            className="input"
            id={`photos-${listing.id}`}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={(event) => void uploadFiles(event.target.files)}
            disabled={isUploading || isSaving}
          />
          <p style={{ margin: "8px 0 0", color: "var(--muted)", fontSize: "0.85rem" }}>
            {photos.length >= MIN_SUBMIT_PHOTOS
              ? "Photo requirement satisfied."
              : `Upload ${photosRemaining} more photo(s) to submit.`}
          </p>
        </div>

        {photos.length ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))",
              gap: 8,
              marginTop: 10,
            }}
          >
            {photos.map((url, index) => (
              <div key={`${url}-${index}`} style={{ position: "relative", border: "1px solid var(--line)", borderRadius: 10 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={`Listing photo ${index + 1}`}
                  style={{ width: "100%", height: 80, objectFit: "cover", borderRadius: 10 }}
                />
                <button
                  type="button"
                  onClick={() => removePhoto(index)}
                  style={{
                    position: "absolute",
                    top: 4,
                    right: 4,
                    borderRadius: 999,
                    border: "none",
                    background: "rgba(0,0,0,0.7)",
                    color: "#fff",
                    padding: "2px 8px",
                    cursor: "pointer",
                  }}
                  aria-label={`Remove photo ${index + 1}`}
                >
                  x
                </button>
              </div>
            ))}
          </div>
        ) : null}

        <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="button" type="submit" disabled={isSaving || isUploading}>
            {isSaving ? "Saving..." : isUploading ? "Uploading..." : "Save Changes"}
          </button>
          <button className="button secondary" type="button" onClick={onCancel} disabled={isSaving || isUploading}>
            Close
          </button>
        </div>
      </form>
    </div>
  );
}

export function SellerListingsManager({ initialListings, featuredPackages }: SellerListingsManagerProps) {
  const [listings, setListings] = useState<Listing[]>(initialListings);
  const [editingListingId, setEditingListingId] = useState<string | null>(null);
  const [submittingListingId, setSubmittingListingId] = useState<string | null>(null);
  const [featuringListingId, setFeaturingListingId] = useState<string | null>(null);
  const [errorByListing, setErrorByListing] = useState<Record<string, string>>({});
  const [successByListing, setSuccessByListing] = useState<Record<string, string>>({});
  const [selectedPackageByListing, setSelectedPackageByListing] = useState<Record<string, string>>(() => {
    const defaults: Record<string, string> = {};
    const firstCode = featuredPackages[0]?.code;
    if (!firstCode) {
      return defaults;
    }

    for (const listing of initialListings) {
      defaults[listing.id] = firstCode;
    }

    return defaults;
  });

  if (!listings.length) {
    return (
      <section className="section">
        <div className="empty-state">Create your first listing to manage drafts and moderation states here.</div>
      </section>
    );
  }

  async function submitListing(listingId: string): Promise<void> {
    const listing = listings.find((item) => item.id === listingId);
    if (!listing) {
      return;
    }

    if (listing.photos.length < MIN_SUBMIT_PHOTOS) {
      setErrorByListing((current) => ({
        ...current,
        [listingId]: `At least ${MIN_SUBMIT_PHOTOS} photos are required before submission.`,
      }));
      return;
    }

    setSubmittingListingId(listingId);
    setErrorByListing((current) => ({ ...current, [listingId]: "" }));
    setSuccessByListing((current) => ({ ...current, [listingId]: "" }));

    try {
      const response = await fetch(`/api/listings/${listingId}/submit`, {
        method: "POST",
      });

      const payload = (await response.json().catch(() => ({}))) as ListingResponse | { error?: string };
      if (!response.ok || !("listing" in payload)) {
        throw new Error(getErrorMessage(payload, "Unable to submit listing."));
      }

      setListings((current) => current.map((item) => (item.id === listingId ? payload.listing : item)));
      setSuccessByListing((current) => ({
        ...current,
        [listingId]: "Listing submitted for moderation.",
      }));
      setEditingListingId(null);
    } catch (submitError) {
      setErrorByListing((current) => ({
        ...current,
        [listingId]: submitError instanceof Error ? submitError.message : "Unable to submit listing.",
      }));
    } finally {
      setSubmittingListingId(null);
    }
  }

  async function startFeaturedCheckout(listingId: string): Promise<void> {
    const listing = listings.find((item) => item.id === listingId);
    if (!listing || listing.status !== "approved") {
      return;
    }

    const packageCode = selectedPackageByListing[listingId] ?? featuredPackages[0]?.code;
    if (!packageCode) {
      setErrorByListing((current) => ({
        ...current,
        [listingId]: "No featured package is currently available.",
      }));
      return;
    }

    setFeaturingListingId(listingId);
    setErrorByListing((current) => ({ ...current, [listingId]: "" }));
    setSuccessByListing((current) => ({ ...current, [listingId]: "" }));

    try {
      const response = await fetch("/api/featured/checkout", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          listingId,
          packageCode,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as
        | FeaturedCheckoutResponse
        | { error?: string };

      if (!response.ok || !("checkoutUrl" in payload)) {
        throw new Error(getErrorMessage(payload, "Unable to initialize featured checkout."));
      }

      setSuccessByListing((current) => ({
        ...current,
        [listingId]: "Redirecting to secure payment checkout...",
      }));
      window.location.assign(payload.checkoutUrl);
    } catch (checkoutError) {
      setErrorByListing((current) => ({
        ...current,
        [listingId]:
          checkoutError instanceof Error
            ? checkoutError.message
            : "Unable to start featured checkout.",
      }));
    } finally {
      setFeaturingListingId(null);
    }
  }

  function handleSavedListing(updated: Listing): void {
    setListings((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    setSuccessByListing((current) => ({
      ...current,
      [updated.id]: "Listing changes saved.",
    }));
    setErrorByListing((current) => ({ ...current, [updated.id]: "" }));
  }

  return (
    <section className="section">
      <div className="section-head">
        <div>
          <h3>Manage Listings and Featured Boosts</h3>
          <p>Edit drafts, resubmit rejected listings, and boost approved listings.</p>
        </div>
      </div>

      <div className="section" style={{ marginTop: 0 }}>
        {listings.map((listing) => {
          const editable = canEditListing(listing);
          const isEditing = editingListingId === listing.id;
          const isSubmitting = submittingListingId === listing.id;
          const isFeaturing = featuringListingId === listing.id;
          const photosShort = listing.photos.length < MIN_SUBMIT_PHOTOS;
          const canFeature = listing.status === "approved";
          const selectedPackageCode = selectedPackageByListing[listing.id] ?? featuredPackages[0]?.code ?? "";

          return (
            <div key={listing.id} className="filter-panel" style={{ marginBottom: 12 }}>
              <div className="section-head" style={{ marginBottom: 8 }}>
                <div>
                  <h4 style={{ margin: 0 }}>{listing.title}</h4>
                  <p style={{ marginTop: 4 }}>
                    Status:{" "}
                    <span style={{ color: statusTone(listing.status), fontWeight: 700 }}>
                      {listing.status.replace("_", " ")}
                    </span>{" "}
                    • Photos: {listing.photos.length}
                  </p>
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {editable ? (
                    <button
                      className="button secondary"
                      type="button"
                      onClick={() => setEditingListingId(isEditing ? null : listing.id)}
                    >
                      {isEditing ? "Hide Editor" : "Edit Listing"}
                    </button>
                  ) : null}

                  {editable ? (
                    <button
                      className="button"
                      type="button"
                      disabled={isSubmitting || photosShort}
                      onClick={() => void submitListing(listing.id)}
                    >
                      {isSubmitting ? "Submitting..." : "Resubmit"}
                    </button>
                  ) : null}
                </div>
              </div>

              {canFeature ? (
                <div className="filter-panel" style={{ marginBottom: 8 }}>
                  {listing.isFeatured ? (
                    <p style={{ margin: "0 0 8px", color: "var(--teal-700)" }}>
                      Featured until:{" "}
                      <strong>
                        {listing.featuredUntil ? new Date(listing.featuredUntil).toLocaleString() : "active"}
                      </strong>
                    </p>
                  ) : (
                    <p style={{ margin: "0 0 8px", color: "var(--muted)" }}>
                      This approved listing can be boosted for higher placement.
                    </p>
                  )}

                  {featuredPackages.length ? (
                    <div
                      style={{
                        display: "grid",
                        gap: 10,
                        gridTemplateColumns: "minmax(240px, 1fr) auto",
                        alignItems: "end",
                      }}
                    >
                      <div>
                        <label className="label" htmlFor={`feature-package-${listing.id}`}>
                          Featured Package
                        </label>
                        <select
                          className="select"
                          id={`feature-package-${listing.id}`}
                          value={selectedPackageCode}
                          onChange={(event) =>
                            setSelectedPackageByListing((current) => ({
                              ...current,
                              [listing.id]: event.target.value,
                            }))
                          }
                        >
                          {featuredPackages.map((pkg) => (
                            <option key={pkg.code} value={pkg.code}>
                              {pkg.name} ({pkg.durationDays} days) - {formatNgn(pkg.amountNgn)}
                            </option>
                          ))}
                        </select>
                      </div>

                      <button
                        className="button"
                        type="button"
                        onClick={() => void startFeaturedCheckout(listing.id)}
                        disabled={isFeaturing || !selectedPackageCode}
                      >
                        {isFeaturing ? "Preparing..." : "Boost Listing"}
                      </button>
                    </div>
                  ) : (
                    <p style={{ margin: 0, color: "#8a2d2d" }}>
                      Featured packages are not available right now.
                    </p>
                  )}
                </div>
              ) : null}

              {photosShort && editable ? (
                <p style={{ margin: "0 0 8px", color: "#8a2d2d" }}>
                  Add {MIN_SUBMIT_PHOTOS - listing.photos.length} more photo(s) before resubmitting.
                </p>
              ) : null}

              {errorByListing[listing.id] ? (
                <div className="empty-state" style={{ marginBottom: 8 }}>
                  {errorByListing[listing.id]}
                </div>
              ) : null}

              {successByListing[listing.id] ? (
                <div className="filter-panel" style={{ marginBottom: 8 }}>
                  {successByListing[listing.id]}
                </div>
              ) : null}

              {isEditing ? (
                <ListingEditor
                  listing={listing}
                  onSaved={handleSavedListing}
                  onCancel={() => setEditingListingId(null)}
                />
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
