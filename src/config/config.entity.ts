import { Obj } from "../pkg/objectfactory/objectfactory.pkg.js";
import { PromiseSafe } from "../pkg/safecatch/safecatch.type.js";

export class Config {
  birthdayDB: PostgreSQLConfig = new PostgreSQLConfig()
  birthdayRedis: RedisConfig = new RedisConfig()
  auth: AuthConfig = new AuthConfig()
  bid: BidConfig = new BidConfig()
  cron: CronConfig = new CronConfig()

  // Load from ENV or file or remote
  static async GetConfig(): PromiseSafe<Config> {
    return new Config()
  }
}

class PostgreSQLConfig {
  connectionString: string = "postgresql://postgres:postgres@birthday-postgres:5432/birthday"
}

class RedisConfig {
  url: string = "redis://birthday-redis:6379/"
}

class AuthConfig {
  sessionJWT: JWTConfig = Obj.make(JWTConfig, { secret: "session-secret", ttl: 7200 })
  verificationJWT: JWTConfig = Obj.make(JWTConfig, { secret: "verification-secret", ttl: 1800 })
}

class BidConfig {
  cooldownTTL: number = 5
}

class JWTConfig {
  secret: string = ""
  ttl: number = 0
}

class CronConfig {
  finishItemCron: CronUCConfig = Obj.make(CronUCConfig, { batchSize: 10 })
  pickWinnerCron: CronUCConfig = Obj.make(CronUCConfig, { batchSize: 10 })
  refundCron: CronUCConfig = Obj.make(CronUCConfig, { batchSize: 10 })
  transferCron: CronUCConfig = Obj.make(CronUCConfig, { batchSize: 10 })
}

class CronUCConfig {
  batchSize: number = 0
}