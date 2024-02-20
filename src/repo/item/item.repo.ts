import { Nullable, PromiseSafe, PromiseSafeVoid } from "../../pkg/safecatch/safecatch.type.js";
import { CreateItemRes, GetItemFilter, ItemEntity, ItemIdEntity, GetAllItemFilter } from "./item.entity.js";
import { QueryRunner, PoolClient } from "../../pkg/poolclient/poolclient.pkg.js";
import { QueryBuilder } from "../../pkg/querybuilder/querybuilder.pkg.js";
import { safeCatchPromise } from "../../pkg/safecatch/safecatch.pkg.js";
import { AppError } from "../../pkg/apperror/apperror.pkg.js";
import { ItemStatus } from "./item.enum.js";
import { PaginationRequest, PaginationResponseT } from "../../pkg/pagination/pagination.pkg.js";
import { Obj } from "../../pkg/objectfactory/objectfactory.pkg.js";

export class ItemRepository {
  constructor(private queryRunner: QueryRunner) { }

  async getOne(filter: GetItemFilter): PromiseSafe<Nullable<ItemEntity>> {
    const items = await this.queryRunner.withConn((conn) => this._getAll(Obj.make(GetAllItemFilter, { userId: filter.userId }), Obj.make(PaginationRequest, { nextId: filter.itemId, limit: 1, omitNext: true }), conn))
    if (items instanceof AppError) {
      return items
    }

    if (items.data.length == 0) {
      return null
    }

    return items.data[0]
  }

  async getAll(filter: GetAllItemFilter, pagination: PaginationRequest): PromiseSafe<PaginationResponseT<ItemEntity[]>> {
    return this.queryRunner.withConn((conn) => this._getAll(filter, pagination, conn))
  }

  private async _getAll(filter: GetAllItemFilter, pagination: PaginationRequest, conn: PoolClient): PromiseSafe<PaginationResponseT<ItemEntity[]>> {
    const qb = new QueryBuilder(`
      SELECT item.*, c.id as creator_id, c.username as creator_username,
        (SELECT COUNT(id) FROM bid WHERE bid.item_id = item.id) as bid_count, 
        (SELECT COALESCE(MAX(amount), item.start_price) FROM bid WHERE bid.item_id = item.id) as bid_amount, 
        u.username as winner_username, b.amount as winner_amount FROM item 
      LEFT JOIN "user" c ON c.id = item.created_by
      LEFT JOIN "bid" b ON b.id = item.winner_bid_id 
      LEFT JOIN "user" u ON u.id = b.user_id
      WHERE 1=1
    `)

    if (filter.status.length > 0) {
      const query = `AND item.status IN (${new Array(filter.status.length).fill("?").join(",")})`
      qb.addQuery(query, ...filter.status)
    }

    if (filter.userId) {
      qb.addQuery(`AND item.created_by = ?`, filter.userId)
    }

    if (pagination.isGet()) {
      qb.addQuery(`AND item.id = ?`, pagination.nextId)
    } else if (pagination.nextId > 0) {
      qb.addQuery(`AND item.id <= ?`, pagination.nextId)
    }
    qb.addQuery(`ORDER BY id DESC LIMIT ?`, pagination.getLimit())

    const items = await safeCatchPromise(() => conn.execRows(qb, ItemEntity))
    if (items instanceof AppError) {
      return new AppError("Failed to exec query", items)
    }

    return pagination.toResponse(items)
  }

  async getSimpleTx(filter: GetItemFilter, conn: PoolClient): PromiseSafe<Nullable<ItemEntity>> {
    return this._getSimple(filter, conn)
  }

  async getSimple(filter: GetItemFilter): PromiseSafe<Nullable<ItemEntity>> {
    return this.queryRunner.withConn((conn) => this._getSimple(filter, conn))
  }

  private async _getSimple(filter: GetItemFilter, conn: PoolClient): PromiseSafe<Nullable<ItemEntity>> {
    const qb = new QueryBuilder("SELECT *, created_by as creator_id FROM item WHERE id = ?", filter.itemId)

    if (filter.status.length > 0) {
      const query = `AND status IN (${new Array(filter.status.length).fill("?").join(",")})`
      qb.addQuery(query, ...filter.status)
    }

    const item = await safeCatchPromise(() => conn.execRow(qb, ItemEntity))
    if (item instanceof AppError) {
      return new AppError("Failed to exec query", item)
    }

    return item
  }

  async create(name: string, startPrice: number, timeWindow: number, createdBy: number,): PromiseSafe<number> {
    return this.queryRunner.withConn((conn) => this._create(name, startPrice, timeWindow, createdBy, conn))
  }

  private async _create(name: string, startPrice: number, timeWindow: number, createdBy: number, conn: PoolClient): PromiseSafe<number> {
    const qb = new QueryBuilder("INSERT INTO item(name, start_price, time_window, created_by) VALUES (?, ?, ?, ?) RETURNING id", name, startPrice, timeWindow, createdBy)

    const createItemRes = await safeCatchPromise(() => conn.execRowOrFailed(qb, CreateItemRes))
    if (createItemRes instanceof AppError) {
      return new AppError("Failed to exec insert query", createItemRes)
    }

    return createItemRes.id
  }

  async publish(itemId: number): PromiseSafeVoid {
    return this.queryRunner.withConn((conn) => this._publish(itemId, conn))
  }

  private async _publish(itemId: number, conn: PoolClient): PromiseSafeVoid {
    const qb = new QueryBuilder("UPDATE item SET status = ?, started_at = NOW() WHERE id = ?", ItemStatus.ONGOING, itemId)

    const updateErr = await safeCatchPromise(() => conn.exec(qb))
    if (updateErr instanceof AppError) {
      return new AppError("Failed to update status query", updateErr)
    }

    return null
  }

  async finish(pagination: PaginationRequest): PromiseSafe<PaginationResponseT<ItemIdEntity[]>> {
    return this.queryRunner.withConn((conn) => this._finish(pagination, conn))
  }

  private async _finish(pagination: PaginationRequest, conn: PoolClient): PromiseSafe<PaginationResponseT<ItemIdEntity[]>> {
    const qb = new QueryBuilder(`
      UPDATE "item" i SET status = ? FROM (
        SELECT id FROM item WHERE status = ? 
        AND NOW() >= (started_at + time_window * INTERVAL '1 SECOND')
        AND id >= ? ORDER BY id ASC LIMIT ?
      ) as item
      where item.id = i.id 
      RETURNING item.id
    `, ItemStatus.FINISHED, ItemStatus.ONGOING, pagination.nextId, pagination.getLimit())

    const finishedItems = await safeCatchPromise(() => conn.execRows(qb, ItemIdEntity))
    if (finishedItems instanceof AppError) {
      return new AppError("Failed to exec finish query", finishedItems)
    }

    return pagination.toResponse(finishedItems)
  }

  async pickWinner(pagination: PaginationRequest): PromiseSafe<PaginationResponseT<ItemIdEntity[]>> {
    return this.queryRunner.withConn((conn) => this._pickWinner(pagination, conn))
  }

  private async _pickWinner(pagination: PaginationRequest, conn: PoolClient): PromiseSafe<PaginationResponseT<ItemIdEntity[]>> {
    const qb = new QueryBuilder(`
      UPDATE "item" i SET winner_bid_id = bid.id FROM (
        SELECT DISTINCT ON (b.item_id) b.id, b.item_id FROM "bid" b 
        JOIN "item" i ON i.id = b.item_id AND i.status = ?
        WHERE i.winner_bid_id IS NULL AND b.item_id >= ? ORDER BY b.item_id ASC, b.amount DESC LIMIT ?
      ) AS bid
      WHERE i.id = bid.item_id 
      RETURNING i.id
    `, ItemStatus.FINISHED, pagination.nextId, pagination.getLimit())

    const itemWinners = await safeCatchPromise(() => conn.execRows(qb, ItemIdEntity))
    if (itemWinners instanceof AppError) {
      return new AppError("Failed to exec pick winner query", itemWinners)
    }

    return pagination.toResponse(itemWinners)
  }
}