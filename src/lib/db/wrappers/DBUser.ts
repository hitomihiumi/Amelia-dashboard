import { prisma } from "@/lib/db/db";
import { User } from "@prisma/client";
import { UserPathMap, UserFieldMap } from "@/lib/db/mappings/UserMapping";

/**
 * Paths stored as DateTime columns; the wrapper converts them to
 * millisecond timestamps (0 = no cooldown) to keep the schema numeric.
 */
const TIMEOUT_PATHS = new Set([
  "economy.timeout.work",
  "economy.timeout.timely",
  "economy.timeout.daily",
  "economy.timeout.weekly",
  "economy.timeout.rob",
]);

/** The card number a new member gets: server id, member id and two random groups of four digits. */
export function generateBalanceNumber(userId: string, guildId: string): string {
  const group = () => String(Math.floor(Math.random() * 10_000)).padStart(4, "0");
  return `${guildId.slice(0, 4)} ${userId.slice(0, 4)} ${group()} ${group()}`;
}

/**
 * Database User wrapper with type-safe access.
 * All schema paths live in PostgreSQL; only temp.* paths are served by TempCache (Redis).
 */
export class DBUser {
  public userId: string;
  public guildId: string;
  private data: User | null = null;

  constructor(userId: string, guildId: string) {
    this.userId = userId;
    this.guildId = guildId;
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
        balanceNumber: generateBalanceNumber(this.userId, this.guildId),
      },
    });

    return this.data;
  }

  /**
   * Convert a stored column value into its schema representation
   */
  private readField(path: string, value: any): any {
    if (TIMEOUT_PATHS.has(path)) {
      return value ? new Date(value).getTime() : 0;
    }
    return value;
  }

  /**
   * Convert a schema value into its column representation
   */
  private writeField(path: string, value: any): any {
    if (TIMEOUT_PATHS.has(path)) {
      return value ? new Date(value) : null;
    }
    return value;
  }

  /**
   * Get value by path with type inference
   * Supports parent paths (e.g., "level" returns all level fields)
   */
  public async get(path: string): Promise<any> {
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
      // This is a parent path, recursively collect all child values
      const result = this.collectChildValues(path, pathInfo.children, data);
      return result;
    }

    // This is a leaf path, get the single field value
    const field = this.mapPathToField(path);
    return this.readField(path, data[field as keyof typeof data]);
  }

  /**
   * Set value by path with type safety
   */
  public async set(path: string, value: any): Promise<void> {
    await this.ensureUser();

    // Parent path: update every mapped child column in one statement
    const pathInfo = UserPathMap[path];
    if (pathInfo && pathInfo.children && pathInfo.children.length > 0) {
      const updateData: Record<string, any> = {};
      this.collectFieldUpdates(path, pathInfo.children, value, updateData);

      if (Object.keys(updateData).length > 0) {
        await prisma.user.update({
          where: {
            userId_guildId: {
              userId: this.userId,
              guildId: this.guildId,
            },
          },
          data: updateData,
        });
        this.data = null;
      }

      return;
    }

    const field = this.mapPathToField(path);

    await prisma.user.update({
      where: {
        userId_guildId: {
          userId: this.userId,
          guildId: this.guildId,
        },
      },
      data: { [field]: this.writeField(path, value) },
    });

    // Invalidate cache
    this.data = null;
  }

  /**
   * Atomic add for direct numeric columns, returns false for composite paths
   */
  private async tryIncrement(path: string, value: number): Promise<boolean> {
    const field = UserFieldMap[path];
    if (!field || TIMEOUT_PATHS.has(path)) return false;

    await this.ensureUser();
    await prisma.user.update({
      where: {
        userId_guildId: {
          userId: this.userId,
          guildId: this.guildId,
        },
      },
      data: { [field]: { increment: value } } as any,
    });

    this.data = null;
    return true;
  }

  /**
   * Add to numeric value
   */
  public async add(path: string, value: number): Promise<void> {
    if (!(await this.tryIncrement(path, value))) {
      const current = await this.get(path);
      await this.set(path, (current as number) + value);
    }
  }

  /**
   * Subtract from numeric value
   */
  public async sub(path: string, value: number): Promise<void> {
    if (!(await this.tryIncrement(path, -value))) {
      const current = await this.get(path);
      await this.set(path, (current as number) - value);
    }
  }

  /**
   * Push to array
   */
  public async push(path: string, value: any): Promise<void> {
    const current = await this.get(path);
    if (Array.isArray(current)) {
      await this.set(path, [...current, value]);
    }
  }

  /**
   * Delete field
   */
  public async delete(path: string): Promise<void> {
    await this.set(path, null as any);
  }

  /**
   * Check if path exists
   */
  public async has(path: string): Promise<boolean> {
    const value = await this.get(path);
    return value !== null && value !== undefined;
  }

  /**
   * Get all user data
   */
  public async all(): Promise<User> {
    return await this.ensureUser();
  }

  /**
   * Recursively collect child values for a parent path
   */
  private collectChildValues(parentPath: string, children: string[], data: any): any {
    const result: any = {};

    for (const childKey of children) {
      const childPath = `${parentPath}.${childKey}`;
      const childInfo = UserPathMap[childPath];

      if (!childInfo) continue;

      if (childInfo.children && childInfo.children.length > 0) {
        // This child is also a parent, recurse
        result[childKey] = this.collectChildValues(childPath, childInfo.children, data);
      } else if (childInfo.field) {
        // This is a leaf node with a direct field mapping
        result[childKey] = this.readField(childPath, data[childInfo.field as keyof typeof data]);
      }
    }

    return result;
  }

  /**
   * Recursively collect field updates from nested value object
   */
  private collectFieldUpdates(
    parentPath: string,
    children: string[],
    value: any,
    updateData: Record<string, any>,
  ): void {
    if (!value || typeof value !== "object") return;

    for (const childKey of children) {
      const childPath = `${parentPath}.${childKey}`;
      const childInfo = UserPathMap[childPath];
      const childValue = value[childKey];

      if (childValue === undefined) continue;

      if (!childInfo) continue;

      if (childInfo.children && childInfo.children.length > 0) {
        // This child is also a parent, recurse
        this.collectFieldUpdates(childPath, childInfo.children, childValue, updateData);
      } else if (childInfo.field) {
        // This is a leaf node with a direct field mapping
        updateData[childInfo.field] = this.writeField(childPath, childValue);
      }
    }
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
}
