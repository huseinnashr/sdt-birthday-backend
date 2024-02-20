import { AuthUsecase } from "src/usecase/auth/auth.usecase.js";
import { AuthContextData, LoginRequest, LoginResponse, RegisterRequest, RegisterResponse, ResendVerificationRequest, ResendVerificationResponse, StatusRequest, StatusResponse, VerifyRequest, VerifyResponse } from "./auth.http.entity.js";
import { HttpError, PromiseSafe, PromiseSafeVoid } from "../error.http.js";
import { HttpContextController } from "../route.http.js";
import { ClassConstructor } from "class-transformer";
import { AppError } from "../../../pkg/apperror/apperror.pkg.js";

export class AuthController implements HttpContextController<AuthContextData> {
  constructor(private authUc: AuthUsecase) { }

  async login(loginReq: LoginRequest): PromiseSafe<LoginResponse> {
    const loginRes = await this.authUc.login(loginReq.email, loginReq.password)
    if (loginRes instanceof AppError) {
      return HttpError.toHttpError(loginRes)
    }

    return loginRes
  }

  async status(statusReq: StatusRequest): PromiseSafe<StatusResponse> {
    const status = await this.authUc.status(statusReq.email)
    if (status instanceof AppError) {
      return HttpError.toHttpError(status)
    }

    return { status }
  }

  async register(registerReq: RegisterRequest): PromiseSafe<RegisterResponse> {
    const registerErr = await this.authUc.register(registerReq.email, registerReq.password, registerReq.username)
    if (registerErr instanceof AppError) {
      return HttpError.toHttpError(registerErr)
    }

    return { message: "Register success. Check console output to get email verification link" }
  }

  async resendVerification(resendReq: ResendVerificationRequest): PromiseSafe<ResendVerificationResponse> {
    const registerErr = await this.authUc.resendVerification(resendReq.email)
    if (registerErr instanceof AppError) {
      return HttpError.toHttpError(registerErr)
    }

    return { message: "Resend success. Check console output to get email verification link" }
  }


  async verify(verifyReq: VerifyRequest): PromiseSafe<VerifyResponse> {
    const verifyErr = await this.authUc.verify(verifyReq.token)
    if (verifyErr instanceof AppError) {
      return HttpError.toHttpError(verifyErr)
    }

    return { message: "Verify success. You can now login" }
  }

  getType(): ClassConstructor<AuthContextData> {
    return AuthContextData
  }

  async populate(source: AuthContextData): PromiseSafeVoid {
    const user = await this.authUc.authenticate(source.token)
    if (user instanceof AppError) {
      return HttpError.toHttpError(user)
    }

    if (user instanceof HttpError) {
      return user
    }

    source.user = user
    return null
  }
}