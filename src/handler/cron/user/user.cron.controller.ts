import { UserUsecase } from "../../../usecase/user/user.usecase.js";
import { AppError } from "../../../pkg/apperror/apperror.pkg.js";
import { batchRunner } from "../../../pkg/batchrunner/batchrunner.pkg.js";
import { PromiseSafeVoid } from "../../../pkg/safecatch/safecatch.type.js";

export class UserHandler {
  constructor(private userUc: UserUsecase) { }

  async sendBirthday(): PromiseSafeVoid {
    const res = await batchRunner((nextId) => this.userUc.sendBirthdayBatch(nextId))
    if (res instanceof AppError) {
      return new AppError("Failed to run finish item uc batch", res)
    }

    return null
  }
}