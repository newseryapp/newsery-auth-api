import Fastify, { FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import jwt from "@fastify/jwt";

import { env, getAllowedOrigins } from "./config/env";
import { healthRoutes } from "./modules/health/health.routes";
import { authRoutes } from "./modules/auth/auth.routes";
import { meRoutes } from "./modules/me/me.routes";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { sub: string };
    user: { sub: string };
  }
}

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (request: any, reply: any) => Promise<any>;
  }
}

export function buildApp(): FastifyInstance {
  const app = Fastify({
    logger: true
  });

  // Security headers
  app.register(helmet);

  // CORS
  const allowed = new Set(getAllowedOrigins());
  app.register(cors, {
    origin: (origin, cb) => {
      // allow non-browser clients / same-origin
      if (!origin) return cb(null, true);

      if (allowed.size === 0) return cb(null, true);
      if (allowed.has(origin)) return cb(null, true);

      return cb(new Error("Not allowed by CORS"), false);
    },
    credentials: true
  });

  // JWT (Authorization: Bearer <token>)
  app.register(jwt, {
    secret: env.JWT_SECRET,
    sign: { expiresIn: env.JWT_EXPIRES_IN }
  });

  app.decorate("authenticate", async function (request: any, reply: any) {
    try {
      await request.jwtVerify();
    } catch (err) {
      return reply.code(401).send({ error: "UNAUTHORIZED" });
    }
  });

  // Routes
  app.register(healthRoutes, { prefix: "" });
  app.register(authRoutes, { prefix: "" });
  app.register(meRoutes, { prefix: "" });

  // Basic root
  app.get("/", async () => ({ ok: true, service: "newsery-auth-api" }));

  return app;
}
