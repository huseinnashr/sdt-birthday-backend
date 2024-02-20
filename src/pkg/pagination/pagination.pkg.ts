import { IsEmpty, Min } from "class-validator"

export interface PaginatedEntity {
  id: number
}

export class PaginationRequest {
  @IsEmpty()
  nextId: number = 0

  @Min(1)
  limit: number = 0

  omitNext: boolean = false

  isGet(): boolean {
    return this.limit == 1 && this.omitNext
  }

  getLimit(): number {
    return this.omitNext ? this.limit : this.limit + 1
  }

  toResponse<T extends PaginatedEntity>(data: T[]): PaginationResponseT<T[]> {
    if (data.length == 0) {
      return { data: [], pagination: { currId: 0, nextId: 0 } }
    }

    if (this.omitNext) {
      return { data, pagination: { currId: this.nextId, nextId: 0 } }
    }

    if (data.length <= this.limit) {
      return { data, pagination: { currId: this.nextId, nextId: 0 } }
    }

    const nextId = data.pop()?.id ?? 0
    return { data, pagination: { currId: this.nextId, nextId } }
  }
}

export interface PaginationResponse {
  currId: number
  nextId: number
}

export interface PaginationResponseT<T> {
  data: T
  pagination: PaginationResponse
}