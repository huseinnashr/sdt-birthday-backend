import { TracableError } from "../apperror/apperror.pkg.js";

export enum LogLevel {
  debug = 1,
  error
}
export type ConsoleLoggerFuncT = (...data: any[]) => void

export class Logger {
  constructor(private level = LogLevel.debug) { }

  logError(message: string, err: TracableError, level: LogLevel = LogLevel.error) {
    const messages: string[] = [message]

    var currErr = err
    while (currErr.cause) {
      messages.push(currErr.message)
      currErr = currErr.cause
    }

    messages.push(currErr.message)

    if (level >= this.level) {
      console.error({ message: messages.join(" @ "), stack: currErr.stack })
    }
  }
}