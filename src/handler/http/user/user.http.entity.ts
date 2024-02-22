import { IsDate, IsNotEmpty, Min } from "class-validator"

export class CreateUserRequest {
  @IsNotEmpty()
  firstName: string = ""

  @IsNotEmpty()
  lastName: string = ""

  @IsNotEmpty()
  @IsDate()
  birthday: string = ""

  @IsNotEmpty()
  timezone: string = ""
}

export type CreateUserResponse = {
  userId: number
}

export class UpdateUserRequest {
  @Min(1)
  userId: number = 0

  @IsNotEmpty()
  firstName: string = ""

  @IsNotEmpty()
  lastName: string = ""

  @IsNotEmpty()
  @IsDate()
  birthday: string = ""

  @IsNotEmpty()
  timezone: string = ""
}

export type UpdateUserResponse = {
  message: string
}

export class DeleteUserRequest {
  @Min(1)
  userId: number = 0
}

export type DeleteUserResponse = {
  message: string
}
