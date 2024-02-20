import { IsInt, IsNotEmpty, IsNotEmptyObject, Min, } from "class-validator"
import { ItemEntity } from "../../../repo/item/item.entity.js"
import { PaginationRequest, PaginationResponse } from "../../../pkg/pagination/pagination.pkg.js"
import { Type } from "class-transformer"

export class CreateItemRequest {
  @IsNotEmpty()
  name: string = ""

  @IsInt()
  startPrice: number = 0

  @Min(10)
  timeWindow: number = 0
}

export type CreateItemResponse = {
  itemId: number
}

export class PublishItemRequest {
  @IsNotEmpty()
  itemId: number = 0
}

export type PublishItemResponse = {
  message: string
}

export class GetItemRequest {
  @Min(0)
  itemId: number = 0
}

export type GetItemResponse = {
  item: ItemEntity
}

export class GetAllItemRequest {
  @Type(() => PaginationRequest)
  @IsNotEmptyObject()
  pagination: PaginationRequest = new PaginationRequest()
}

export type GetAllItemResponse = {
  items: ItemEntity[]
  pagination: PaginationResponse
}