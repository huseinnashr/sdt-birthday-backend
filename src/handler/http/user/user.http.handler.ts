import { AppError } from "../../../pkg/apperror/apperror.pkg.js";
import { UserUsecase } from "../../../usecase/user/user.usecase.js";
import { HttpError, PromiseSafe } from "../error.http.js";
import { CreateUserRequest, CreateUserResponse, DeleteUserRequest, DeleteUserResponse, UpdateUserRequest, UpdateUserResponse } from "./user.http.entity.js";

export class UserHandler {
  constructor(private userUc: UserUsecase) { }

  async createUser(req: CreateUserRequest): PromiseSafe<CreateUserResponse> {
    const resCreate = await this.userUc.createUser(req)
    if (resCreate instanceof AppError) {
      return HttpError.toHttpError(resCreate)
    }

    return { userId: resCreate }
  }

  async updateUser(req: UpdateUserRequest): PromiseSafe<UpdateUserResponse> {
    const balance = await this.userUc.updateUser(req)
    if (balance instanceof AppError) {
      return HttpError.toHttpError(balance)
    }

    return { message: `User ${req.userId} updated` }
  }

  async deleteUser(req: DeleteUserRequest): PromiseSafe<DeleteUserResponse> {
    const depositErr = await this.userUc.deleteUser(req.userId)
    if (depositErr instanceof AppError) {
      return HttpError.toHttpError(depositErr)
    }

    return { message: `User ${req.userId} deleted` }
  }
}