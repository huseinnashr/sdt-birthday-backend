import { PromiseSafeVoid } from "../../pkg/safecatch/safecatch.type.js";
import { UserRepository } from "../../repo/user/user.repo.js";
import { AuthUsecase } from "../../usecase/auth/auth.usecase.js";
import { AuthController } from "../../controller/http/auth/auth.http.controller.js";
import { LoginRequest, RegisterRequest, ResendVerificationRequest, StatusRequest, VerifyRequest } from "../../controller/http/auth/auth.http.entity.js";
import { AppRoute, EmptyContextController, EmptyRequestData } from "../../controller/http/route.http.js";
import pg from 'pg'
import redis, { RedisClientType } from 'redis'
import { safeCatchPromise } from "../../pkg/safecatch/safecatch.pkg.js";
import { AppError } from "../../pkg/apperror/apperror.pkg.js";
import { Logger } from "../../pkg/logger/logger.pkg.js";
import { Config } from "../../config/config.entity.js";
import { BidRequest, GetAllByItemRequest, GetAllByUserRequest } from "../../controller/http/bid/bid.http.entity.js";
import { BidController } from "../../controller/http/bid/bid.http.controller.js";
import { BidUsecase } from "../../usecase/bid/bid.usecase.js";
import { RedisWrapper } from "../../pkg/rediswrapper/rediswrapper.pkg.js";
import { BidRepository } from "../../repo/bid/bid.repo.js";
import { ItemRepository } from "../../repo/item/item.repo.js";
import { UserController } from "../../controller/http/user/user.http.controller.js";
import { UserUsecase } from "../../usecase/user/user.usecase.js";
import { DepositRequest } from "../../controller/http/user/user.http.entity.js";
import { CreateItemRequest, GetAllItemRequest, GetItemRequest, PublishItemRequest } from "../../controller/http/item/item.http.entity.js";
import { ItemController } from "../../controller/http/item/item.http.controller.js";
import { ItemUsecase } from "../../usecase/item/item.usecase.js";
import { QueryRunner } from "../../pkg/poolclient/poolclient.pkg.js";

export async function runApp(cfg: Config, appRoute: AppRoute, logger: Logger): PromiseSafeVoid {
  const auctionDB = new pg.Pool({ connectionString: cfg.birthdayDB.connectionString, min: 10, max: 20 })
  const auctionDBErr = await safeCatchPromise(() => auctionDB.connect())
  if (auctionDBErr instanceof AppError) {
    return new AppError("failed to connect auction DB", auctionDBErr)
  }

  const auctionRedis: RedisClientType = redis.createClient({ url: cfg.birthdayRedis.url })
  const auctionRedisErr = await safeCatchPromise(() => auctionRedis.connect())
  if (auctionRedisErr instanceof AppError) {
    return new AppError("failed to initialized auction redis", auctionRedisErr)
  }

  const queryRunner = new QueryRunner(logger, auctionDB)
  const auctionRedisWrapper = new RedisWrapper(auctionRedis)

  const userRepo = new UserRepository(auctionDB, auctionRedisWrapper)
  const itemRepo = new ItemRepository(queryRunner)
  const bidRepo = new BidRepository(queryRunner, auctionRedisWrapper)

  const authUc = new AuthUsecase(cfg, logger, queryRunner, userRepo)
  const userUc = new UserUsecase(userRepo)
  const itemUc = new ItemUsecase(cfg, itemRepo)
  const bidUc = new BidUsecase(cfg, queryRunner, itemRepo, userRepo, bidRepo)

  const emptyCtxCtrl = new EmptyContextController()
  const authCtrl = new AuthController(authUc)
  const userCtrl = new UserController(userUc)
  const itemCtrl = new ItemController(itemUc)
  const bidCtrl = new BidController(bidUc)

  appRoute.register("post", "/auth/login", emptyCtxCtrl, LoginRequest, (_, body) => authCtrl.login(body))
  appRoute.register("post", "/auth/register", emptyCtxCtrl, RegisterRequest, (_, body) => authCtrl.register(body))
  appRoute.register("post", "/auth/resend-verification", emptyCtxCtrl, ResendVerificationRequest, (_, body) => authCtrl.resendVerification(body))
  appRoute.register("get", "/auth/verify", emptyCtxCtrl, VerifyRequest, (_, body) => authCtrl.verify(body))
  appRoute.register("post", "/auth/status", emptyCtxCtrl, StatusRequest, (_, body) => authCtrl.status(body))

  appRoute.register("get", "/user/balance", authCtrl, EmptyRequestData, (ctx) => userCtrl.getBalance(ctx))
  appRoute.register("post", "/user/deposit", authCtrl, DepositRequest, (ctx, body) => userCtrl.deposit(ctx, body))
  appRoute.register("post", "/user/item/one", authCtrl, GetItemRequest, (ctx, body) => itemCtrl.getOneCreated(ctx, body))
  appRoute.register("post", "/user/item/all", authCtrl, GetAllItemRequest, (ctx, body) => itemCtrl.getAllCreated(ctx, body))
  appRoute.register("post", "/user/bid/all", authCtrl, GetAllByUserRequest, (ctx, body) => bidCtrl.getAllByUser(ctx, body))

  appRoute.register("post", "/item/one", emptyCtxCtrl, GetItemRequest, (_, body) => itemCtrl.getOne(body))
  appRoute.register("post", "/item/all", emptyCtxCtrl, GetAllItemRequest, (_, body) => itemCtrl.getAll(body))
  appRoute.register("post", "/item/create", authCtrl, CreateItemRequest, (ctx, body) => itemCtrl.create(ctx, body))
  appRoute.register("post", "/item/publish", authCtrl, PublishItemRequest, (ctx, body) => itemCtrl.publish(ctx, body))
  appRoute.register("post", "/item/bid/all", emptyCtxCtrl, GetAllByItemRequest, (_, body) => bidCtrl.getAllByItem(body))
  appRoute.register("post", "/item/bid", authCtrl, BidRequest, (ctx, body) => bidCtrl.bid(ctx, body))

  return null
}