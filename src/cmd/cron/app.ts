import { PromiseSafeVoid } from "../../pkg/safecatch/safecatch.type.js";
import pg from 'pg'
import { safeCatchPromise } from "../../pkg/safecatch/safecatch.pkg.js";
import { AppError } from "../../pkg/apperror/apperror.pkg.js";
import { Logger } from "../../pkg/logger/logger.pkg.js";
import { Config } from "../../config/config.entity.js";
import { UserHandler } from "../../handler/cron/user/user.cron.controller.js";
import cron from 'node-cron'
import { Obj } from "../../pkg/objectfactory/objectfactory.pkg.js";
import { UserUsecase } from "../../usecase/user/user.usecase.js";
import { UserRepository } from "../../repo/user/user.repo.js";
import redis, { RedisClientType } from 'redis'
import { QueryRunner } from "../../pkg/poolclient/poolclient.pkg.js";
import { HttpClient } from "../../pkg/httpclient/httpclient.pkg.js";

export async function runApp(cfg: Config, logger: Logger): PromiseSafeVoid {
  const birthdayDB = new pg.Pool({ connectionString: cfg.birthdayDB.connectionString, min: 10, max: 20 })
  const auctionDBErr = await safeCatchPromise(() => birthdayDB.connect())
  if (auctionDBErr instanceof AppError) {
    return new AppError("failed to connect auction DB", auctionDBErr)
  }

  const auctionRedis: RedisClientType = redis.createClient({ url: cfg.birthdayRedis.url })
  const auctionRedisErr = await safeCatchPromise(() => auctionRedis.connect())
  if (auctionRedisErr instanceof AppError) {
    return new AppError("failed to initialized auction redis", auctionRedisErr)
  }

  const queryRunner = new QueryRunner(logger, birthdayDB)
  const emailServiceClient = new HttpClient("https://email-service.digitalenvision.com.au")

  const userRepo = new UserRepository(queryRunner, emailServiceClient)

  const itemUc = new UserUsecase(cfg, logger, userRepo)

  const userHandler = new UserHandler(itemUc)

  const appCron = new AppCron(logger)
  appCron.register("*/15 * * * * *", async () => userHandler.sendBirthday(), Obj.make(CronConfig, { name: "send_birthday", singleton: true }))
  // simulate concurrency, in reality we'll be doing multiple deployment insteead of registering duplicates cron within the same service
  appCron.register("*/15 * * * * *", async () => userHandler.sendBirthday(), Obj.make(CronConfig, { name: "send_birthday_2", singleton: true }))

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