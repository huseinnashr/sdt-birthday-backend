import { ClassConstructor, plainToInstance } from "class-transformer";
import { RedisClientType, SetOptions } from "redis";
import { Nullable, PromiseSafe, PromiseSafeVoid } from "../safecatch/safecatch.type.js";
import { safeCatch, safeCatchPromise } from "../safecatch/safecatch.pkg.js";
import { AppError } from "../apperror/apperror.pkg.js";

export class RedisWrapper {
  constructor(private redis: RedisClientType) { }

  async exists(key: string): PromiseSafe<number> {
    const res = await safeCatchPromise(() => this.redis.exists(key))
    if (res instanceof AppError) {
      return new AppError("failed to set data in redis", res)
    }

    return res
  }

  async set<T>(key: string, data: T, option: SetOptions): PromiseSafe<string> {
    const res = await safeCatchPromise(() => this.redis.set(key, JSON.stringify(data), option))
    if (res instanceof AppError) {
      return new AppError("failed to set data in redis", res)
    }

    return res || ""
  }

  async del(key: string): PromiseSafeVoid {
    const res = await safeCatchPromise(() => this.redis.del(key))
    if (res instanceof AppError) {
      return new AppError("failed to delete data in redis", res)
    }

    return null
  }

  async get<T>(key: string, cls: ClassConstructor<T>): PromiseSafe<Nullable<T>> {

    const res = await safeCatchPromise(() => this.redis.get(key))
    if (res instanceof AppError) {
      return new AppError("failed to get data in redis", res)
    }

    if (res == null) {
      return null
    }

    const jsonData = safeCatch(() => JSON.parse(res))
    if (jsonData instanceof AppError) {
      return new AppError("Failed to parse json", jsonData)
    }

    const data = safeCatch(() => plainToInstance(cls, jsonData))
    if (data instanceof AppError) {
      return new AppError("Failed to transform json to instance T", data)
    }

    return data
  }
}