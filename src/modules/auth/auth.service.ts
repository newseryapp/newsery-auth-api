import { prisma } from "../../db/prisma";
import { hashPassword } from "./password";
import { env } from "../../config/env";

type CreateUserInput = {
  email: string;
  password: string;
};

export async function createUserWithTrial(input: CreateUserInput) {
  const { email, password } = input;

  const existing = await prisma.user.findUnique({
    where: { email }
  });

  if (existing) {
    throw new Error("USER_ALREADY_EXISTS");
  }

  const passwordHash = await hashPassword(password);

  const now = new Date();
  const trialDays = env.TRIAL_DAYS;
  const trialEnd = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000);

  const user = await prisma.user.create({
    data: {
      email,
      provider: "LOCAL",
      entitlement: {
        create: {
          status: "TRIALING",
          trialStartAt: now,
          trialEndAt: trialEnd
        }
      }
    },
    include: {
      entitlement: true
    }
  });

  return user;
}
