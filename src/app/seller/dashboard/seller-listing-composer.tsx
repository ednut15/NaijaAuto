"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const MIN_SUBMIT_PHOTOS = 15;
const MAX_PHOTOS = 30;

interface UploadResponse {
  photo: {
    url: string;
  };
}

interface CreateListingResponse {
  listing: {
    id: string;
  };
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

export function SellerListingComposer() {
  const router = useRouter();
  const [photos, setPhotos] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    const form = event.currentTarget;

    if (photos.length < MIN_SUBMIT_PHOTOS) {
      setError(`Add at least ${MIN_SUBMIT_PHOTOS} photos before submit. ${photosRemaining} more needed.`);
      return;
    }

    const formData = new FormData(form);
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
      photos,
      contactPhone: String(formData.get("contactPhone") ?? ""),
      contactWhatsapp: String(formData.get("contactWhatsapp") ?? ""),
    };

    setIsSubmitting(true);

    try {
      const createResponse = await fetch("/api/listings", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const createPayload = (await createResponse.json().catch(() => ({}))) as
        | CreateListingResponse
        | { error?: string };
      if (!createResponse.ok || !("listing" in createPayload)) {
        throw new Error(getErrorMessage(createPayload, "Unable to create listing draft."));
      }

      const submitResponse = await fetch(`/api/listings/${createPayload.listing.id}/submit`, {
        method: "POST",
      });

      const submitPayload = (await submitResponse.json().catch(() => ({}))) as { error?: string };
      if (!submitResponse.ok) {
        throw new Error(getErrorMessage(submitPayload, "Unable to submit listing for moderation."));
      }

      setSuccess("Listing submitted for moderation successfully.");
      setPhotos([]);
      form.reset();
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to submit listing.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="section">
      <div className="section-head">
        <div>
          <h3>Create Listing</h3>
          <p>
            Upload at least {MIN_SUBMIT_PHOTOS} photos. This flow creates a draft and submits it for moderation.
          </p>
        </div>
      </div>

      {error ? <div className="empty-state">{error}</div> : null}
      {success ? <div className="filter-panel">{success}</div> : null}

      <form onSubmit={handleSubmit} className="filter-panel">
        <div className="filter-grid">
          <div>
            <label className="label" htmlFor="title">
              Title
            </label>
            <input className="input" id="title" name="title" required minLength={10} maxLength={120} />
          </div>

          <div>
            <label className="label" htmlFor="make">
              Make
            </label>
            <input className="input" id="make" name="make" required />
          </div>

          <div>
            <label className="label" htmlFor="model">
              Model
            </label>
            <input className="input" id="model" name="model" required />
          </div>

          <div>
            <label className="label" htmlFor="year">
              Year
            </label>
            <input
              className="input"
              id="year"
              name="year"
              type="number"
              required
              min={1980}
              max={new Date().getFullYear() + 1}
              defaultValue={new Date().getFullYear()}
            />
          </div>

          <div>
            <label className="label" htmlFor="priceNgn">
              Price (NGN)
            </label>
            <input className="input" id="priceNgn" name="priceNgn" type="number" required min={500000} step={1} />
          </div>

          <div>
            <label className="label" htmlFor="bodyType">
              Body Type
            </label>
            <select className="select" id="bodyType" name="bodyType" defaultValue="car">
              <option value="car">Car</option>
              <option value="suv">SUV</option>
              <option value="pickup">Pickup</option>
            </select>
          </div>

          <div>
            <label className="label" htmlFor="mileageKm">
              Mileage (km)
            </label>
            <input className="input" id="mileageKm" name="mileageKm" type="number" required min={0} step={1} />
          </div>

          <div>
            <label className="label" htmlFor="transmission">
              Transmission
            </label>
            <select className="select" id="transmission" name="transmission" defaultValue="automatic">
              <option value="automatic">Automatic</option>
              <option value="manual">Manual</option>
            </select>
          </div>

          <div>
            <label className="label" htmlFor="fuelType">
              Fuel Type
            </label>
            <select className="select" id="fuelType" name="fuelType" defaultValue="petrol">
              <option value="petrol">Petrol</option>
              <option value="diesel">Diesel</option>
              <option value="hybrid">Hybrid</option>
              <option value="electric">Electric</option>
            </select>
          </div>

          <div>
            <label className="label" htmlFor="vin">
              VIN
            </label>
            <input className="input" id="vin" name="vin" required minLength={17} maxLength={17} />
          </div>

          <div>
            <label className="label" htmlFor="state">
              State
            </label>
            <input className="input" id="state" name="state" required />
          </div>

          <div>
            <label className="label" htmlFor="city">
              City
            </label>
            <input className="input" id="city" name="city" required />
          </div>

          <div>
            <label className="label" htmlFor="lat">
              Latitude
            </label>
            <input className="input" id="lat" name="lat" type="number" required step="0.000001" />
          </div>

          <div>
            <label className="label" htmlFor="lng">
              Longitude
            </label>
            <input className="input" id="lng" name="lng" type="number" required step="0.000001" />
          </div>

          <div>
            <label className="label" htmlFor="contactPhone">
              Contact Phone
            </label>
            <input className="input" id="contactPhone" name="contactPhone" required />
          </div>

          <div>
            <label className="label" htmlFor="contactWhatsapp">
              WhatsApp
            </label>
            <input className="input" id="contactWhatsapp" name="contactWhatsapp" required />
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <label className="label" htmlFor="description">
            Description
          </label>
          <textarea className="input" id="description" name="description" rows={5} required minLength={40} />
        </div>

        <div style={{ marginTop: 12 }}>
          <label className="label" htmlFor="photos">
            Photos ({photos.length}/{MAX_PHOTOS})
          </label>
          <input
            className="input"
            id="photos"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={(event) => void uploadFiles(event.target.files)}
            disabled={isUploading || isSubmitting}
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
              <div key={url} style={{ position: "relative", border: "1px solid var(--line)", borderRadius: 10 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={`Listing upload ${index + 1}`}
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
                    background: "var(--overlay-bg)",
                    color: "var(--overlay-fg)",
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

        <div style={{ marginTop: 12 }}>
          <button className="button" type="submit" disabled={isSubmitting || isUploading}>
            {isSubmitting ? "Submitting..." : isUploading ? "Uploading..." : "Create & Submit Listing"}
          </button>
        </div>
      </form>
    </section>
  );
}
