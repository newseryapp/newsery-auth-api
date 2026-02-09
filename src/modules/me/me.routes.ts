import { FastifyInstance } from "fastify";
import { getMeWithEntitlement } from "./me.service";

export async function meRoutes(app: FastifyInstance) {
  app.get(
    "/me",
    { preHandler: (app as any).authenticate },
    async (request: any, reply) => {
      const userId = request.user?.sub as string | undefined;

      if (!userId) {
        return reply.code(401).send({ error: "UNAUTHORIZED" });
      }

      try {
        const result = await getMeWithEntitlement(userId);
        return reply.send(result);
      } catch (e: any) {
        if (e?.message === "ENTITLEMENT_NOT_FOUND") {
          return reply.code(404).send({ error: "NOT_FOUND" });
        }
        request.log.error(e);
        return reply.code(500).send({ error: "INTERNAL_ERROR" });
      }
    }
  );
}
