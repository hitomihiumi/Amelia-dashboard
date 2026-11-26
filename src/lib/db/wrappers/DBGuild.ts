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
   * Read only the columns a path needs. One SELECT, no upsert: the row is created
   * lazily (`ensureGuild`) only when it does not exist yet.
   */
  private async readColumns(fields: string[]): Promise<Record<string, any> | null> {
    if (fields.length === 0) return {};
    const select = Object.fromEntries(fields.map((f) => [f, true]));
    const row = (await prisma.guild.findUnique({ where: { id: this.id }, select })) as Record<
      string,
      any
    > | null;
    if (row) return row;

    // First visit of a guild the bot has not stored yet: create it with defaults, then read.
    await this.ensureGuild();
    return (await prisma.guild.findUnique({ where: { id: this.id }, select })) as Record<
      string,
      any
    > | null;
  }

  /** Every column a (possibly nested) parent path resolves to. */
  private collectFields(parentPath: string, children: string[], out: Set<string>): void {
    for (const childKey of children) {
      const childPath = `${parentPath}.${childKey}`;
      const childInfo = GuildPathMap[childPath];
      if (!childInfo) continue;
      if (childInfo.children && childInfo.children.length > 0) {
        this.collectFields(childPath, childInfo.children, out);
      } else if (childInfo.field) {
        out.add(childInfo.field);
      }
    }
  }

  /**
   * For a path: the columns it needs and how to pull its value out of a row holding them.
   */
  private planRead(path: string): {
    fields: string[];
    pick: (data: Record<string, any>) => any;
  } {
    const pathInfo = GuildPathMap[path];

    if (pathInfo && pathInfo.children) {
      // Parent path: only the child columns, not the whole (very wide) row.
      const fields = new Set<string>();
      this.collectFields(path, pathInfo.children, fields);
      return {
        fields: [...fields],
        pick: (data) => this.collectChildValues(path, pathInfo.children!, data),
      };
    }

    // Leaf path or dynamic path inside a JSON column
    const keys = path.split(".");
    let field: string | undefined;
    let remainingKeys: string[] = [];

    const direct = GuildFieldMap[path];
    if (direct) {
      field = direct;
    } else {
      for (let i = keys.length - 1; i > 0; i--) {
        const parentField = GuildFieldMap[keys.slice(0, i).join(".")];
        if (parentField) {
          field = parentField;
          remainingKeys = keys.slice(i);
          break;
        }
      }
      // Throws the "Unknown guild path" error
      if (!field) field = this.mapPathToField(path);
    }

    const column = field;
    return {
      fields: [column],
      pick: (data) =>
        remainingKeys.length > 0 ? this.extractValue(data[column], remainingKeys) : data[column],
    };
  }

  /**
   * Get value by path with type inference
   * Supports parent paths (e.g., "utils.components" returns all component arrays)
   */
  public async get(path: string): Promise<any> {
    const { fields, pick } = this.planRead(path);
    const data = await this.readColumns(fields);
    if (!data) return null as any;
    return pick(data);
  }

  /**
   * Get several paths with ONE query. Pages that need a handful of settings use this
   * instead of awaiting `get` per path.
   */
  public async getMany(paths: string[]): Promise<any[]> {
    const plans = paths.map((p) => this.planRead(p));
    const fields = [...new Set(plans.flatMap((p) => p.fields))];
    const data = await this.readColumns(fields);
    if (!data) return paths.map(() => null);
    return plans.map((p) => p.pick(data));
  }

  /**
   * Write columns in ONE statement. `upsert` covers the first save of a guild the bot
   * has not stored yet, so the old "upsert, then update" round trip is gone.
   */
  private async writeColumns(data: Record<string, any>): Promise<void> {
    if (Object.keys(data).length === 0) return;
    await prisma.guild.upsert({
      where: { id: this.id },
      update: data,
      create: { id: this.id, ...data },
    });
    this.data = null;
  }

  /**
   * Resolve a path to its column and the keys left inside that (JSON) column.
   */
  private resolveWritePath(path: string): { field: string; remainingKeys: string[] } {
    const directField = GuildFieldMap[path];
    if (directField) return { field: directField, remainingKeys: [] };

    const keys = path.split(".");
    for (let i = keys.length - 1; i > 0; i--) {
      const parentField = GuildFieldMap[keys.slice(0, i).join(".")];
      if (parentField) return { field: parentField, remainingKeys: keys.slice(i) };
    }

    throw new Error(
      `Unknown guild path: ${path}. Please regenerate mappings with 'npm run generate:schema'`,
    );
  }

  /**
   * Turn path/value pairs into one column update. Several paths that land in the same
   * JSON column are merged, and a column is read only when a nested key is written.
   */
  private async buildUpdate(entries: Array<[string, any]>): Promise<Record<string, any>> {
    const updateData: Record<string, any> = {};
    const nested: Array<{ field: string; keys: string[]; value: any }> = [];

    for (const [path, value] of entries) {
      const pathInfo = GuildPathMap[path];
      if (pathInfo && pathInfo.children && pathInfo.children.length > 0) {
        // Parent path: every child column in the same update
        if (value && typeof value === "object") {
          this.collectFieldUpdates(path, pathInfo.children, value, updateData);
        }
        continue;
      }

      const { field, remainingKeys } = this.resolveWritePath(path);
      if (remainingKeys.length === 0) {
        updateData[field] = value;
      } else {
        nested.push({ field, keys: remainingKeys, value });
      }
    }

    if (nested.length > 0) {
      const fields = [...new Set(nested.map((n) => n.field))].filter((f) => !(f in updateData));
      const current = fields.length > 0 ? ((await this.readColumns(fields)) ?? {}) : {};
      for (const { field, keys, value } of nested) {
        const base = field in updateData ? updateData[field] : current[field];
        updateData[field] = this.setNestedValue(base || {}, keys, value);
      }
    }

    return updateData;
  }

  /**
   * Set value by path with type safety
   */
  public async set(path: string, value: any): Promise<void> {
    await this.writeColumns(await this.buildUpdate([[path, value]]));
  }

  /**
   * Set several paths with a single UPDATE. Settings pages that save a few related
   * paths use this instead of awaiting one `set` after another.
   */
  public async setMany(entries: Array<[string, any]>): Promise<void> {
    await this.writeColumns(await this.buildUpdate(entries));
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
