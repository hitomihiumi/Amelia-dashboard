import { GuildPathMap } from "./mappings/GuildMapping";
import { Cache } from "./Cache";
import {
  GuildSchema,
  LiteralGuildSchemaKey,
  GetSchemaValueType,
  GuildCache,
  GuildCacheKey,
  GuildSchemaKey,
} from "./types";
import { DBGuild } from "@/lib/db/wrappers/DBGuild";

export class Guild {
  public id: string;
  public cache: Cache<GuildCache, GuildCacheKey>;
  private db: DBGuild;

  constructor(guildId: string) {
    this.id = guildId;
    this.db = new DBGuild(guildId);
    this.cache = new Cache("guild_temp", guildId, GuildPathMap);
  }

  /**
   * Get value by path (ASYNC - must use await)
   * Supports both literal paths (with precise type inference) and dynamic paths
   */
  public async get<K extends LiteralGuildSchemaKey>(
    path: K,
  ): Promise<GetSchemaValueType<GuildSchema, K>>;
  public async get(path: string): Promise<any>;
  public async get(path: string): Promise<any> {
    return await this.db.get(path as any);
  }

  /**
   * Set value by path (ASYNC - must use await)
   * Supports both literal paths (with type checking) and dynamic paths
   */
  public async set<K extends LiteralGuildSchemaKey>(
    path: K,
    value: GetSchemaValueType<GuildSchema, K>,
  ): Promise<void>;
  public async set(path: string, value: any): Promise<void>;
  public async set(path: string, value: any): Promise<void> {
    return await this.db.set(path as any, value);
  }

  /**
   * Add to numeric value (ASYNC - must use await)
   * Supports both literal paths (with type checking) and dynamic paths
   */
  public async add<K extends LiteralGuildSchemaKey>(
    path: K,
    value: GetSchemaValueType<GuildSchema, K> extends number ? number : never,
  ): Promise<void>;
  public async add(path: string, value: number): Promise<void>;
  public async add(path: string, value: number): Promise<void> {
    return await this.db.add(path, value);
  }

  /**
   * Subtract from numeric value (ASYNC - must use await)
   * Supports both literal paths (with type checking) and dynamic paths
   */
  public async sub<K extends LiteralGuildSchemaKey>(
    path: K,
    value: GetSchemaValueType<GuildSchema, K> extends number ? number : never,
  ): Promise<void>;
  public async sub(path: string, value: number): Promise<void>;
  public async sub(path: string, value: number): Promise<void> {
    return await this.db.sub(path, value);
  }

  /**
   * Push to array (ASYNC - must use await)
   * Supports both literal paths (with type checking) and dynamic paths
   */
  public async push<K extends LiteralGuildSchemaKey>(
    path: K,
    value: GetSchemaValueType<GuildSchema, K> extends Array<infer T> ? T : never,
  ): Promise<void>;
  public async push(path: string, value: any): Promise<void>;
  public async push(path: string, value: any): Promise<void> {
    return await this.db.push(path, value);
  }

  /**
   * Delete field (ASYNC - must use await)
   */
  public async delete(path: GuildSchemaKey): Promise<void> {
    return await this.db.delete(path);
  }

  /**
   * Check if path exists (ASYNC - must use await)
   */
  public async has(path: string): Promise<boolean> {
    return await this.db.has(path);
  }

  /**
   * Get all guild data (ASYNC - must use await)
   */
  public async all(): Promise<any> {
    return await this.db.all();
  }
}
