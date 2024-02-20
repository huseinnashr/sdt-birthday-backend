import { json } from "../../pkg/jsonutil/jsonutil.pkg.js";
import { Nullable } from "../../pkg/safecatch/safecatch.type.js";
import { ItemStatus } from "../item/item.enum.js";

class BidItem {
  @json({ name: "name" })
  name: string = ""

  @json({ name: "status" })
  status: ItemStatus = ItemStatus.DRAFT;
}

class Bidder {
  @json({ name: "username" })
  username: string = ""
}

export class BidEntity {
  @json({ name: "id" })
  id: number = 0;

  @json({ name: "item_id" })
  itemId: number = 0;

  @json({ name: "user_id" })
  userId: number = 0;

  @json({ name: "created_at" })
  createdAt: Date = new Date(0);

  @json({ name: "amount" })
  amount: number = 0;

  @json({ name: "is_active" })
  isActive: boolean = false;

  @json({ name: "is_returned" })
  isReturned: boolean = false;

  @json({ name: "is_winner" })
  isWinner: boolean = false;

  @json({ name: "is_paid" })
  isPaid: Boolean = false;

  @json({ name: "item", ctor: BidItem, flatten: { flattenPrefix: "_" } })
  item: Nullable<BidItem> = null

  @json({ name: "bidder", ctor: Bidder, flatten: { flattenPrefix: "_" } })
  bidder: Nullable<Bidder> = null
}

export class DeactivateBidRes {
  @json({ name: "amount" })
  amount: number = 0
}

export class CreateBidRes {
  @json({ name: "id" })
  id: number = 0
}

export class BidIdEntity {
  @json({ name: "id" })
  id: number = 0
}