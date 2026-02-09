import { prisma } from "../../db/prisma";
import { env } from "../../config/env";

export async function getMeWithEntitlement(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { entitlement: true }
  });

  if (!user || !user.entitlement) {
    throw new Error("ENTITLEMENT_NOT_FOUND");
  }

  let { trialStartAt, trialEndAt, status } = user.entitlement;
  const now = new Date();

  // Trial süresi dolmuş mu?
  const isExpired = trialEndAt.getTime() <= now.getTime();

  // Stripe yokken otomatik reset (senin istediğin davranış)
  if (isExpired && env.PAYMENTS_MODE === "off") {
    const newStart = now;
    const newEnd = new Date(
      now.getTime() + env.TRIAL_DAYS * 24 * 60 * 60 * 1000
    );

    const updated = await prisma.entitlement.update({
      where: { userId: user.id },
      data: {
        status: "TRIALING",
        trialStartAt: newStart,
        trialEndAt: newEnd
      }
    });

    trialStartAt = updated.trialStartAt;
    trialEndAt = updated.trialEndAt;
    status = updated.status;
  }

  const msLeft = trialEndAt.getTime() - now.getTime();
  const daysLeft = Math.max(Math.ceil(msLeft / (1000 * 60 * 60 * 24)), 0);

  return {
    user: {
      id: user.id,
      email: user.email
    },
    entitlement: {
      status,
      trialStartAt,
      trialEndAt,
      daysLeft
    }
  };
}
