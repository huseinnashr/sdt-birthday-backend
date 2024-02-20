import { AppError } from "../../pkg/apperror/apperror.pkg.js";
import { PromiseSafe, PromiseSafeVoid } from "../../pkg/safecatch/safecatch.type.js";
import { UserRepository } from "../../repo/user/user.repo.js";

export class UserUsecase {
  constructor(private userRepo: UserRepository) { }

  async getBalance(userId: number): PromiseSafe<number> {
    const user = await this.userRepo.get({ id: userId })
    if (user instanceof AppError) {
      return new AppError("Failed to deposit", user)
    }

    if (user == null) {
      return new AppError("Current user is not found")
    }

    return user?.balance
  }

  async deposit(userId: number, amount: number): PromiseSafeVoid {
    const depositErr = await this.userRepo.deposit(userId, amount)
    if (depositErr instanceof AppError) {
      return new AppError("Failed to deposit", depositErr)
    }

    return null
  }
}