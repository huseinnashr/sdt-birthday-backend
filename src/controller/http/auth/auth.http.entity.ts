import { IsAlphanumeric, IsEmail, IsEmpty, IsJWT, IsLowercase, IsNotEmpty, Length, isEmail } from "class-validator"
import { UserEntity } from "../../../repo/user/user.entity.js"
import { AccountStatus } from "../../../usecase/auth/auth.type.js"

export class LoginRequest {
  @IsEmail()
  email: string = ""

  @Length(8)
  password: string = ""
}

export type LoginResponse = {
  token: string
  user: LoginUser
  expiredAt: Date
}

export type LoginUser = {
  id: number
  username: string
}

export class StatusRequest {
  @IsEmail()
  email: string = ""
}

export type StatusResponse = {
  status: AccountStatus
}

export class RegisterRequest {
  @IsEmail()
  email: string = ""

  @Length(8)
  password: string = ""

  @Length(8)
  @IsLowercase()
  @IsAlphanumeric()
  username: string = ""
}

export type RegisterResponse = {
  message: string
}

export class ResendVerificationRequest {
  @IsEmail()
  email: string = ""
}

export type ResendVerificationResponse = {
  message: string
}


export class AuthContextData {
  @IsNotEmpty()
  token: string = ""

  user: UserEntity = new UserEntity()
}

export class VerifyRequest {
  @IsNotEmpty()
  token: string = ""
}

export type VerifyResponse = {
  message: string
}