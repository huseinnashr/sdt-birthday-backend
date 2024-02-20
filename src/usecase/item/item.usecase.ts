import { Config } from "../../config/config.entity.js";
import { AppError } from "../../pkg/apperror/apperror.pkg.js";
import { Obj } from "../../pkg/objectfactory/objectfactory.pkg.js";
import { PaginationRequest, PaginationResponseT } from "../../pkg/pagination/pagination.pkg.js";
import { PromiseSafe, PromiseSafeVoid } from "../../pkg/safecatch/safecatch.type.js";
import { GetItemFilter, ItemEntity, GetAllItemFilter } from "../../repo/item/item.entity.js";
import { ItemStatus } from "../../repo/item/item.enum.js";
import { ItemRepository } from "../../repo/item/item.repo.js";

export class ItemUsecase {
  constructor(private cfg: Config, private itemRepo: ItemRepository) { }

  async getOne(itemId: number): PromiseSafe<ItemEntity> {
    const item = await this.itemRepo.getOne(Obj.make(GetItemFilter, { itemId }))
    if (item instanceof AppError) {
      return new AppError("Failed to get item", item)
    }

    if (item == null) {
      return new AppError("Item not found")
    }

    return item
  }

  async getAll(pagination: PaginationRequest): PromiseSafe<PaginationResponseT<ItemEntity[]>> {
    const items = await this.itemRepo.getAll(Obj.make(GetAllItemFilter, { status: [ItemStatus.ONGOING, ItemStatus.FINISHED] }), pagination)
    if (items instanceof AppError) {
      return new AppError("Failed to get all items", items)
    }

    return items
  }

  async getOneCreated(userId: number, itemId: number): PromiseSafe<ItemEntity> {
    const item = await this.itemRepo.getOne(Obj.make(GetItemFilter, { userId, itemId }))
    if (item instanceof AppError) {
      return new AppError("Failed to get one item created by user", item)
    }

    if (item == null) {
      return new AppError("Item not found")
    }

    return item
  }

  async getAllCreated(userId: number, pagination: PaginationRequest): PromiseSafe<PaginationResponseT<ItemEntity[]>> {
    const items = await this.itemRepo.getAll(Obj.make(GetAllItemFilter, { userId }), pagination)
    if (items instanceof AppError) {
      return new AppError("Failed to get all items created by user", items)
    }

    return items
  }

  async create(name: string, startPrice: number, timeWindow: number, createdBy: number): PromiseSafe<number> {
    const itemId = await this.itemRepo.create(name, startPrice, timeWindow, createdBy)
    if (itemId instanceof AppError) {
      return new AppError("failed to create item", itemId)
    }

    return itemId
  }

  async publish(userId: number, itemId: number): PromiseSafeVoid {
    const item = await this.itemRepo.getSimple(Obj.make(GetItemFilter, { itemId: itemId }))
    if (item instanceof AppError) {
      return new AppError("failed to get item", item)
    }

    if (item == null) {
      return new AppError("Item not found")
    }

    if (item.creator.id != userId) {
      return new AppError("Can't publish others item")
    }

    if (item.status != ItemStatus.DRAFT) {
      return new AppError("Can only publish drafted item")
    }

    const publishErr = await this.itemRepo.publish(itemId)
    if (publishErr instanceof AppError) {
      return new AppError("failed to publish item", publishErr)
    }

    return null
  }

  async finishBatch(nextId: number): PromiseSafe<number> {
    const limit = this.cfg.cron.finishItemCron.batchSize
    const items = await this.itemRepo.finish(Obj.make(PaginationRequest, { limit, nextId }))
    if (items instanceof AppError) {
      return new AppError("Failed to finish item", items)
    }

    return items.pagination.nextId
  }

  async pickWinnerBatch(nextId: number): PromiseSafe<number> {
    const limit = this.cfg.cron.pickWinnerCron.batchSize
    const items = await this.itemRepo.pickWinner(Obj.make(PaginationRequest, { limit, nextId }))
    if (items instanceof AppError) {
      return new AppError("Failed to pick winner", items)
    }

    return items.pagination.nextId
  }
}