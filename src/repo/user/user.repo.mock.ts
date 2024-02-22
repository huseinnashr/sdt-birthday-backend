import { SendEmailRes, UserEntity } from "./user.repo.entity.js";
import { Nullable, PromiseSafe, PromiseSafeVoid } from "../../pkg/safecatch/safecatch.type.js";
import { CreateUserRequest, UpdateUserRequest } from "../../handler/http/user/user.http.entity.js";
import { IUserRepository } from "./user.repo.interface.js";

export class UserRepositoryMock implements IUserRepository {
    async get(userId: number): PromiseSafe<Nullable<UserEntity>> {
        return null
    }
    async create(req: CreateUserRequest): PromiseSafe<number> {
        throw new Error("Method not implemented.");
    }
    async update(req: UpdateUserRequest): PromiseSafeVoid {
        throw new Error("Method not implemented.");
    }
    async delete(userId: number): PromiseSafeVoid {
        throw new Error("Method not implemented.");
    }
    async getAllRunningBirthday(nextId: number, limit: number): PromiseSafe<UserEntity[]> {
        throw new Error("Method not implemented.");
    }
    async sendBirthday(email: string, fullname: string): PromiseSafe<SendEmailRes> {
        throw new Error("Method not implemented.");
    }
    async flagSend(userId: number): PromiseSafeVoid {
        throw new Error("Method not implemented.");
    }
}