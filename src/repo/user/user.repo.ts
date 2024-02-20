import { AppError } from '../../pkg/apperror/apperror.pkg.js';
import { Nullable, PromiseSafe, PromiseSafeVoid } from '../../pkg/safecatch/safecatch.type.js';
import { CreateUserRes, GetUserFilter, UserEntity } from './user.entity.js';
import { QueryBuilder } from '../../pkg/querybuilder/querybuilder.pkg.js';
import { RedisWrapper } from '../../pkg/rediswrapper/rediswrapper.pkg.js';
import { LoginSessionPrefix, UserVerficationData, UserVerificationPrefix } from './user.type.js';
import pg from 'pg';
import { PoolClient } from '../../pkg/poolclient/poolclient.pkg.js';
import { Obj } from '../../pkg/objectfactory/objectfactory.pkg.js';

export class UserRepository {
  constructor(private auctionDB: pg.Pool, private auctionRedis: RedisWrapper) { }

  async create(email: string, password: string, username: string, conn: PoolClient): PromiseSafe<number> {
    const qb = new QueryBuilder(`INSERT INTO "user"(email, password, username) VALUES (?, ?, ?) RETURNING id`, email, password, username)
    const user = await conn.execRowOrFailed(qb, CreateUserRes)
    if (user instanceof AppError) {
      return new AppError("error insert user in DB", user)
    }

    return user.id
  }

  async getTx(filter: GetUserFilter, conn: PoolClient): PromiseSafe<Nullable<UserEntity>> {
    return this._get(filter, conn)
  }

  async get(filter: GetUserFilter): PromiseSafe<Nullable<UserEntity>> {
    const dbConn = await PoolClient.new(this.auctionDB)
    if (dbConn instanceof AppError) {
      return new AppError("Failed to get db conn")
    }
    const res = await this._get(filter, dbConn)
    dbConn.release()

    return res
  }

  private async _get(filter: GetUserFilter, conn: PoolClient): PromiseSafe<Nullable<UserEntity>> {
    const qb = new QueryBuilder(`SELECT * FROM "user" WHERE 1=1`)
    if (filter.id) {
      qb.addQuery("AND id = ?", filter.id)
    }

    if (filter.email) {
      qb.addQuery("AND email = ?", filter.email)
    }

    if (filter.username) {
      qb.addQuery("AND username = ?", filter.username)
    }

    qb.addQuery("LIMIT 1")

    const user = await conn.execRow(qb, UserEntity)
    if (user instanceof AppError) {
      return new AppError("error getting user from DB", user)
    }

    return user
  }

  async updateBalance(userId: number, balance: number, conn: PoolClient) {
    const qb = new QueryBuilder(`UPDATE "user" SET balance = balance + ? WHERE id = ?`, balance, userId)

    const user = await conn.execRow(qb, UserEntity)
    if (user instanceof AppError) {
      return new AppError("error getting user from DB", user)
    }

    return user
  }

  async verify(userId: number): PromiseSafeVoid {
    const dbConn = await PoolClient.new(this.auctionDB)
    if (dbConn instanceof AppError) {
      return new AppError("Failed to get db conn")
    }

    const res = await this._verify(userId, dbConn)
    dbConn.release()

    return res
  }

  private async _verify(userId: number, conn: PoolClient): PromiseSafeVoid {
    const qb = new QueryBuilder(`UPDATE "user" SET is_verified = ? WHERE id = ?`, true, userId)
    const execErr = await conn.exec(qb)
    if (execErr instanceof AppError) {
      return new AppError("error executing update user.is_verified DB", execErr)
    }

    return null
  }

  async deposit(userId: number, amount: number): PromiseSafeVoid {
    const dbConn = await PoolClient.new(this.auctionDB)
    if (dbConn instanceof AppError) {
      return new AppError("Failed to get db conn")
    }

    const res = await this._deposit(userId, amount, dbConn)
    dbConn.release()

    return res
  }

  private async _deposit(userId: number, amount: number, conn: PoolClient): PromiseSafeVoid {
    const qb = new QueryBuilder(`UPDATE "user" SET balance = balance + ? WHERE id = ?`, amount, userId)
    const execErr = await conn.exec(qb)
    if (execErr instanceof AppError) {
      return new AppError("error updating user.balance in DB", execErr)
    }

    return null
  }

  async refund(bidIds: number[], conn: PoolClient): PromiseSafeVoid {
    const qb = new QueryBuilder(`
      UPDATE "user" u SET balance = balance + bid.amount FROM(
        SELECT user_id, SUM(AMOUNT) AS amount FROM bid WHERE id IN (${new Array(bidIds.length).fill("?").join(",")}) GROUP BY user_id
      ) AS bid 
      WHERE bid.user_id = u.id
    `, ...bidIds)

    const execErr = await conn.exec(qb)
    if (execErr instanceof AppError) {
      return new AppError("error refund bid in DB", execErr)
    }

    return null
  }

  async transfer(bidIds: number[], conn: PoolClient): PromiseSafeVoid {
    const qb = new QueryBuilder(`
      UPDATE "user" u SET balance = balance + bid.amount FROM(
        SELECT item.created_by as user_id, SUM(AMOUNT) AS amount FROM bid
        JOIN item ON item.winner_bid_id = bid.id
        WHERE bid.id IN (${new Array(bidIds.length).fill("?").join(",")}) GROUP BY item.created_by
      ) AS bid 
      WHERE bid.user_id = u.id
    `, ...bidIds)

    const execErr = await conn.exec(qb)
    if (execErr instanceof AppError) {
      return new AppError("error refund bid in DB", execErr)
    }

    return null
  }

  async saveSession(user: UserEntity, ttl: number): PromiseSafe<string> {
    const sessionKey = crypto.randomUUID()
    const redisKey = LoginSessionPrefix + ":" + sessionKey

    const setErr = this.auctionRedis.set(redisKey, user, { EX: ttl })
    if (setErr instanceof AppError) {
      return new AppError("failed to set redis", setErr)
    }

    return sessionKey
  }

  async getSession(sessionKey: string): PromiseSafe<Nullable<UserEntity>> {
    const redisKey = LoginSessionPrefix + ":" + sessionKey

    const user = this.auctionRedis.get(redisKey, UserEntity)
    if (user instanceof AppError) {
      return new AppError("failed to get redis", user)
    }

    return user
  }

  async saveVerificationToken(userId: number, token: string, ttl: number): PromiseSafeVoid {
    const redisKey = UserVerificationPrefix + ":" + userId
    const setErr = this.auctionRedis.set(redisKey, Obj.make(UserVerficationData, { token }), { EX: ttl })
    if (setErr instanceof AppError) {
      return new AppError("failed to set redis", setErr)
    }

    return null
  }

  async getVerificationToken(userId: number): PromiseSafe<Nullable<string>> {
    const redisKey = UserVerificationPrefix + ":" + userId
    const verification = await this.auctionRedis.get(redisKey, UserVerficationData)
    if (verification instanceof AppError) {
      return new AppError("failed to get redis", verification)
    }

    return verification?.token || ""
  }

  async removeVerificationToken(userId: number): PromiseSafeVoid {
    const redisKey = UserVerificationPrefix + ":" + userId
    const verification = await this.auctionRedis.del(redisKey)
    if (verification instanceof AppError) {
      return new AppError("failed to delete verification token from redis", verification)
    }

    return null
  }

  async sendVerificationToken(email: string, token: string): PromiseSafeVoid {
    console.debug("Email Verification Link (" + email + "): http://localhost:3000/auth/verify?token=" + token)

    return null
  }
}