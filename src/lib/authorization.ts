import type { RequestUser } from "@/lib/auth";

export function canViewSellerDashboard(user: RequestUser | null | undefined): boolean {
  return user?.role === "seller";
}

export function canViewModerationQueue(user: RequestUser | null | undefined): boolean {
  return user?.role === "moderator" || user?.role === "super_admin";
}
