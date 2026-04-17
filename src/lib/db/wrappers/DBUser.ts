import { prisma } from "@/lib/db/db";
import { User } from "@prisma/client";
import { TempCache } from "@/lib/db/wrappers/TempCache";
import { UserFieldMap, UserPathMap } from "@/lib/db/mappings/UserMapping";

const MONGODB_DEFAULTS = {
  level: {
    xp: 0,
    total_xp: 0,
    level: 1,
    voice_time: 0,
    message_count: 0,
  },
  economy: {
    balance: {
      wallet: 0,
      bank: 0,
    },
    inventory: {
      custom: {
        roles: [],
        items: [],
      },
    },
    timeout: {
      work: 0,
      timely: 0,
      daily: 0,
      weekly: 0,
      rob: 0,
    },
  },
};

export class DBUser {
  public userId: string;
  public guildId: string;
  private data: User | null = null;
  private mongoCache: TempCache<typeof UserPathMap>;

  constructor(userId: string, guildId: string) {
    this.userId = userId;
    this.guildId = guildId;
    this.mongoCache = new TempCache("user_data", `${userId}:${guildId}`, UserPathMap);
  }

  /**
   * Get value by path with type inference
   * Supports parent paths (e.g., "level" returns all level fields)
   * Automatically routes to MongoDB for level and economy fields
   */
  public async get(path: string): Promise<any> {
    // Route to MongoDB for level and economy paths
    if (this.isMongoDBPath(path)) {
      await this.ensureMongoDBData(path);

      // Check if this is a parent path
      const pathInfo = UserPathMap[path];

      if (pathInfo && pathInfo.children) {
        // Parent path: collect all child values from MongoDB
        const result: any = {};

        for (const childKey of pathInfo.children) {
          const childPath = `${path}.${childKey}`;
          const value = await this.mongoCache.get(childPath);

          if (value !== null && value !== undefined) {
            result[childKey] = value;
          }
        }

        return result;
      }

      // Leaf path: get single value from MongoDB
      const value = await this.mongoCache.get(path);
      return value ?? null;
    }

    // PostgreSQL path
    await this.ensureUser();

    const data = await prisma.user.findUnique({
      where: {
        userId_guildId: {
          userId: this.userId,
          guildId: this.guildId,
        },
      },
    });

    if (!data) return null as any;

    // Check if this is a parent path (has children)
    const pathInfo = UserPathMap[path];

    if (pathInfo && pathInfo.children) {
      // This is a parent path, collect all child values
      const result: any = {};

      for (const childKey of pathInfo.children) {
        const childPath = `${path}.${childKey}`;
        const childInfo = UserPathMap[childPath];

        if (childInfo && childInfo.field) {
          result[childKey] = data[childInfo.field as keyof typeof data];
        }
      }

      return result;
    }

    // This is a leaf path, get the single field value
    const field = this.mapPathToField(path);
    return data[field as keyof typeof data];
  }

  /**
   * Set value by path with type safety
   * Automatically routes to MongoDB for level and economy fields
   */
  public async set(path: string, value: any): Promise<void> {
    // Route to MongoDB for level and economy paths
    if (this.isMongoDBPath(path)) {
      await this.ensureMongoDBData(path);
      await this.mongoCache.set(path, value);
      return;
    }

    // PostgreSQL path
    await this.ensureUser();

    const field = this.mapPathToField(path);

    await prisma.user.update({
      where: {
        userId_guildId: {
          userId: this.userId,
          guildId: this.guildId,
        },
      },
      data: { [field]: value },
    });

    // Invalidate cache
    this.data = null;
  }

  /**
   * Add to numeric value
   * Works with both MongoDB and PostgreSQL paths
   */
  public async add(path: string, value: number): Promise<void> {
    if (this.isMongoDBPath(path)) {
      await this.ensureMongoDBData(path);
      await this.mongoCache.add(path, value);
      return;
    }

    const current = await this.get(path as any);
    await this.set(path as any, (current as number) + value);
  }

  /**
   * Subtract from numeric value
   * Works with both MongoDB and PostgreSQL paths
   */
  public async sub(path: string, value: number): Promise<void> {
    if (this.isMongoDBPath(path)) {
      await this.ensureMongoDBData(path);
      await this.mongoCache.sub(path, value);
      return;
    }

    const current = await this.get(path as any);
    await this.set(path as any, (current as number) - value);
  }

  /**
   * Push to array
   * Works with both MongoDB and PostgreSQL paths
   */
  public async push(path: string, value: any): Promise<void> {
    if (this.isMongoDBPath(path)) {
      await this.ensureMongoDBData(path);
      await this.mongoCache.push(path, value);
      return;
    }

    const current = await this.get(path as any);
    if (Array.isArray(current)) {
      await this.set(path as any, [...current, value]);
    }
  }

  /**
   * Delete field
   * Works with both MongoDB and PostgreSQL paths
   */
  public async delete(path: string): Promise<void> {
    if (this.isMongoDBPath(path)) {
      await this.mongoCache.delete(path);
      return;
    }

    await this.set(path as any, null as any);
  }

  /**
   * Check if path exists
   * Works with both MongoDB and PostgreSQL paths
   */
  public async has(path: string): Promise<boolean> {
    if (this.isMongoDBPath(path)) {
      return await this.mongoCache.has(path);
    }

    const value = await this.get(path as any);
    return value !== null && value !== undefined;
  }

  /**
   * Get all user data (PostgreSQL only)
   * Note: MongoDB data is not included in this method
   */
  public async all(): Promise<User> {
    return await this.ensureUser();
  }

  /**
   * Map dot-notation path to Prisma field using auto-generated mapping
   */
  private mapPathToField(path: string): string {
    const field = UserFieldMap[path];

    if (!field) {
      throw new Error(
        `Unknown user path: ${path}. Please regenerate mappings with 'npm run generate:schema'`,
      );
    }

    return field;
  }

  /**
   * Check if a path should be stored in MongoDB
   */
  private isMongoDBPath(path: string): boolean {
    return path.startsWith("level") || path.startsWith("economy");
  }

  /**
   * Initialize MongoDB data with defaults
   */
  private async ensureMongoDBData(path: string): Promise<void> {
    const rootPath = path.split(".")[0];

    if (rootPath === "level") {
      const hasLevel = await this.mongoCache.has("level.xp");
      if (!hasLevel) {
        // Initialize all level fields
        for (const [key, value] of Object.entries(MONGODB_DEFAULTS.level)) {
          await this.mongoCache.set(`level.${key}`, value);
        }
      }
    } else if (rootPath === "economy") {
      const hasEconomy = await this.mongoCache.has("economy.balance.wallet");
      if (!hasEconomy) {
        // Initialize all economy fields
        await this.mongoCache.set(
          "economy.balance.wallet",
          MONGODB_DEFAULTS.economy.balance.wallet,
        );
        await this.mongoCache.set("economy.balance.bank", MONGODB_DEFAULTS.economy.balance.bank);
        await this.mongoCache.set(
          "economy.inventory.custom.roles",
          MONGODB_DEFAULTS.economy.inventory.custom.roles,
        );
        await this.mongoCache.set(
          "economy.inventory.custom.items",
          MONGODB_DEFAULTS.economy.inventory.custom.items,
        );
        await this.mongoCache.set("economy.timeout.work", MONGODB_DEFAULTS.economy.timeout.work);
        await this.mongoCache.set(
          "economy.timeout.timely",
          MONGODB_DEFAULTS.economy.timeout.timely,
        );
        await this.mongoCache.set("economy.timeout.daily", MONGODB_DEFAULTS.economy.timeout.daily);
        await this.mongoCache.set(
          "economy.timeout.weekly",
          MONGODB_DEFAULTS.economy.timeout.weekly,
        );
        await this.mongoCache.set("economy.timeout.rob", MONGODB_DEFAULTS.economy.timeout.rob);
      }
    }
  }

  /**
   * Initialize and ensure user exists in database
   */
  private async ensureUser(): Promise<User> {
    if (this.data) return this.data;

    this.data = await prisma.user.upsert({
      where: {
        userId_guildId: {
          userId: this.userId,
          guildId: this.guildId,
        },
      },
      update: {},
      create: {
        userId: this.userId,
        guildId: this.guildId,
        balanceNumber: `${this.guildId.slice(0, 4)} ${this.userId.slice(0, 4)} ${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)} ${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}`,
      },
    });

    return this.data;
  }
}
