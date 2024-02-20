import { HttpError, PromiseSafe } from "../error.http.js";
import { BidRequest, BidResponse, GetAllByUserRequest, GetAllBidResponse, GetAllByItemRequest, } from "./bid.http.entity.js";
import { AuthContextData } from "../auth/auth.http.entity.js";
import { BidUsecase } from "../../../usecase/bid/bid.usecase.js";
import { AppError } from "../../../pkg/apperror/apperror.pkg.js";

export class BidController {
  constructor(private bidUc: BidUsecase) { }

  async getAllByItem(req: GetAllByItemRequest): PromiseSafe<GetAllBidResponse> {
    const bids = await this.bidUc.getAllByItem(req.itemId, req.pagination)
    if (bids instanceof AppError) {
      return HttpError.toHttpError(bids)
    }

    return { bids: bids.data, pagination: bids.pagination }
  }

  async bid(ctx: AuthContextData, bidReq: BidRequest): PromiseSafe<BidResponse> {
    const bidErr = await this.bidUc.bid(ctx.user.id, bidReq.itemId, bidReq.amount)
    if (bidErr instanceof AppError) {
      return HttpError.toHttpError(bidErr)
    }

    return { message: "Bid success" }
  }

  async getAllByUser(ctx: AuthContextData, req: GetAllByUserRequest): PromiseSafe<GetAllBidResponse> {
    const bids = await this.bidUc.getAllByUser(ctx.user.id, req.onlyActive, req.pagination)
    if (bids instanceof AppError) {
      return HttpError.toHttpError(bids)
    }

    return { bids: bids.data, pagination: bids.pagination }
  }
}