import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { RestaurantForm } from "@/components/app/RestaurantForm";
import { getWorkspace, requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Configura tu restaurante" };

export default async function OnboardingPage() {
  const user = await requireUser("/app/onboarding");
  if (await getWorkspace()) redirect("/app");

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="font-display text-3xl font-bold">Cuéntanos sobre tu restaurante</h1>
      <p className="mt-2 text-ink-soft">Son menos de 3 minutos. Podrás cambiarlo todo después.</p>
      <div className="mt-6 rounded-3xl border border-line bg-surface p-5 sm:p-7">
        <RestaurantForm mode="onboarding" ownerName={user.fullName} />
      </div>
    </div>
  );
}
