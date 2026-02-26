import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { cookies, headers } from "next/headers";
import { NextRequest } from "next/server";

import type { SellerType, UserRole } from "@/types/domain";

import { env, isProduction } from "@/lib/env";
import { ApiError } from "@/lib/http";
import {
  getSupabaseAnonClient,
  getSupabaseAdminClient,
  hasSupabaseAdminConfig,
} from "@/server/supabase/client";

export interface RequestUser {
  id: string;
  role: UserRole;
  sellerType?: SellerType;
  phoneVerified: boolean;
  email?: string;
}

const validRoles = new Set<UserRole>(["buyer", "seller", "moderator", "super_admin"]);
const validSellerTypes = new Set<SellerType>(["dealer", "private"]);

interface HeaderReader {
  get(name: string): string | null;
}

interface SupabaseCookie {
  name: string;
  value: string;
}

interface SupabaseCookieAdapter {
  getAll(): SupabaseCookie[];
  setAll(cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>): void;
}

interface AuthDbUserRow {
  role: UserRole;
  seller_type: SellerType | null;
  phone_verified: boolean;
  email: string | null;
}

function parseUserFromHeaderValues(reader: HeaderReader): RequestUser | null {
  if (isProduction) {
    return null;
  }

  const id = reader.get("x-user-id");
  const roleHeader = reader.get("x-user-role");

  if (!id || !roleHeader || !validRoles.has(roleHeader as UserRole)) {
    return null;
  }

  const sellerTypeHeader = reader.get("x-seller-type");
  const sellerType = validSellerTypes.has(sellerTypeHeader as SellerType)
    ? (sellerTypeHeader as SellerType)
    : undefined;

  return {
    id,
    role: roleHeader as UserRole,
    sellerType,
    phoneVerified: reader.get("x-phone-verified") === "true",
    email: reader.get("x-user-email") ?? undefined,
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

function asSelfAssignableRole(input: unknown): "buyer" | "seller" | undefined {
  if (input === "buyer" || input === "seller") {
    return input;
  }

  return undefined;
}

async function getUserContextFromDatabase(userId: string): Promise<AuthDbUserRow | null> {
  if (!hasSupabaseAdminConfig()) {
    return null;
  }

  const client = getSupabaseAdminClient();
  const { data, error } = await client
    .from("users")
    .select("role, seller_type, phone_verified, email")
    .eq("id", userId)
    .maybeSingle<AuthDbUserRow>();

  if (error) {
    return null;
  }

  return data ?? null;
}

async function toRequestUserFromSupabaseUser(user: User): Promise<RequestUser> {
  const dbUser = await getUserContextFromDatabase(user.id);

  const appRole = asRole(user.app_metadata?.role);
  const userRole = asSelfAssignableRole(user.user_metadata?.role);
  const dbRole = asRole(dbUser?.role);
  const role = dbRole ?? appRole ?? userRole ?? "buyer";

  const sellerType =
    asSellerType(dbUser?.seller_type) ??
    asSellerType(user.app_metadata?.seller_type) ??
    asSellerType(user.user_metadata?.seller_type);

  const phoneVerifiedFromAppMetadata =
    typeof user.app_metadata?.phone_verified === "boolean" ? user.app_metadata.phone_verified : undefined;

  return {
    id: user.id,
    role,
    sellerType,
    phoneVerified: dbUser?.phone_verified ?? phoneVerifiedFromAppMetadata ?? Boolean(user.phone_confirmed_at),
    email: dbUser?.email ?? user.email ?? undefined,
  };
}

async function parseUserFromAuthorizationHeader(authHeader: string | null): Promise<RequestUser | null> {
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

  return await toRequestUserFromSupabaseUser(data.user);
}

async function parseUserFromSupabaseCookieAdapter(
  cookieAdapter: SupabaseCookieAdapter,
): Promise<RequestUser | null> {
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
    return null;
  }

  const supabase = createServerClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    cookies: cookieAdapter,
  });

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return null;
  }

  return await toRequestUserFromSupabaseUser(data.user);
}

async function parseUserFromSupabaseCookieSession(): Promise<RequestUser | null> {
  const cookieStore = await cookies();

  return parseUserFromSupabaseCookieAdapter({
    getAll() {
      return cookieStore.getAll().map((cookie) => ({
        name: cookie.name,
        value: cookie.value,
      }));
    },
    setAll(cookiesToSet) {
      for (const cookie of cookiesToSet) {
        try {
          cookieStore.set(cookie.name, cookie.value, cookie.options);
        } catch {
          // No-op in read-only contexts.
        }
      }
    },
  });
}

async function parseUserFromSupabaseRequestSession(request: NextRequest): Promise<RequestUser | null> {
  return parseUserFromSupabaseCookieAdapter({
    getAll() {
      return request.cookies.getAll().map((cookie) => ({
        name: cookie.name,
        value: cookie.value,
      }));
    },
    setAll() {
      // Route handlers do not need to mutate cookies for user lookup.
    },
  });
}

export async function getRequestUser(request: NextRequest): Promise<RequestUser | null> {
  const tokenUser = await parseUserFromAuthorizationHeader(request.headers.get("authorization"));
  if (tokenUser) {
    return tokenUser;
  }

  const sessionUser = await parseUserFromSupabaseRequestSession(request);
  if (sessionUser) {
    return sessionUser;
  }

  return parseUserFromHeaderValues(request.headers);
}

export async function requireUser(
  request: NextRequest,
  allowedRoles?: UserRole[],
): Promise<RequestUser> {
  const user = await getRequestUser(request);

  if (!user) {
    throw new ApiError(401, isProduction
      ? "Authentication required. Use Supabase session or bearer authentication."
      : "Authentication required. Use Supabase session/bearer auth or x-user-id/x-user-role headers for local sandbox mode.");
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    throw new ApiError(403, "You do not have permission for this action.");
  }

  return user;
}

export async function getServerUser(): Promise<RequestUser | null> {
  const headerStore = await headers();

  const tokenUser = await parseUserFromAuthorizationHeader(headerStore.get("authorization"));
  if (tokenUser) {
    return tokenUser;
  }

  const sessionUser = await parseUserFromSupabaseCookieSession();
  if (sessionUser) {
    return sessionUser;
  }

  return parseUserFromHeaderValues(headerStore);
}

export async function requireServerUser(allowedRoles?: UserRole[]): Promise<RequestUser> {
  const user = await getServerUser();

  if (!user) {
    throw new ApiError(401, isProduction
      ? "Authentication required. Sign in with Supabase Auth."
      : "Authentication required. Sign in with Supabase Auth or provide x-user-id/x-user-role headers for local sandbox mode.");
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    throw new ApiError(403, "You do not have permission for this action.");
  }

  return user;
}
