import { AppError } from "../../../pkg/apperror/apperror.pkg.js";
import { batchRunner } from "../../../pkg/batchrunner/batchrunner.pkg.js";
import { PromiseSafeVoid } from "../../../pkg/safecatch/safecatch.type.js";
import { ItemUsecase } from "../../../usecase/item/item.usecase.js";

export class ItemController {
  constructor(private itemUc: ItemUsecase) { }

  async completingItem(): PromiseSafeVoid {
    const res = await batchRunner((nextId) => this.itemUc.finishBatch(nextId))
    if (res instanceof AppError) {
      return new AppError("Failed to run finish item uc batch", res)
    }

    return null
  }

  async pickWinner(): PromiseSafeVoid {
    const res = await batchRunner((nextId) => this.itemUc.pickWinnerBatch(nextId))
    if (res instanceof AppError) {
      return new AppError("Failed to run pick winner uc batch", res)
    }

    return null
  }
}