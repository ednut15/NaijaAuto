import { NextRequest } from "next/server";

import type { SellerType, UserRole } from "@/types/domain";

import { ApiError } from "@/lib/http";

export interface RequestUser {
  id: string;
  role: UserRole;
  sellerType?: SellerType;
  phoneVerified: boolean;
  email?: string;
}

const validRoles = new Set<UserRole>(["buyer", "seller", "moderator", "super_admin"]);
const validSellerTypes = new Set<SellerType>(["dealer", "private"]);

export function getRequestUser(request: NextRequest): RequestUser | null {
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

export function requireUser(request: NextRequest, allowedRoles?: UserRole[]): RequestUser {
  const user = getRequestUser(request);

  if (!user) {
    throw new ApiError(
      401,
      "Missing user context. Send x-user-id and x-user-role headers during MVP mode.",
    );
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    throw new ApiError(403, "You do not have permission for this action.");
  }

  return user;
}
