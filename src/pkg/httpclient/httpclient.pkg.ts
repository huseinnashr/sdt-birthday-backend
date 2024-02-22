import { ClassConstructor, plainToInstance } from "class-transformer";
import { PromiseSafe } from "../safecatch/safecatch.type.js";
import { safeCatch, safeCatchPromise } from "../safecatch/safecatch.pkg.js";
import { AppError } from "../apperror/apperror.pkg.js";

export type HttpMethod = "get" | "post"

export class HttpClient {
  constructor(private baseUrl: string) { }

  async doJSON<T>(endpoint: string, method: HttpMethod, body: any, cls: ClassConstructor<T>): PromiseSafe<T> {
    const url = this.baseUrl + endpoint
    const req: RequestInit = { method, headers: {"Content-Type": "application/json"} }

    if (body != null) {
      req.body = JSON.stringify(body)
    }

    const res = await safeCatchPromise(() => fetch(url, req))
    if (res instanceof AppError) {
      return new AppError("failed to fetch to endpoint", res)
    }

    if (res.status > 299) {
      return new AppError(`response not ok: ${res.status} - ${res.statusText}`)
    }

    if (res.body == null) {
      return new AppError("unexpected empty body")
    }

    const resJson = safeCatchPromise(() => res.json())
    if (resJson instanceof AppError) {
      return new AppError(`Failed to parse json: ${await res.text()}`, resJson)
    }

    const resData = safeCatch(() => plainToInstance(cls, resJson))
    if (resData instanceof AppError) {
      return new AppError("Failed to transform json to instance T", resData)
    }

    return resData
  }
}