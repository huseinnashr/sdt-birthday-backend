import { PromiseSafeVoid } from "../../pkg/safecatch/safecatch.type.js";
import pg from 'pg'
import { safeCatchPromise } from "../../pkg/safecatch/safecatch.pkg.js";
import { AppError } from "../../pkg/apperror/apperror.pkg.js";
import { Logger } from "../../pkg/logger/logger.pkg.js";
import { Config } from "../../config/config.entity.js";
import { ItemRepository } from "../../repo/item/item.repo.js";
import { ItemUsecase } from "../../usecase/item/item.usecase.js";
import { ItemController } from "../../controller/cron/item/item.cron.controller.js";
import cron from 'node-cron'
import { Obj } from "../../pkg/objectfactory/objectfactory.pkg.js";
import { BidUsecase } from "../../usecase/bid/bid.usecase.js";
import { UserRepository } from "../../repo/user/user.repo.js";
import redis, { RedisClientType } from 'redis'
import { RedisWrapper } from "../../pkg/rediswrapper/rediswrapper.pkg.js";
import { BidRepository } from "../../repo/bid/bid.repo.js";
import { BidController } from "../../controller/cron/bid/bid.cron.controller.js";
import { QueryRunner } from "../../pkg/poolclient/poolclient.pkg.js";

export async function runApp(cfg: Config, logger: Logger): PromiseSafeVoid {
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

  const itemUc = new ItemUsecase(cfg, itemRepo)
  const bidUc = new BidUsecase(cfg, queryRunner, itemRepo, userRepo, bidRepo)

  const itemCtrl = new ItemController(itemUc)
  const bidCtrl = new BidController(bidUc)

  const appCron = new AppCron(logger)
  appCron.register("*/3 * * * * *", async () => itemCtrl.completingItem(), Obj.make(CronConfig, { name: "expiring_item", singleton: true }))
  appCron.register("*/3 * * * * *", async () => itemCtrl.pickWinner(), Obj.make(CronConfig, { name: "pick_winner", singleton: true, msOffset: 250 }))
  appCron.register("*/3 * * * * *", async () => bidCtrl.refundParticipant(), Obj.make(CronConfig, { name: "refund_participant", singleton: true, msOffset: 500 }))
  appCron.register("*/3 * * * * *", async () => bidCtrl.payCreator(), Obj.make(CronConfig, { name: "pay_creator", singleton: true, msOffset: 550 }))

  return null
}

export class CronConfig {
  name: string = ""
  singleton: boolean = false
  msOffset: number = 0
}

export class AppCron {
  private tasks = new Map<string, cron.ScheduledTask>()

  constructor(private logger: Logger) { }

  register(cronExpression: string, func: () => PromiseSafeVoid, config: CronConfig) {
    console.log("Registering cron:", config)

    var isRunning = false

    const task = cron.schedule(cronExpression, async () => {
      if (config.singleton == true && isRunning == true) {
        return
      }
      isRunning = true

      await new Promise((r) => setTimeout(r, config.msOffset))

      console.time("cron:" + config.name)
      const funcErr = await func()
      if (funcErr != null) {
        this.logger.logError("cron error occured", funcErr)
      }
      console.timeEnd("cron:" + config.name)

      isRunning = false
    })

    this.tasks.set(config.name, task)
  }
}