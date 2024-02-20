import { AppError } from "../apperror/apperror.pkg.js";

export type Nullable<T> = T | null;

export type SafeT<T, V> = T | V
export type PromiseSafeT<T, V> = Promise<T | V>
export type PromiseSafeVoidT<V> = Promise<Nullable<V>>

export type Safe<T> = SafeT<T, AppError>

export type PromiseSafe<T> = PromiseSafeT<T, AppError>
export type PromiseSafeVoid = PromiseSafeVoidT<AppError>
