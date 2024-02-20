import { BidRepository } from "../../repo/bid/bid.repo.js"
import { UserRepository } from "../../repo/user/user.repo.js"
import { IsolationLevel, QueryRunner, TransactionConfig } from "../../pkg/poolclient/poolclient.pkg.js"
import { AppError } from "../../pkg/apperror/apperror.pkg.js"
import { BidEntity } from "../../repo/bid/bid.entity.js"
import { PromiseSafe, PromiseSafeVoid } from "../../pkg/safecatch/safecatch.type.js"
import { ItemRepository } from "../../repo/item/item.repo.js"
import { ItemStatus } from "../../repo/item/item.enum.js"
import { Obj } from "../../pkg/objectfactory/objectfactory.pkg.js"
import { GetItemFilter } from "../../repo/item/item.entity.js"
import { Config } from "../../config/config.entity.js"
import { PaginationRequest, PaginationResponseT } from "../../pkg/pagination/pagination.pkg.js"

export class BidUsecase {
  constructor(private cfg: Config, private queryRunner: QueryRunner, private itemRepo: ItemRepository, private userRepo: UserRepository, private bidRepo: BidRepository) { }

  async getAllByItem(itemId: number, pagination: PaginationRequest): PromiseSafe<PaginationResponseT<BidEntity[]>> {
    const bids = await this.bidRepo.getAll(itemId, pagination)
    if (bids instanceof AppError) {
      return new AppError("Failed to get all bid", bids)
    }

    return bids
  }

  async getAllByUser(userId: number, onlyActive: boolean, pagination: PaginationRequest): PromiseSafe<PaginationResponseT<BidEntity[]>> {
    const bids = await this.bidRepo.getAllByUser(userId, onlyActive, pagination)
    if (bids instanceof AppError) {
      return new AppError("Failed to get all bid by user", bids)
    }

    return bids
  }

  async bid(userId: number, itemId: number, amount: number): PromiseSafeVoid {
    const cooldownExists = await this.bidRepo.cooldownExists(userId)
    if (cooldownExists instanceof AppError) {
      return new AppError("failed to exec cooldownExists", cooldownExists)
    }

    if (cooldownExists) {
      return new AppError(`User already bid within ${this.cfg.bid.cooldownTTL} seconds`)
    }

    return this.queryRunner.withTransaction(async (conn) => {
      const item = await this.itemRepo.getSimpleTx(Obj.make(GetItemFilter, { itemId: itemId, status: [ItemStatus.ONGOING, ItemStatus.FINISHED] }), conn)
      if (item instanceof AppError) {
        return new AppError("Error getting curr item", item)
      }

      if (item == null) {
        return new AppError("Item not found")
      }

      if (item.status == ItemStatus.FINISHED) {
        return new AppError("Finished item cannot be bid")
      }

      if (item.creator.id == userId) {
        return new AppError("Cannot bid your own item")
      }

      if (amount <= item.startPrice) {
        return new AppError("Bid is not larger than start price")
      }

      const user = await this.userRepo.getTx({ id: userId }, conn)
      if (user instanceof AppError) {
        return new AppError("Error getting curr user", user)
      }

      if (user == null) {
        return new AppError("Current user not found")
      }

      var currHighestBid = await this.bidRepo.getHighest(itemId, conn)
      if (currHighestBid instanceof AppError) {
        return new AppError("Error getting curr highest bid", currHighestBid)
      }

      if (currHighestBid == null) {
        currHighestBid = new BidEntity()
      }

      if (amount <= currHighestBid.amount) {
        return new AppError("Bid is not larger than current bid")
      }

      var prevBidAmount = await this.bidRepo.deactivatePrevBid(itemId, userId, conn)
      if (prevBidAmount instanceof AppError) {
        return new AppError("Error deactivate prev bid", prevBidAmount)
      }

      const deltaAmount = (amount - prevBidAmount)
      if (deltaAmount > user.balance) {
        return new AppError("Insufficient balance")
      }

      const updateBalanceErr = await this.userRepo.updateBalance(userId, -deltaAmount, conn)
      if (updateBalanceErr instanceof AppError) {
        return new AppError("Error updating user balance", updateBalanceErr)
      }

      const bid = await this.bidRepo.create(userId, itemId, amount, conn)
      if (bid instanceof AppError) {
        return new AppError("Error creating bid", bid)
      }

      const setCooldownRes = await this.bidRepo.setCooldown(userId, this.cfg.bid.cooldownTTL)
      if (setCooldownRes instanceof AppError) {
        return new AppError("Failed to set cooldown", setCooldownRes)
      }

      return null
    }, Obj.make(TransactionConfig, { isolationLevel: IsolationLevel.SERIALIZABLE }))
  }

  async refundBatch(nextId: number): PromiseSafe<number> {
    return this.queryRunner.withTransaction(async (conn) => {
      const limit = this.cfg.cron.refundCron.batchSize
      const bids = await this.bidRepo.refund(Obj.make(PaginationRequest, { limit, nextId }), conn)
      if (bids instanceof AppError) {
        return new AppError("Failed to get refund bid", bids)
      }

      if (bids.data.length == 0) {
        return 0
      }

      const bidIds = bids.data.map((bid) => bid.id)
      const refundUserErr = await this.userRepo.refund(bidIds, conn)
      if (refundUserErr instanceof AppError) {
        return new AppError("Error refund user", refundUserErr)
      }

      return bids.pagination.nextId
    })
  }

  async paymentBatch(nextId: number): PromiseSafe<number> {
    return this.queryRunner.withTransaction(async (conn) => {
      const limit = this.cfg.cron.refundCron.batchSize
      const bids = await this.bidRepo.pay(Obj.make(PaginationRequest, { limit, nextId }), conn)
      if (bids instanceof AppError) {
        return new AppError("Failed to get paid bid", bids)
      }

      if (bids.data.length == 0) {
        return 0
      }

      const bidIds = bids.data.map((bid) => bid.id)
      const payUserErr = await this.userRepo.transfer(bidIds, conn)
      if (payUserErr instanceof AppError) {
        return new AppError("Error paying user", payUserErr)
      }

      return bids.pagination.nextId
    })
  }
}