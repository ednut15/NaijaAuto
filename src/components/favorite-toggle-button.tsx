"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface FavoriteToggleButtonProps {
  listingId: string;
  initiallySaved: boolean;
  refreshOnChange?: boolean;
  className?: string;
}

function getErrorMessage(payload: unknown, fallback: string): string {
  if (payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string") {
    return payload.error;
  }

  return fallback;
}

export function FavoriteToggleButton({
  listingId,
  initiallySaved,
  refreshOnChange = false,
  className,
}: FavoriteToggleButtonProps) {
  const router = useRouter();
  const [saved, setSaved] = useState(initiallySaved);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggleFavorite() {
    setError(null);

    startTransition(async () => {
      const nextMethod = saved ? "DELETE" : "POST";

      try {
        const response = await fetch(`/api/favorites/${listingId}`, {
          method: nextMethod,
        });

        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(getErrorMessage(payload, "Unable to update favorite."));
        }

        setSaved(!saved);

        if (refreshOnChange) {
          router.refresh();
        }
      } catch (toggleError) {
        setError(toggleError instanceof Error ? toggleError.message : "Unable to update favorite.");
      }
    });
  }

  return (
    <div>
      <button
        type="button"
        className={className ?? "button secondary"}
        onClick={toggleFavorite}
        disabled={isPending}
        aria-pressed={saved}
      >
        {isPending ? "Updating..." : saved ? "Saved" : "Save"}
      </button>
      {error ? (
        <p style={{ margin: "6px 0 0", color: "var(--danger)", fontSize: "0.85rem" }}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
