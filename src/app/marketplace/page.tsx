import { listCatalogOffers } from "@/lib/catalog";
import { Marketplace } from "@/components/marketplace/Marketplace";
export const metadata = { title: "Marketplace" };
export default function Page() {
  return <Marketplace offers={listCatalogOffers()} />;
}
