import { seedItems } from "@/app/actions/items";

export default async function SeedPage() {

  await seedItems();

  return <div>Seed Page</div>;
}