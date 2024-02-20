import "reflect-metadata"
import { Logger } from "../../pkg/logger/logger.pkg.js";
import { AppError } from "../../pkg/apperror/apperror.pkg.js";
import { Config } from "../../config/config.entity.js";
import { runApp } from "./app.js";
import express, { Application } from "express";

async function main() {
  const logger = new Logger()
  const cfg = new Config()

  const server: Application = express();

  const err = await runApp(cfg, logger)
  if (err instanceof AppError) {
    return logger.logError("Failed to run app", err)
  }

  server.listen(3000, (): void => console.log(`running on port 3000`))
}

await main()