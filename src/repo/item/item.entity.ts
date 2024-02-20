import { ItemStatus } from './item.enum.js';
import { json } from '../../pkg/jsonutil/jsonutil.pkg.js';
import { Nullable } from '../../pkg/safecatch/safecatch.type.js';

export class ItemCreator {
  @json({ name: "id" })
  id: number = 0

  @json({ name: "username" })
  username: string = "";
}

export class BidWinner {
  @json({ name: "username" })
  username: string = "";

  @json({ name: "amount" })
  amount: number = 0;
}

export class ItemEntity {
  @json({ name: "id" })
  id: number = 0;

  @json({ name: "name" })
  name: string = "";

  @json({ name: "start_price" })
  startPrice: number = 0;

  @json({ name: "time_window" })
  timeWindow: number = 0;

  @json({ name: "started_at" })
  startedAt: Date = new Date(0);

  @json({ name: "status" })
  status: ItemStatus = ItemStatus.DRAFT;

  @json({ name: "creator", ctor: ItemCreator, flatten: { flattenPrefix: "_" } })
  creator: ItemCreator = new ItemCreator();

  @json({ name: "bid_count" })
  bidCount: number = 0;

  @json({ name: "bid_amount" })
  bidAmount: number = 0;

  @json({ name: "winner", ctor: BidWinner, flatten: { flattenPrefix: "_" } })
  winner: Nullable<BidWinner> = null;
}

export class GetAllItemFilter {
  public userId: number = 0
  public status: ItemStatus[] = []
}

export class GetItemFilter {
  public itemId: number = 0
  public userId: number = 0
  public status: ItemStatus[] = []
}

export class CreateItemRes {
  @json({ name: "id" })
  id: number = 0;
}

export class ItemIdEntity {
  id: number = 0
}
