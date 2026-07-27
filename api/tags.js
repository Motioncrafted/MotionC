import { Redis } from "@upstash/redis";

const redisUrl =
  process.env.UPSTASH_REDIS_REST_URL ||
  process.env.KV_REST_API_URL;
const redisToken =
  process.env.UPSTASH_REDIS_REST_TOKEN ||
  process.env.KV_REST_API_TOKEN;

const redis = new Redis({
  url: redisUrl,
  token: redisToken
});
const HISTORY_KEY = "motionc:drop-zone:commons";
const COLORS = new Set(["#d52b69", "#ee7512", "#ffbf22"]);
const FONTS = new Set([
  "'Segoe Print', 'Comic Sans MS', cursive",
  "'Comic Sans MS', cursive"
]);

function reply(response, status, body) {
  response.setHeader("Cache-Control", "no-store");
  response.status(status).json(body);
}

export default async function handler(request, response) {
  try {
    if (request.method === "GET") {
      const tags = await redis.lrange(HISTORY_KEY, 0, 99);
      return reply(response, 200, { tags });
    }

    if (request.method !== "POST") {
      response.setHeader("Allow", "GET, POST");
      return reply(response, 405, { error: "Method not allowed." });
    }

    const text = String(request.body?.text || "").trim();
    const color = String(request.body?.color || "");
    const font = String(request.body?.font || "");

    if (!text || text.length > 60) {
      return reply(response, 400, { error: "A message between 1 and 60 characters is required." });
    }
    if (!COLORS.has(color) || !FONTS.has(font)) {
      return reply(response, 400, { error: "That tag style is unavailable." });
    }

    const tag = {
      id: crypto.randomUUID(),
      text,
      color,
      font,
      createdAt: new Date().toISOString()
    };

    await redis.lpush(HISTORY_KEY, tag);
    await redis.ltrim(HISTORY_KEY, 0, 499);
    return reply(response, 201, { tag });
  } catch {
    return reply(response, 500, { error: "Tag history is temporarily unavailable." });
  }
}
