import { SendEmailRes, UserEntity } from "./user.repo.entity.js";
import { Nullable, PromiseSafe, PromiseSafeVoid } from "../../pkg/safecatch/safecatch.type.js";
import { CreateUserRequest, UpdateUserRequest } from "../../handler/http/user/user.http.entity.js";

export interface IUserRepository {
    get(userId: number): PromiseSafe<Nullable<UserEntity>>
    create(req: CreateUserRequest): PromiseSafe<number>
    update(req: UpdateUserRequest): PromiseSafeVoid
    delete(userId: number): PromiseSafeVoid
    getAllRunningBirthday(nextId: number, limit: number): PromiseSafe<UserEntity[]>
    sendBirthday(email: string, fullname: string): PromiseSafe<SendEmailRes>
    flagSend(userId: number): PromiseSafeVoid
}