import crypto from "node:crypto";

import { NextRequest } from "next/server";

import { requireUser } from "@/lib/auth";
import { env } from "@/lib/env";
import { ApiError, handleApiError, jsonCreated } from "@/lib/http";
import { getSupabaseAdminClient, hasSupabaseAdminConfig } from "@/server/supabase/client";

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

const extensionByMime: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

declare global {
  var __naijaauto_listing_bucket_ready__: boolean | undefined;
}

const bucketState = globalThis as typeof globalThis & {
  __naijaauto_listing_bucket_ready__?: boolean;
};

async function ensureListingBucket(): Promise<void> {
  if (bucketState.__naijaauto_listing_bucket_ready__) {
    return;
  }

  const bucket = env.SUPABASE_STORAGE_BUCKET_LISTINGS;
  const storage = getSupabaseAdminClient().storage;

  const { error } = await storage.createBucket(bucket, {
    public: true,
    fileSizeLimit: MAX_FILE_BYTES,
    allowedMimeTypes: [...allowedMimeTypes],
  });

  if (error && !error.message.toLowerCase().includes("already exists")) {
    throw new ApiError(500, `Unable to prepare storage bucket: ${error.message}`);
  }

  bucketState.__naijaauto_listing_bucket_ready__ = true;
}

function getExtensionFromFile(file: File): string {
  const fromMime = extensionByMime[file.type];
  if (fromMime) {
    return fromMime;
  }

  const nameParts = file.name.split(".");
  const fromName = nameParts.length > 1 ? nameParts[nameParts.length - 1]?.toLowerCase() : undefined;
  return fromName && fromName.length <= 8 ? fromName : "jpg";
}

export async function POST(request: NextRequest) {
  try {
    if (!hasSupabaseAdminConfig()) {
      throw new ApiError(503, "Supabase storage upload is unavailable. Configure Supabase admin environment.");
    }

    const user = await requireUser(request, ["seller"]);
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      throw new ApiError(400, "Upload requires a file field named 'file'.");
    }

    if (!allowedMimeTypes.has(file.type)) {
      throw new ApiError(400, "Only JPG, PNG, and WEBP images are supported.");
    }

    if (file.size === 0) {
      throw new ApiError(400, "Uploaded file is empty.");
    }

    if (file.size > MAX_FILE_BYTES) {
      throw new ApiError(400, "Image is too large. Max size is 10MB.");
    }

    await ensureListingBucket();

    const extension = getExtensionFromFile(file);
    const today = new Date().toISOString().slice(0, 10);
    const path = `${user.id}/${today}/${crypto.randomUUID()}.${extension}`;
    const bytes = await file.arrayBuffer();

    const { error: uploadError } = await getSupabaseAdminClient()
      .storage
      .from(env.SUPABASE_STORAGE_BUCKET_LISTINGS)
      .upload(path, bytes, {
        upsert: false,
        contentType: file.type,
        cacheControl: "31536000",
      });

    if (uploadError) {
      throw new ApiError(500, `Upload failed: ${uploadError.message}`);
    }

    const { data } = getSupabaseAdminClient()
      .storage
      .from(env.SUPABASE_STORAGE_BUCKET_LISTINGS)
      .getPublicUrl(path);

    return jsonCreated({
      photo: {
        path,
        url: data.publicUrl,
        size: file.size,
        mimeType: file.type,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
