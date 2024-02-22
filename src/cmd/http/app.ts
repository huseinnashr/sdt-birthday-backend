import { PromiseSafeVoid } from "../../pkg/safecatch/safecatch.type.js";
import { UserRepository } from "../../repo/user/user.repo.js";
import { AppRoute, EmptyContextController } from "../../handler/http/route.http.js";
import pg from 'pg'
import { safeCatchPromise } from "../../pkg/safecatch/safecatch.pkg.js";
import { AppError } from "../../pkg/apperror/apperror.pkg.js";
import { Logger } from "../../pkg/logger/logger.pkg.js";
import { Config } from "../../config/config.entity.js";
import { UserHandler } from "../../handler/http/user/user.http.handler.js";
import { UserUsecase } from "../../usecase/user/user.usecase.js";
import { CreateUserRequest, DeleteUserRequest, UpdateUserRequest } from "../../handler/http/user/user.http.entity.js";
import { QueryRunner } from "../../pkg/poolclient/poolclient.pkg.js";
import { HttpClient } from "../../pkg/httpclient/httpclient.pkg.js";

export async function runApp(cfg: Config, appRoute: AppRoute, logger: Logger): PromiseSafeVoid {
  const birthdayDB = new pg.Pool({ connectionString: cfg.birthdayDB.connectionString, min: 10, max: 20 })
  const auctionDBErr = await safeCatchPromise(() => birthdayDB.connect())
  if (auctionDBErr instanceof AppError) {
    return new AppError("failed to connect auction DB", auctionDBErr)
  }

  const queryRunner = new QueryRunner(logger, birthdayDB)
  const emailServiceClient = new HttpClient("https://email-service.digitalenvision.com.au")

  const userRepo = new UserRepository(queryRunner, emailServiceClient)

  const userUc = new UserUsecase(cfg, logger, userRepo)

  const emptyCtxCtrl = new EmptyContextController()
  const userHandler = new UserHandler(userUc)

  appRoute.register("post", "/users", emptyCtxCtrl, CreateUserRequest, (_, body) => userHandler.createUser(body))
  appRoute.register("put", "/users/:userId", emptyCtxCtrl, UpdateUserRequest, (_, body) => userHandler.updateUser(body))
  appRoute.register("delete", "/users/:userId", emptyCtxCtrl, DeleteUserRequest, (_, body) => userHandler.deleteUser(body))

  return null
}