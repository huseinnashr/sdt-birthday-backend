import { AppError } from "../../../pkg/apperror/apperror.pkg.js";
import { batchRunner } from "../../../pkg/batchrunner/batchrunner.pkg.js";
import { PromiseSafeVoid } from "../../../pkg/safecatch/safecatch.type.js";
import { BidUsecase } from "../../../usecase/bid/bid.usecase.js";

export class BidController {
  constructor(private bidUc: BidUsecase) { }

  async refundParticipant(): PromiseSafeVoid {
    const res = await batchRunner((nextId) => this.bidUc.refundBatch(nextId))
    if (res instanceof AppError) {
      return new AppError("Failed to run refund bid batch", res)
    }

    return null
  }

  async payCreator(): PromiseSafeVoid {
    const res = await batchRunner((nextId) => this.bidUc.paymentBatch(nextId))
    if (res instanceof AppError) {
      return new AppError("Failed to run payment batch", res)
    }

    return null
  }
}