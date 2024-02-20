import { AppError } from "../apperror/apperror.pkg.js"
import { PromiseSafe, PromiseSafeVoid } from "../safecatch/safecatch.type.js"

export async function batchRunner(runner: (nextId: number) => PromiseSafe<number>): PromiseSafeVoid {
  var nextId = 0

  while (true) {
    const currNextId = await runner(nextId)
    if (currNextId instanceof AppError) {
      return currNextId
    }

    if (currNextId == 0) {
      return null
    }

    nextId = currNextId
  }
}