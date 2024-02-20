import pg from 'pg';
import { QueryBuilder } from '../querybuilder/querybuilder.pkg.js';
import { Nullable, PromiseSafe, PromiseSafeVoid } from '../safecatch/safecatch.type.js';
import { AppError } from '../apperror/apperror.pkg.js';
import { safeCatchPromise } from '../safecatch/safecatch.pkg.js';
import { ExecResult } from './poolclient.entity.js';
import { Logger } from '../logger/logger.pkg.js';
import { Obj } from '../objectfactory/objectfactory.pkg.js';
import { ClassConstructor, unmarshallArr } from '../jsonutil/jsonutil.pkg.js';

export enum IsolationLevel {
  SERIALIZABLE = "SERIALIZABLE",
  REPEATABLE_READ = "REPEATABLE READ",
  READ_COMMITTED = "READ COMMITTED"
}

export class TransactionConfig {
  isolationLevel: IsolationLevel = IsolationLevel.READ_COMMITTED
}


export class QueryRunner {
  constructor(private logger: Logger, private pool: pg.Pool) { }

  async withConn<T>(func: (conn: PoolClient) => Promise<T>): PromiseSafe<T> {
    const conn = await PoolClient.new(this.pool)
    if (conn instanceof AppError) {
      return new AppError("Failed to get db conn", conn)
    }

    const res = await func(conn)
    conn.release()

    return res
  }

  async withTransaction<T>(func: (conn: PoolClient) => Promise<T>, config: TransactionConfig = Obj.make(TransactionConfig, {})): PromiseSafe<T> {
    const conn = await PoolClient.new(this.pool)
    if (conn instanceof AppError) {
      return new AppError("Failed to get db conn", conn)
    }

    const txErr = await conn.beginTx(config.isolationLevel)
    if (txErr instanceof AppError) {
      return new AppError("failed to begin tx", txErr)
    }

    const res = await func(conn)
    if (res instanceof AppError) {
      const rollbackErr = await conn.rollbackTx()
      if (rollbackErr instanceof AppError) {
        this.logger.logError("failed when rolling back", rollbackErr)
      }
      conn.release()

      return res
    }

    const commitErr = await conn.commitTx()
    if (commitErr instanceof AppError) {
      this.logger.logError("failed when committing", commitErr)
    }
    conn.release()

    return res
  }
}


export class PoolClient {
  constructor(private conn: pg.PoolClient) { }

  static async new(pool: pg.Pool): PromiseSafe<PoolClient> {
    const conn = await safeCatchPromise(() => pool.connect())
    if (conn instanceof AppError) {
      return new AppError("failed to get conn from pool", conn)
    }

    const client = new PoolClient(conn)

    return client
  }

  async execRowOrFailed<T>(qb: QueryBuilder, cls: ClassConstructor<T>): PromiseSafe<T> {
    const res = await this._execRows(qb, cls)
    if (res instanceof AppError) {
      return res
    }

    if (res.length == 0) {
      return new AppError("No result found from DB")
    }

    return res[0]
  }

  async execRow<T>(qb: QueryBuilder, cls: ClassConstructor<T>): PromiseSafe<Nullable<T>> {
    const res = await this._execRows(qb, cls)
    if (res instanceof AppError) {
      return res
    }

    if (res.length == 0) {
      return null
    }

    return res[0]
  }

  async execRows<T>(qb: QueryBuilder, cls: ClassConstructor<T>): PromiseSafe<T[]> {
    return this._execRows(qb, cls)
  }

  private async _execRows<T>(qb: QueryBuilder, cls: ClassConstructor<T>): PromiseSafe<T[]> {
    const rawRes = await safeCatchPromise(() => this.conn.query(qb.getQuery(), qb.getArgs()))
    if (rawRes instanceof AppError) {
      return new AppError("Failed to execute query", rawRes)
    }

    if (rawRes.rowCount == 0) {
      return []
    }

    const res = unmarshallArr(rawRes.rows, cls)
    if (res instanceof AppError) {
      return new AppError("Failed to decode result", res)
    }

    return res
  }

  async exec(qb: QueryBuilder): PromiseSafe<ExecResult> {
    const rawRes = await safeCatchPromise(() => this.conn.query(qb.getQuery(), qb.getArgs()))
    if (rawRes instanceof AppError) {
      return new AppError("Failed to execute query", rawRes)
    }

    return { rowsAffected: rawRes.rowCount?? 0 }
  }

  async beginTx(isolationLevel = IsolationLevel.READ_COMMITTED): PromiseSafeVoid {
    const beginErr = await safeCatchPromise(() => this.conn.query("BEGIN TRANSACTION ISOLATION LEVEL " + isolationLevel))
    if (beginErr instanceof AppError) {
      return new AppError("failed to exec begin query", beginErr)
    }

    return null
  }

  async commitTx(): PromiseSafeVoid {
    const beginErr = await safeCatchPromise(() => this.conn.query("COMMIT"))
    if (beginErr instanceof AppError) {
      return new AppError("failed to exec commit query", beginErr)
    }

    return null
  }

  async rollbackTx(): PromiseSafeVoid {
    const beginErr = await safeCatchPromise(() => this.conn.query("ROLLBACK"))
    if (beginErr instanceof AppError) {
      return new AppError("failed to exec rollback query", beginErr)
    }

    return null
  }


  release() {
    this.conn.release()
  }
}