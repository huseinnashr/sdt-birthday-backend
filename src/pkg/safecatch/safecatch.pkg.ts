import { AppError } from "../apperror/apperror.pkg.js";
import { Safe, PromiseSafe } from "./safecatch.type.js";

export function safeCatch<T>(func: () => T): Safe<T> {
  try {
    return func()
  } catch (err) {
    return AppError.toAppError(err)
  }
}

export async function safeCatchPromise<T>(func: () => Promise<T>): PromiseSafe<T> {
  try {
    return await func()
  } catch (err) {
    return AppError.toAppError(err)
  }
}