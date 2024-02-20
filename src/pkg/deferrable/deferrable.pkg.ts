
type DeferFn = () => Promise<void>
export class DeferrableContext {
  defers: DeferFn[] = []

  defer(deferFn: DeferFn) {
    this.defers.push(deferFn)
  }

  onReturn() {
    this.defers.reverse().forEach(async (defer) => { await defer() })
  }
}

export async function deferablePromise<T>(func: (ctx: DeferrableContext) => Promise<T>): Promise<T> {
  const deferrableCtx = new DeferrableContext()
  try {
    return await func(deferrableCtx)
  } finally {
    deferrableCtx.onReturn()
  }
}