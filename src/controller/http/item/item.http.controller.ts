import { AppError } from "../../../pkg/apperror/apperror.pkg.js";
import { ItemUsecase } from "../../../usecase/item/item.usecase.js";
import { AuthContextData } from "../auth/auth.http.entity.js";
import { HttpError, PromiseSafe } from "../error.http.js";
import { CreateItemRequest, CreateItemResponse, GetAllItemRequest, GetAllItemResponse, GetItemRequest, GetItemResponse, PublishItemRequest, PublishItemResponse } from "./item.http.entity.js";

export class ItemController {
  constructor(private itemUc: ItemUsecase) { }

  async getOne(req: GetItemRequest): PromiseSafe<GetItemResponse> {
    const item = await this.itemUc.getOne(req.itemId)
    if (item instanceof AppError) {
      return HttpError.toHttpError(item)
    }

    return { item }
  }

  async getAll(req: GetAllItemRequest): PromiseSafe<GetAllItemResponse> {
    const items = await this.itemUc.getAll(req.pagination)
    if (items instanceof AppError) {
      return HttpError.toHttpError(items)
    }

    return { items: items.data, pagination: items.pagination }
  }

  async getOneCreated(ctx: AuthContextData, req: GetItemRequest): PromiseSafe<GetItemResponse> {
    const item = await this.itemUc.getOneCreated(ctx.user.id, req.itemId)
    if (item instanceof AppError) {
      return HttpError.toHttpError(item)
    }

    return { item }
  }

  async getAllCreated(ctx: AuthContextData, req: GetAllItemRequest): PromiseSafe<GetAllItemResponse> {
    const items = await this.itemUc.getAllCreated(ctx.user.id, req.pagination)
    if (items instanceof AppError) {
      return HttpError.toHttpError(items)
    }

    return { items: items.data, pagination: items.pagination }
  }

  async create(ctx: AuthContextData, createReq: CreateItemRequest): PromiseSafe<CreateItemResponse> {
    const itemId = await this.itemUc.create(createReq.name, createReq.startPrice, createReq.timeWindow, ctx.user.id)
    if (itemId instanceof AppError) {
      return HttpError.toHttpError(itemId)
    }

    return { itemId }
  }

  async publish(ctx: AuthContextData, createReq: PublishItemRequest): PromiseSafe<PublishItemResponse> {
    const itemId = await this.itemUc.publish(ctx.user.id, createReq.itemId)
    if (itemId instanceof AppError) {
      return HttpError.toHttpError(itemId)
    }

    return { message: "Publish item success" }
  }
}