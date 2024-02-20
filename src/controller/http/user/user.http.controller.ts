import { AppError } from "../../../pkg/apperror/apperror.pkg.js";
import { UserUsecase } from "../../../usecase/user/user.usecase.js";
import { AuthContextData } from "../auth/auth.http.entity.js";
import { HttpError, PromiseSafe } from "../error.http.js";
import { DepositRequest, DepositResponse, GetBalanceResponse } from "./user.http.entity.js";

export class UserController {
  constructor(private userUc: UserUsecase) { }

  async getBalance(ctx: AuthContextData): PromiseSafe<GetBalanceResponse> {
    const balance = await this.userUc.getBalance(ctx.user.id)
    if (balance instanceof AppError) {
      return HttpError.toHttpError(balance)
    }

    return { balance }
  }

  async deposit(ctx: AuthContextData, depositReq: DepositRequest): PromiseSafe<DepositResponse> {
    const depositErr = await this.userUc.deposit(ctx.user.id, depositReq.amount)
    if (depositErr instanceof AppError) {
      return HttpError.toHttpError(depositErr)
    }

    return { message: "Deposit success" }
  }
}