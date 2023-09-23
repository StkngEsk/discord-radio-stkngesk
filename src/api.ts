import { IApiRequest } from "@interfaces/IApiRequest.interface";
import Fastify, { FastifyInstance, RouteShorthandOptions } from "fastify";
import { attachRecorder } from ".";

const server: FastifyInstance = Fastify({});

const opts: RouteShorthandOptions = {
  schema: {
    response: {
      200: {
        type: "object",
        properties: {
          success: {
            type: "boolean",
          },
        },
      },
    },
    querystring: {
      type: "object",
      properties: {
        url: { type: "string" },
      },
    },
  },
};

server.get("/play", opts, async (request, reply) => {
  const { url } = <IApiRequest>request.query;
  if (url) {
    attachRecorder(url);
    return { success: true };
  }
  return { success: false };
});

export const start = async () => {
  try {
    await server.listen({ port: 3322 });
  } catch (error) {
    server.log.error(error);
    process.exit(1);
  }
};
