import { ValidationError } from "class-validator"
import { TracableError } from "../../pkg/apperror/apperror.pkg.js"
import { Nullable } from "../../pkg/safecatch/safecatch.type.js"
import { PromiseSafeT, PromiseSafeVoidT, SafeT } from "../../pkg/safecatch/safecatch.type.js";

export type Safe<T> = SafeT<T, HttpError>
export type PromiseSafe<T> = PromiseSafeT<T, HttpError>
export type PromiseSafeVoid = PromiseSafeVoidT<HttpError>

enum HTTPErrorCode {
  UNAUTHENTICATED = "unauthorized",
  BAD_REQUEST = "bad_request",
  SERVER_ERROR = "server_error"
}

type HTTPErrorJSON = {
  error?: { code: HTTPErrorCode, message: string },
  fieldErrors?: { source: FieldSource, data: KV<string> }
}

export class HttpError implements TracableError {
  constructor(public message: string, public code: HTTPErrorCode, public cause: Nullable<TracableError> = null) { }

  static toHttpError(ucErr: TracableError): HttpError {
    if (ucErr.cause == null && ucErr.stack == null) {
      return new HTTPBadRequest(ucErr.message, ucErr)
    }

    return new HTTPServerError(ucErr)
  }

  getMessageJSON(): HTTPErrorJSON {
    return { error: { code: this.code, message: this.message } }
  }
}

export class HTTPBadRequest extends HttpError {
  constructor(message: string, cause: Nullable<TracableError> = null) {
    super(message, HTTPErrorCode.BAD_REQUEST, cause)
  }
}

export class HTTPUnauthenticated extends HttpError {
  constructor(message: string, cause: Nullable<TracableError> = null) {
    super(message, HTTPErrorCode.UNAUTHENTICATED, cause)
  }
}

export class HTTPServerError extends HttpError {
  constructor(cause: TracableError) {
    const id = Math.random().toString(36).slice(-5)
    const message = "Internal Server Error #" + id

    super(message, HTTPErrorCode.SERVER_ERROR, cause)
  }
}

type KV<T> = { [key: string]: T }

export enum FieldSource {
  HEADER = "header",
  BODY = "body"
}
export class HTTPFieldError extends HttpError {
  private errors: KV<string> = {}

  constructor(validationErrors: ValidationError[], private source: FieldSource) {
    super("User input invalid value", HTTPErrorCode.BAD_REQUEST)
    validationErrors.forEach((v) => this.errors[v.property] = Object.entries(v.constraints ?? {}).map<string>(([, message]) => message).reduce((prev, curr) => prev + " & " + curr))
  }

  getMessageJSON(): HTTPErrorJSON {
    return { fieldErrors: { source: this.source, data: this.errors } }
  }
}
