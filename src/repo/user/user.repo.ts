import { AppError } from '../../pkg/apperror/apperror.pkg.js';
import { Nullable, PromiseSafe, PromiseSafeVoid } from '../../pkg/safecatch/safecatch.type.js';
import { QueryBuilder } from '../../pkg/querybuilder/querybuilder.pkg.js';
import { PoolClient, QueryRunner } from '../../pkg/poolclient/poolclient.pkg.js';
import { CreateUserRequest, UpdateUserRequest } from '../../handler/http/user/user.http.entity.js';
import { CreateUserRes, SendEmailReq, SendEmailRes, UserEntity } from './user.repo.entity.js';
import { HttpClient } from '../../pkg/httpclient/httpclient.pkg.js';
import { IUserRepository } from './user.repo.interface.js';

export class UserRepository implements IUserRepository{
  constructor(private queryRunner: QueryRunner, private httpClient: HttpClient) { }


  async get(userId: number): PromiseSafe<Nullable<UserEntity>> {
    return this.queryRunner.withConn((conn) => this._get(userId, conn))
  }

  async _get(userId: number, conn: PoolClient): PromiseSafe<Nullable<UserEntity>> {
    const qb = new QueryBuilder(
      `SELECT * FROM  "users" WHERE id = ? LIMIT 1`, userId
    )

    const user = await conn.execRow(qb, UserEntity)
    if (user instanceof AppError) {
      return new AppError("error insert user to DB", user)
    }

    return user
  }


  async create(req: CreateUserRequest): PromiseSafe<number> {
    return this.queryRunner.withConn((conn) => this._create(req, conn))
  }

  async _create(req: CreateUserRequest, conn: PoolClient): PromiseSafe<number> {
    const qb = new QueryBuilder(
      `INSERT INTO "users"(first_name, last_name, birthday, timezone) VALUES (?, ?, ?) RETURNING id`,
      req.firstName, req.lastName, req.birthday, req.timezone,
    )

    const user = await conn.execRowOrFailed(qb, CreateUserRes)
    if (user instanceof AppError) {
      return new AppError("error insert user to DB", user)
    }

    return user.id
  }


  async update(req: UpdateUserRequest): PromiseSafeVoid {
    return this.queryRunner.withConn((conn) => this._update(req, conn))
  }

  async _update(req: UpdateUserRequest, conn: PoolClient): PromiseSafeVoid {
    const qb = new QueryBuilder(
      `UPDATE "users" SET first_name = ?, last_name = ?, birthday = ?, timezone = ? WHERE id = ?`,
      req.firstName, req.lastName, req.birthday, req.timezone, req.userId,
    )

    const res = await conn.exec(qb)
    if (res instanceof AppError) {
      return new AppError("error update user from DB", res)
    }

    return null
  }

  async delete(userId: number): PromiseSafeVoid {
    return this.queryRunner.withConn((conn) => this._delete(userId, conn))
  }

  async _delete(userId: number, conn: PoolClient): PromiseSafeVoid {
    const qb = new QueryBuilder(
      `DELETE FROM "users" WHERE id = ?`, userId,
    )

    const res = await conn.exec(qb)
    if (res instanceof AppError) {
      return new AppError("error delete user from DB", res)
    }

    return null
  }

  async getAllRunningBirthday(nextId: number, limit: number): PromiseSafe<UserEntity[]> {
    return this.queryRunner.withConn((conn) => this._getAllRunningBirthday(nextId, limit, conn))
  }

  async _getAllRunningBirthday(nextId: number, limit: number, conn: PoolClient): PromiseSafe<UserEntity[]> {
    const qb = new QueryBuilder(`
      UPDATE 
        users 
      SET 
        last_run = now() 
      WHERE id IN (
        SELECT id 
        FROM 
          users 
        WHERE 
          now() - ((to_char(now(), 'YYYY') || '-' || to_char(birthday, 'MM-DD'))::timestamp - interval '1 hour' * gmt_offset) at time zone 'utc' between interval '9 hour' and interval '24 hour'
          and (last_send is null or now() - last_send > interval '48 hour')
          and (last_run is null or now() - last_run > interval '10 second')	
          and id > ?
        ORDER BY id ASC 
        LIMIT ?
        FOR UPDATE
      )
      returning 
        id,
        first_name,
        last_name,
        birthday,
        gmt_offset
    `, nextId, limit)

    const res = await conn.execRows(qb, UserEntity)
    if (res instanceof AppError) {
      return new AppError("error insert user to DB", res)
    }

    return res
  }

  async sendBirthday(email: string, fullname: string): PromiseSafe<SendEmailRes> {
    const req: SendEmailReq = { email, message: `Hey, ${fullname} it's your birthday` }
    const resDo = await this.httpClient.doJSON("/send-email", "post", req, SendEmailRes)
    if (resDo instanceof AppError) {
      return new AppError("Failed to send email", resDo)
    }

    return resDo
  }

  async flagSend(userId: number): PromiseSafeVoid {
    return this.queryRunner.withConn((conn) => this._flagSend(userId, conn))
  }

  async _flagSend(userId: number, conn: PoolClient): PromiseSafeVoid {
    const qb = new QueryBuilder(
      `UPDATE "users" SET last_send = now() WHERE id = ?`, userId
    )

    const res = await conn.exec(qb)
    if (res instanceof AppError) {
      return new AppError("error flag send to DB", res)
    }

    return null
  }
}