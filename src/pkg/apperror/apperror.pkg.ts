import { Nullable } from "../safecatch/safecatch.type.js"

export interface TracableError {
  message: string
  cause: Nullable<TracableError>

  stack?: string
}

export class AppError implements TracableError {
  message: string
  cause: Nullable<TracableError>
  stack?: string

  constructor(message: string, cause: Nullable<AppError> = null) {
    this.message = message
    this.cause = cause
  }

  public static toAppError(err: unknown): AppError {
    if (err instanceof Error) {
      const appErr = new AppError(err.message)
      appErr.stack = err.stack

      return appErr
    }

    if (typeof err === "string") {
      return new AppError(err)
    }

    return new AppError("unknown error")
  }
}
