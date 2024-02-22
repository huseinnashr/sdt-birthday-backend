import { Transform } from "class-transformer"
import { IsDateString, IsNotEmpty, Min } from "class-validator"

export class CreateUserRequest {
  @IsNotEmpty()
  firstName: string = ""

  @IsNotEmpty()
  lastName: string = ""

  @IsNotEmpty()
  @IsDateString()
  birthday: string = ""

  @IsNotEmpty()
  gmtOffset: number = 0
}

export type CreateUserResponse = {
  userId: number
}

export class UpdateUserRequest {
  @Transform(param => parseInt(param.value, 10), { toClassOnly: true })
  @Min(1)
  userId: number = 0

  @IsNotEmpty()
  firstName: string = ""

  @IsNotEmpty()
  lastName: string = ""

  @IsNotEmpty()
  @IsDateString()
  birthday: string = ""

  @IsNotEmpty()
  gmtOffset: number = 0
}

export type UpdateUserResponse = {
  message: string
}

export class DeleteUserRequest {
  @Transform(param => parseInt(param.value, 10), { toClassOnly: true })
  @Min(1)
  userId: number = 0
}

export type DeleteUserResponse = {
  message: string
}
