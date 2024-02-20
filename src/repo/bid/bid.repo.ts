import { PoolClient, QueryRunner } from "../../pkg/poolclient/poolclient.pkg.js";
import { AppError } from "../../pkg/apperror/apperror.pkg.js";
import { QueryBuilder } from "../../pkg/querybuilder/querybuilder.pkg.js";
import { BidEntity, BidIdEntity, CreateBidRes, DeactivateBidRes } from "./bid.entity.js";
import { Nullable, PromiseSafe, PromiseSafeVoid } from "../../pkg/safecatch/safecatch.type.js";
import { safeCatchPromise } from "../../pkg/safecatch/safecatch.pkg.js";
import { RedisWrapper } from "../../pkg/rediswrapper/rediswrapper.pkg.js";
import { BidCooldownKeyPrefix } from "./bid.const.js";
import { PaginationRequest, PaginationResponseT } from "../../pkg/pagination/pagination.pkg.js";

export class BidRepository {
  constructor(private queryRunner: QueryRunner, private auctionRedis: RedisWrapper) { }

  async getAll(itemId: number, pagination: PaginationRequest): PromiseSafe<PaginationResponseT<BidEntity[]>> {
    return this.queryRunner.withConn((conn) => this._getAll(itemId, pagination, conn))
  }

  private async _getAll(itemId: number, pagination: PaginationRequest, conn: PoolClient): PromiseSafe<PaginationResponseT<BidEntity[]>> {
    const qb = new QueryBuilder(`
      SELECT 
        bid.*, 
        (item.winner_bid_id = bid.id) as is_winner, 
        u.username as bidder_username
      FROM bid 
      LEFT JOIN item ON item.id = bid.item_id 
      LEFT JOIN "user" u ON u.id = bid.user_id
      WHERE bid.item_id = ?`, itemId)

    if (pagination.nextId > 0) {
      qb.addQuery(`AND bid.id <= ?`, pagination.nextId)
    }
    qb.addQuery(`ORDER BY bid.id DESC LIMIT ?`, pagination.getLimit())

    const bids = await safeCatchPromise(() => conn.execRows(qb, BidEntity))
    if (bids instanceof AppError) {
      return new AppError("Failed to exec query", bids)
    }

    return pagination.toResponse(bids)
  }

  async getAllByUser(userId: number, onlyActive: boolean, pagination: PaginationRequest): PromiseSafe<PaginationResponseT<BidEntity[]>> {
    return this.queryRunner.withConn((conn) => this._getAllByUser(userId, onlyActive, pagination, conn))
  }

  private async _getAllByUser(userId: number, onlyActive: boolean, pagination: PaginationRequest, conn: PoolClient): PromiseSafe<PaginationResponseT<BidEntity[]>> {
    const qb = new QueryBuilder(`
      SELECT 
        bid.*, 
        (item.winner_bid_id = bid.id) as is_winner, 
        item.name as item_name,
        item.status as item_status
      FROM bid JOIN item ON item.id = bid.item_id
      WHERE bid.user_id = ?`, userId)

    if (onlyActive) {
      qb.addString(`AND bid.is_active = true`)
    }

    if (pagination.nextId > 0) {
      qb.addQuery(`AND bid.id <= ?`, pagination.nextId)
    }
    qb.addQuery(`ORDER BY bid.id DESC LIMIT ?`, pagination.getLimit())

    const bids = await safeCatchPromise(() => conn.execRows(qb, BidEntity))
    if (bids instanceof AppError) {
      return new AppError("Failed to exec query", bids)
    }

    return pagination.toResponse(bids)
  }

  async setCooldown(userId: number, ttl: number): PromiseSafeVoid {
    const key = BidCooldownKeyPrefix + ":" + userId
    const res = await this.auctionRedis.set(key, true, { EX: ttl })
    if (res instanceof AppError) {
      return new AppError("Error exec set redis", res)
    }

    if (res != "OK") {
      return new AppError("Set Cooldown not OK")
    }

    return null
  }

  async cooldownExists(userId: number): PromiseSafe<boolean> {
    const key = BidCooldownKeyPrefix + ":" + userId
    const exists = await this.auctionRedis.exists(key)
    if (exists instanceof AppError) {
      return new AppError("Error exec exists redis", exists)
    }

    if (exists == 0) {
      return false
    }

    return true
  }

  async getHighest(itemId: number, conn: PoolClient): PromiseSafe<Nullable<BidEntity>> {
    const qb = new QueryBuilder("SELECT * FROM bid WHERE item_id = ? ORDER BY amount DESC LIMIT 1", itemId)

    const res = await conn.execRow(qb, BidEntity)
    if (res instanceof AppError) {
      return new AppError("failed to exec select query", res)
    }

    return res
  }
  async deactivatePrevBid(itemId: number, userId: number, conn: PoolClient): PromiseSafe<number> {
    const qb = new QueryBuilder(`
      UPDATE bid SET is_active = false, is_returned = true 
      FROM (
        SELECT bid.id AS id, bid.amount AS amount 
        FROM bid WHERE item_id = ? AND user_id = ? AND is_active = true 
        ORDER BY amount DESC LIMIT 1
      ) AS b 
      WHERE bid.id = b.id 
      RETURNING b.amount
    `, itemId, userId)

    const res = await conn.execRow(qb, DeactivateBidRes)
    if (res instanceof AppError) {
      return new AppError("failed to exec select query", res)
    }

    return res?.amount || 0
  }

  async create(userId: number, itemId: number, amount: number, conn: PoolClient): PromiseSafeVoid {
    const qb = new QueryBuilder("INSERT INTO bid(item_id, user_id, amount) VALUES (?, ?, ?) RETURNING id", itemId, userId, amount)

    const res = await conn.execRow(qb, CreateBidRes)
    if (res instanceof AppError) {
      return new AppError("failed to insert to db", res)
    }

    if (res == null) {
      return new AppError("insert id not found")
    }

    return null
  }

  async refund(pagination: PaginationRequest, conn: PoolClient): PromiseSafe<PaginationResponseT<BidIdEntity[]>> {
    const qb = new QueryBuilder(`
      UPDATE "bid" b set is_returned = true FROM (
        SELECT b.id FROM "bid" b JOIN "item" i ON i.id = b.item_id 
        WHERE b.is_active = true AND b.is_returned = false 
        AND b.id != i.winner_bid_id AND b.id >= ? ORDER BY b.id ASC LIMIT ?
      ) AS ub 
      WHERE ub.id = b.id RETURNING ub.id 
    `, pagination.nextId, pagination.getLimit())

    const refundedBids = await safeCatchPromise(() => conn.execRows(qb, BidIdEntity))
    if (refundedBids instanceof AppError) {
      return new AppError("Failed to pick refund bid", refundedBids)
    }

    return pagination.toResponse(refundedBids)
  }

  async pay(pagination: PaginationRequest, conn: PoolClient): PromiseSafe<PaginationResponseT<BidIdEntity[]>> {
    const qb = new QueryBuilder(`
      UPDATE "bid" b set is_paid = true FROM (
        SELECT b.id FROM "bid" b JOIN "item" i ON i.id = b.item_id 
        WHERE b.is_active = true AND b.is_paid = false 
        AND b.id = i.winner_bid_id AND b.id >= ? ORDER BY b.id ASC LIMIT ?
      ) AS ub 
      WHERE ub.id = b.id RETURNING ub.id 
    `, pagination.nextId, pagination.getLimit())

    const paidBids = await safeCatchPromise(() => conn.execRows(qb, BidIdEntity))
    if (paidBids instanceof AppError) {
      return new AppError("Failed to pick paid bid", paidBids)
    }

    return pagination.toResponse(paidBids)
  }
}