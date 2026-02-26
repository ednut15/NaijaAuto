import { demoListings, demoUsers } from "@/data/demo";
import { nigeriaLaunchLocations } from "@/data/locations";
import { InMemoryRepository } from "@/server/store/in-memory-repository";

declare global {
  var __naijaauto_repository__: InMemoryRepository | undefined;
  var __naijaauto_seeded__: boolean | undefined;
}

const globalStore = globalThis as typeof globalThis & {
  __naijaauto_repository__?: InMemoryRepository;
  __naijaauto_seeded__?: boolean;
};

const repository = globalStore.__naijaauto_repository__ ?? new InMemoryRepository();

function seedDemoData(repo: InMemoryRepository): void {
  if (repo.allListings().length > 0) {
    return;
  }

  repo.seedLocations(nigeriaLaunchLocations);

  repo.upsertUser(demoUsers.buyer);
  repo.upsertUser(demoUsers.sellerDealer);
  repo.upsertUser(demoUsers.sellerPrivate);
  repo.upsertUser(demoUsers.moderator);

  for (const listing of demoListings) {
    repo.createListing(listing);
  }
}

if (!globalStore.__naijaauto_seeded__) {
  seedDemoData(repository);
  globalStore.__naijaauto_seeded__ = true;
}

globalStore.__naijaauto_repository__ = repository;

export function getRepository(): InMemoryRepository {
  return repository;
}
