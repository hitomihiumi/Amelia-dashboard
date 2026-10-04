import { Redis } from "ioredis";
import { redisTlsOptions } from "./tls";

/**
 * Singleton Redis client for temp data caching and the status heartbeat.
 * Backed by globalThis so Next.js dev reloads reuse one connection.
 */
class RedisService {
  private static global = globalThis as unknown as {
    redisClient: Redis | null;
  };

  private constructor() {}

  /**
   * Get Redis client instance
   */
  public static getClient(): Redis {
    if (!RedisService.global.redisClient) {
      const url =
        process.env.NODE_ENV === "development"
          ? process.env.DEV_REDIS_URL || process.env.REDIS_URL
          : process.env.REDIS_URL;
      if (!url) {
        throw new Error("REDIS_URL is not defined in environment variables");
      }
      RedisService.global.redisClient = new Redis(url, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        ...redisTlsOptions(),
      });
      // Without a listener every connection retry prints an unhandled error event.
      RedisService.global.redisClient.on("error", (error) => {
        console.error("[Redis] Connection error:", error.message);
      });
    }
    return RedisService.global.redisClient;
  }

  /**
   * Connect to Redis
   */
  public static async connect(): Promise<void> {
    const client = RedisService.getClient();
    if (client.status === "ready") return;

    await client.connect();
    await client.ping();
  }

  /**
   * Disconnect from Redis
   */
  public static async disconnect(): Promise<void> {
    const client = RedisService.global.redisClient;
    if (!client) return;

    await client.quit();
    RedisService.global.redisClient = null;
  }
}

export { RedisService };
