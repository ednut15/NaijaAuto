import { nigeriaLaunchLocations } from "@/data/locations";
import { InMemoryRepository } from "@/server/store/in-memory-repository";

const repository = new InMemoryRepository();
repository.seedLocations(nigeriaLaunchLocations);

export function getRepository(): InMemoryRepository {
  return repository;
}
