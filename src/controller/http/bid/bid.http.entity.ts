import { IsNotEmpty, IsNotEmptyObject } from "class-validator"
import { PaginationRequest, PaginationResponse } from "../../../pkg/pagination/pagination.pkg.js"
import { BidEntity } from "../../../repo/bid/bid.entity.js"
import { Type } from "class-transformer"

export class BidRequest {
  @IsNotEmpty()
  itemId: number = 0

  @IsNotEmpty()
  amount: number = 0
}

export type BidResponse = {
  message: string
}

export class GetAllByUserRequest {
  @IsNotEmpty()
  onlyActive: boolean = false

  @Type(() => PaginationRequest)
  @IsNotEmptyObject()
  pagination: PaginationRequest = new PaginationRequest()
}

export class GetAllByItemRequest {
  @IsNotEmpty()
  itemId: number = 0

  @Type(() => PaginationRequest)
  @IsNotEmptyObject()
  pagination: PaginationRequest = new PaginationRequest()
}

export type GetAllBidResponse = {
  bids: BidEntity[]
  pagination: PaginationResponse
}