// Días de prueba que le quedan a una organización (redondeando hacia arriba).
export function trialDaysLeft(trialEndsAt: string | Date, now: Date = new Date()): number {
  const ms = new Date(trialEndsAt).getTime() - now.getTime();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}
