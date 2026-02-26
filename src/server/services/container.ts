import { Mailer } from "@/server/integrations/mailer";
import { PaystackClient } from "@/server/integrations/paystack";
import { TermiiClient } from "@/server/integrations/termii";
import { MarketplaceService } from "@/server/services/marketplace-service";
import { getRepository } from "@/server/store";

const repository = getRepository();
const termiiClient = new TermiiClient();
const paystackClient = new PaystackClient();
const mailer = new Mailer();

export const marketplaceService = new MarketplaceService(
  repository,
  termiiClient,
  paystackClient,
  mailer,
);
