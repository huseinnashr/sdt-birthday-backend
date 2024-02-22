import { ClassConstructor, plainToInstance } from "class-transformer"
import { Application, Request, Response } from "express"
import { safeCatch, safeCatchPromise } from "../../pkg/safecatch/safecatch.pkg.js"
import { AppError } from "../../pkg/apperror/apperror.pkg.js"
import { FieldSource, HTTPFieldError, HTTPServerError, HttpError, PromiseSafe, PromiseSafeVoid } from "./error.http.js"
import { IsEmpty, validate } from "class-validator"
import { Logger } from "../../pkg/logger/logger.pkg.js"

export type HttpMethod = "get" | "post" | "delete" | "put"

// TODO: seperate context source and data
export abstract class HttpContextController<T> {
  abstract getType(): ClassConstructor<T>
  abstract populate(source: T): PromiseSafeVoid
}

export class EmptyContextData {
  @IsEmpty()
  // @ts-expect-error
  private _: string
}

export class EmptyRequestData {
  @IsEmpty()
  // @ts-expect-error
  private _: string
}


export class EmptyContextController implements HttpContextController<EmptyContextData> {
  getType(): ClassConstructor<EmptyContextData> {
    return EmptyContextData
  }

  async populate(_: EmptyContextData): PromiseSafeVoid {
    return null
  }
}

export class AppRoute {
  constructor(private server: Application, private logger: Logger) { }

  register<R, T, V>(method: HttpMethod, path: string, ctxCls: HttpContextController<R>, cls: ClassConstructor<T>, func: (ctx: R, body: T) => PromiseSafe<V>) {
    this.server[method](path, async (req: Request, res: Response) => {
      const err = await this._register(ctxCls, cls, func, req, res)
      if (err instanceof HttpError) {
        res.status(200).send(err.getMessageJSON())
        if (err instanceof HTTPServerError) {
          this.logger.logError("server error occured", err)
        }
        return
      }
    })
  }

  private async _register<R, T, V>(ctxCls: HttpContextController<R>, cls: ClassConstructor<T>, func: (ctx: R, body: T) => PromiseSafe<V>, req: Request, res: Response): PromiseSafeVoid {
    const ctx = safeCatch(() => plainToInstance(ctxCls.getType(), { token: req.headers["token"] }))
    if (ctx instanceof AppError) {
      return HttpError.toHttpError(ctx)
    }
    const ctxValidations = await validate(ctx as object, { validationError: { target: false, value: false } })
    if (ctxValidations.length > 0) {
      return new HTTPFieldError(ctxValidations, FieldSource.HEADER)
    }

    const initCtx = await ctxCls.populate(ctx)
    if (initCtx instanceof HttpError) {
      return initCtx
    }

    const body = safeCatch(() => plainToInstance(cls, { ...req.query, ...req.params, ...req.body }))
    if (body instanceof AppError) {
      return HttpError.toHttpError(body)
    }

    const bodyValidations = await validate(body as object, { validationError: { target: false, value: false } })
    if (bodyValidations.length > 0) {
      return new HTTPFieldError(bodyValidations, FieldSource.BODY)
    }

    const funcRet = await safeCatchPromise(() => func(ctx, body))
    if (funcRet instanceof AppError) {
      return HttpError.toHttpError(funcRet)
    }

    if (funcRet instanceof HttpError) {
      return funcRet
    }

    res.status(200).send(funcRet)
    return null
  }
}
