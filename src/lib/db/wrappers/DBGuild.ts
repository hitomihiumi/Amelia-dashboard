import { prisma } from "@/lib/db/db";
import { Guild } from "@prisma/client";
import { GuildPathMap, GuildFieldMap } from "@/lib/db/mappings/GuildMapping";

/**
 * Database Guild wrapper with type-safe access.
 * All schema paths live in PostgreSQL; only temp.* paths are served by TempCache (Redis).
 */
export class DBGuild {
  public id: string;
  private data: Guild | null = null;

  constructor(guildId: string) {
    this.id = guildId;
  }

  /**
   * Initialize and ensure guild exists in database
   */
  private async ensureGuild(): Promise<Guild> {
    if (this.data) return this.data;

    this.data = await prisma.guild.upsert({
      where: { id: this.id },
      update: {},
      create: {
        id: this.id,
      },
    });

    return this.data;
  }

  /**
   * Get value by path with type inference
   * Supports parent paths (e.g., "utils.components" returns all component arrays)
   */
  public async get(path: string): Promise<any> {
    await this.ensureGuild();

    const data = await prisma.guild.findUnique({
      where: { id: this.id },
    });

    if (!data) return null as any;

    // Check if this is a parent path (has children)
    const pathInfo = GuildPathMap[path];

    if (pathInfo && pathInfo.children) {
      // This is a parent path, recursively collect all child values
      const result = this.collectChildValues(path, pathInfo.children, data);
      return result;
    }

    // This is a leaf path or dynamic path
    const keys = path.split(".");

    // Try to get mapped field
    let field: string;
    let remainingKeys: string[] = [];

    try {
      field = this.mapPathToField(path);
    } catch (error) {
      // Path not found, might be dynamic path in JSON field
      // Try to find the closest parent path
      for (let i = keys.length - 1; i > 0; i--) {
        const parentPath = keys.slice(0, i).join(".");
        try {
          field = this.mapPathToField(parentPath);
          remainingKeys = keys.slice(i);
          break;
        } catch {
          // Try next parent
        }
      }

      if (!field!) {
        throw error;
      }
    }

    const fieldValue = data[field as keyof typeof data];

    // If we have remaining keys, extract nested value from JSON field
    if (remainingKeys.length > 0) {
      return this.extractValue(fieldValue, remainingKeys);
    }

    return fieldValue;
  }

  /**
   * Set value by path with type safety
   */
  public async set(path: string, value: any): Promise<void> {
    await this.ensureGuild();

    // Check if this is a parent path (has children)
    const pathInfo = GuildPathMap[path];

    if (pathInfo && pathInfo.children && pathInfo.children.length > 0) {
      // This is a parent path, set all child values recursively
      await this.setChildValues(path, pathInfo.children, value);
      this.data = null;
      return;
    }

    const keys = path.split(".");
    let field: string | undefined;
    let remainingKeys: string[] = [];

    // First check if this path has a direct field mapping
    const directField = GuildFieldMap[path];
    if (directField) {
      field = directField;
    } else {
      // Path not found, might be dynamic path in JSON field
      // Try to find the closest parent path with a field
      for (let i = keys.length - 1; i > 0; i--) {
        const parentPath = keys.slice(0, i).join(".");
        const parentField = GuildFieldMap[parentPath];
        if (parentField) {
          field = parentField;
          remainingKeys = keys.slice(i);
          break;
        }
      }

      if (!field) {
        throw new Error(
          `Unknown guild path: ${path}. Please regenerate mappings with 'npm run generate:schema'`,
        );
      }
    }

    // For JSON fields with nested paths, we need to update the whole field
    if (remainingKeys.length > 0) {
      // Get current data
      const currentData = await prisma.guild.findUnique({
        where: { id: this.id },
      });

      const currentValue = (currentData?.[field as keyof typeof currentData] || {}) as any;
      const updatedValue = this.setNestedValue(currentValue, remainingKeys, value);

      await prisma.guild.update({
        where: { id: this.id },
        data: { [field]: updatedValue },
      });
    } else {
      // Direct field update
      await prisma.guild.update({
        where: { id: this.id },
        data: { [field]: value },
      });
    }

    // Invalidate cache
    this.data = null;
  }

  /**
   * Set nested value in object (immutable)
   */
  private setNestedValue(obj: any, keys: string[], value: any): any {
    if (keys.length === 0) return value;

    const result = typeof obj === "object" && obj !== null ? { ...obj } : {};
    const [currentKey, ...restKeys] = keys;

    if (restKeys.length === 0) {
      result[currentKey] = value;
    } else {
      result[currentKey] = this.setNestedValue(result[currentKey], restKeys, value);
    }

    return result;
  }

  /**
   * Atomically increment a numeric column and return the new value.
   * Used for counters that must never collide (e.g. moderation case numbers).
   */
  public async increment(path: string, by = 1): Promise<number> {
    const field = GuildFieldMap[path];
    if (!field) {
      throw new Error(
        `Unknown guild path: ${path}. Please regenerate mappings with 'npm run generate:schema'`,
      );
    }

    await this.ensureGuild();

    const row = await prisma.guild.update({
      where: { id: this.id },
      data: { [field]: { increment: by } } as any,
      select: { [field]: true } as any,
    });

    this.data = null;
    return (row as any)[field] as number;
  }

  /**
   * Atomic add for direct numeric columns, returns false for composite paths
   */
  private async tryIncrement(path: string, value: number): Promise<boolean> {
    const field = GuildFieldMap[path];
    if (!field) return false;

    await this.ensureGuild();
    await prisma.guild.update({
      where: { id: this.id },
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
   * Get all guild data
   */
  public async all(): Promise<Guild> {
    return await this.ensureGuild();
  }

  /**
   * Recursively collect child values for a parent path
   */
  private collectChildValues(parentPath: string, children: string[], data: any): any {
    const result: any = {};

    for (const childKey of children) {
      const childPath = `${parentPath}.${childKey}`;
      const childInfo = GuildPathMap[childPath];

      if (!childInfo) continue;

      if (childInfo.children && childInfo.children.length > 0) {
        // This child is also a parent, recurse
        result[childKey] = this.collectChildValues(childPath, childInfo.children, data);
      } else if (childInfo.field) {
        // This is a leaf node with a direct field mapping
        result[childKey] = data[childInfo.field as keyof typeof data];
      }
    }

    return result;
  }

  /**
   * Recursively set child values for a parent path
   */
  private async setChildValues(parentPath: string, children: string[], value: any): Promise<void> {
    if (!value || typeof value !== "object") return;

    const updateData: Record<string, any> = {};

    // Collect all field updates
    this.collectFieldUpdates(parentPath, children, value, updateData);

    // Perform single update with all fields
    if (Object.keys(updateData).length > 0) {
      await prisma.guild.update({
        where: { id: this.id },
        data: updateData,
      });
    }
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
    for (const childKey of children) {
      const childPath = `${parentPath}.${childKey}`;
      const childInfo = GuildPathMap[childPath];
      const childValue = value[childKey];

      if (childValue === undefined) continue;

      if (!childInfo) continue;

      if (childInfo.children && childInfo.children.length > 0) {
        // This child is also a parent, recurse
        this.collectFieldUpdates(childPath, childInfo.children, childValue, updateData);
      } else if (childInfo.field) {
        // This is a leaf node with a direct field mapping
        updateData[childInfo.field] = childValue;
      }
    }
  }

  /**
   * Map dot-notation path to Prisma field using auto-generated mapping
   */
  private mapPathToField(path: string): string {
    const field = GuildFieldMap[path];

    if (!field) {
      throw new Error(
        `Unknown guild path: ${path}. Please regenerate mappings with 'npm run generate:schema'`,
      );
    }

    return field;
  }

  /**
   * Extract nested value from object
   */
  private extractValue(obj: any, keys: string[]): any {
    if (keys.length === 0 || !obj) return obj;

    // For JSON fields
    if (typeof obj === "object" && keys.length > 0) {
      return keys.reduce((acc, key) => acc?.[key], obj);
    }

    return obj;
  }
}
