import { demoListings, demoUsers } from "@/data/demo";
import { nigeriaLaunchLocations } from "@/data/locations";
import { env } from "@/lib/env";
import { hasSupabaseAdminConfig } from "@/server/supabase/client";
import { InMemoryRepository } from "@/server/store/in-memory-repository";
import type { Repository } from "@/server/store/repository";
import { SupabaseRepository } from "@/server/store/supabase-repository";

declare global {
  var __naijaauto_repository__: Repository | undefined;
  var __naijaauto_seeded__: boolean | undefined;
}

const globalStore = globalThis as typeof globalThis & {
  __naijaauto_repository__?: Repository;
  __naijaauto_seeded__?: boolean;
};

function getRepositoryMode(): "supabase" | "memory" {
  if (hasSupabaseAdminConfig()) {
    return "supabase";
  }

  return "memory";
}

function createRepository(): Repository {
  const mode = getRepositoryMode();

  if (mode === "supabase") {
    return new SupabaseRepository();
  }

  return new InMemoryRepository();
}

async function seedRepository(repo: Repository): Promise<void> {
  if (globalStore.__naijaauto_seeded__) {
    return;
  }

  // Runtime seeding is only for local in-memory mode.
  // Supabase mode relies on SQL migrations/seed files, and should not run DB writes during module import.
  if (!hasSupabaseAdminConfig()) {
    await repo.seedLocations(nigeriaLaunchLocations);

    await repo.upsertUser(demoUsers.buyer);
    await repo.upsertUser(demoUsers.sellerDealer);
    await repo.upsertUser(demoUsers.sellerPrivate);
    await repo.upsertUser(demoUsers.moderator);

    for (const listing of demoListings) {
      const existing = await repo.getListingById(listing.id);
      if (!existing) {
        await repo.createListing(listing);
      }
    }
  }

  globalStore.__naijaauto_seeded__ = true;
}

const repository = globalStore.__naijaauto_repository__ ?? createRepository();
globalStore.__naijaauto_repository__ = repository;

await seedRepository(repository);

export function getRepository(): Repository {
  return repository;
}

export function getRepositoryRuntimeMode(): "supabase" | "memory" {
  return hasSupabaseAdminConfig() ? "supabase" : "memory";
}

export function getSupabaseProjectRef(): string | undefined {
  return env.SUPABASE_PROJECT_REF;
}
