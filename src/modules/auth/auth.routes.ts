import { FastifyInstance } from "fastify";
import { z } from "zod";

import { prisma } from "../../db/prisma";
import { createUserWithTrial } from "./auth.service";
import { verifyPassword } from "./password";

export async function authRoutes(app: FastifyInstance) {
  app.post("/auth/signup", async (request, reply) => {
    const Body = z.object({
      email: z.string().email(),
      password: z.string().min(8)
    });

    const { email, password } = Body.parse(request.body);

    try {
      const user = await createUserWithTrial({ email, password });

      const token = app.jwt.sign({ sub: user.id });

      return reply.code(201).send({
        accessToken: token,
        user: {
          id: user.id,
          email: user.email
        },
        entitlement: user.entitlement && {
          status: user.entitlement.status,
          trialStartAt: user.entitlement.trialStartAt,
          trialEndAt: user.entitlement.trialEndAt
        }
      });
    } catch (e: any) {
      if (e?.message === "USER_ALREADY_EXISTS") {
        return reply.code(409).send({ error: "USER_ALREADY_EXISTS" });
      }
      request.log.error(e);
      return reply.code(500).send({ error: "INTERNAL_ERROR" });
    }
  });

  app.post("/auth/login", async (request, reply) => {
    const Body = z.object({
      email: z.string().email(),
      password: z.string().min(8)
    });

    const { email, password } = Body.parse(request.body);

    const user = await prisma.user.findUnique({
      where: { email },
      include: { entitlement: true }
    });

    if (!user || user.provider !== "LOCAL") {
      return reply.code(401).send({ error: "INVALID_CREDENTIALS" });
    }

    // passwordHash yoksa (eski/bozuk user) güvenlik için reddet
    // @ts-ignore (şimdilik)
    const isValid = await verifyPassword(password, (user as any).passwordHash);

    if (!isValid) {
      return reply.code(401).send({ error: "INVALID_CREDENTIALS" });
    }

    const token = app.jwt.sign({ sub: user.id });

    return reply.send({
      accessToken: token,
      user: {
        id: user.id,
        email: user.email
      },
      entitlement: user.entitlement && {
        status: user.entitlement.status,
        trialStartAt: user.entitlement.trialStartAt,
        trialEndAt: user.entitlement.trialEndAt
      }
    });
  });
}
