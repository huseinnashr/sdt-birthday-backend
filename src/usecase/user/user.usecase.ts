import { CreateUserRequest, UpdateUserRequest } from "../../handler/http/user/user.http.entity.js";
import { AppError } from "../../pkg/apperror/apperror.pkg.js";
import { PromiseSafe, PromiseSafeVoid } from "../../pkg/safecatch/safecatch.type.js";
import { Config } from "../../config/config.entity.js";
import { Logger } from "../../pkg/logger/logger.pkg.js";
import { IUserRepository } from "../../repo/user/user.repo.interface.js";

export class UserUsecase {
  constructor(private cfg: Config, private logger: Logger, private userRepo: IUserRepository) { }

  async createUser(req: CreateUserRequest): PromiseSafe<number> {
    const userId = await this.userRepo.create(req)
    if (userId instanceof AppError) {
      return new AppError("Failed to create new user", userId)
    }

    return userId
  }

  async updateUser(req: UpdateUserRequest): PromiseSafeVoid {
    const resGet = await this.userRepo.get(req.userId)
    if (resGet instanceof AppError) {
      return new AppError("Failed to get user", resGet)
    }

    if (resGet == null) {
      return new AppError("User is not found")
    }

    const resUpdate = await this.userRepo.update(req)
    if (resUpdate instanceof AppError) {
      return new AppError("Failed to create new user", resUpdate)
    }

    return null
  }

  async deleteUser(userId: number): PromiseSafeVoid {
    const res = await this.userRepo.delete(userId)
    if (res instanceof AppError) {
      return new AppError("Failed to create new user", res)
    }

    return null
  }

  async sendBirthdayBatch(nextId: number): PromiseSafe<number> {
    const res = await this.userRepo.getAllRunningBirthday(nextId, this.cfg.cron.sendBirthdayCron.batchSize);
    if (res instanceof AppError) {
      return new AppError("Failed to get running birthday", res)
    }
    
    if (res.length == 0) {
      return 0
    }

    const sendAndFlags = res.map<PromiseSafeVoid>((user) => (async () => {
      const resSend = await this.userRepo.sendBirthday("test@test.com", user.firstName + user.lastName);
      if (resSend instanceof AppError) {
        return resSend
      }

      if (resSend.status != "sent") {
        return new AppError("Unexpected send status")
      }

      const resFlag = await this.userRepo.flagSend(user.id);
      if (resFlag instanceof AppError) {
        return resFlag
      }
      
      return null
    })())

    
    for (const res of await Promise.all(sendAndFlags)) {
      if (res instanceof AppError) {
        this.logger.logError("error send and flag birthday", res)
      }
    }
    
    return res[res.length - 1].id
  }
}