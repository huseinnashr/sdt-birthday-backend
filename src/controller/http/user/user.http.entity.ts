import { Min } from "class-validator"

export type GetBalanceResponse = {
  balance: number
}

export class DepositRequest {
  @Min(1)
  amount: number = 0
}

export type DepositResponse = {
  message: string
}