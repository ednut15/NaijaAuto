import { NextRequest } from "next/server";

import type { SellerType, UserRole } from "@/types/domain";

import { ApiError } from "@/lib/http";
import { getSupabaseAnonClient } from "@/server/supabase/client";

export interface RequestUser {
  id: string;
  role: UserRole;
  sellerType?: SellerType;
  phoneVerified: boolean;
  email?: string;
}

const validRoles = new Set<UserRole>(["buyer", "seller", "moderator", "super_admin"]);
const validSellerTypes = new Set<SellerType>(["dealer", "private"]);

function parseUserFromHeaders(request: NextRequest): RequestUser | null {
  const id = request.headers.get("x-user-id");
  const roleHeader = request.headers.get("x-user-role");

  if (!id || !roleHeader || !validRoles.has(roleHeader as UserRole)) {
    return null;
  }

  const sellerTypeHeader = request.headers.get("x-seller-type");
  const sellerType = validSellerTypes.has(sellerTypeHeader as SellerType)
    ? (sellerTypeHeader as SellerType)
    : undefined;

  return {
    id,
    role: roleHeader as UserRole,
    sellerType,
    phoneVerified: request.headers.get("x-phone-verified") === "true",
    email: request.headers.get("x-user-email") ?? undefined,
  };
}

function asRole(input: unknown): UserRole | undefined {
  if (typeof input !== "string") {
    return undefined;
  }

  return validRoles.has(input as UserRole) ? (input as UserRole) : undefined;
}

function asSellerType(input: unknown): SellerType | undefined {
  if (typeof input !== "string") {
    return undefined;
  }

  return validSellerTypes.has(input as SellerType) ? (input as SellerType) : undefined;
}

async function parseUserFromSupabaseToken(request: NextRequest): Promise<RequestUser | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return null;
  }

  const anonClient = getSupabaseAnonClient();
  if (!anonClient) {
    return null;
  }

  const { data, error } = await anonClient.auth.getUser(token);
  if (error || !data.user) {
    return null;
  }

  const role =
    asRole(data.user.app_metadata?.role) ?? asRole(data.user.user_metadata?.role) ?? "buyer";

  const sellerType =
    asSellerType(data.user.app_metadata?.seller_type) ??
    asSellerType(data.user.user_metadata?.seller_type);

  const phoneVerifiedFromMetadata =
    typeof data.user.app_metadata?.phone_verified === "boolean"
      ? data.user.app_metadata.phone_verified
      : typeof data.user.user_metadata?.phone_verified === "boolean"
        ? data.user.user_metadata.phone_verified
        : undefined;

  return {
    id: data.user.id,
    role,
    sellerType,
    phoneVerified: phoneVerifiedFromMetadata ?? Boolean(data.user.phone_confirmed_at),
    email: data.user.email ?? undefined,
  };
}

export async function getRequestUser(request: NextRequest): Promise<RequestUser | null> {
  const tokenUser = await parseUserFromSupabaseToken(request);
  if (tokenUser) {
    return tokenUser;
  }

  return parseUserFromHeaders(request);
}

export async function requireUser(
  request: NextRequest,
  allowedRoles?: UserRole[],
): Promise<RequestUser> {
  const user = await getRequestUser(request);

  if (!user) {
    throw new ApiError(
      401,
      "Authentication required. Send a Supabase bearer token or x-user-id/x-user-role headers for local sandbox mode.",
    );
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    throw new ApiError(403, "You do not have permission for this action.");
  }

  return user;
}
