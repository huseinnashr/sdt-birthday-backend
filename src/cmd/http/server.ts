import express, { Application } from "express";
import { runApp } from "./app.js";
import bodyParser from "body-parser";
import "reflect-metadata"
import { Logger } from "../../pkg/logger/logger.pkg.js";
import { AppError } from "../../pkg/apperror/apperror.pkg.js";
import { Config } from "../../config/config.entity.js";
import { AppRoute } from "../../controller/http/route.http.js";
import cors from 'cors'

async function main() {
  const logger = new Logger()
  const cfg = new Config()

  const server: Application = express();
  server.use(bodyParser.json())
  server.use(cors({ origin: "*" }))

  const route = new AppRoute(server, logger)

  const err = await runApp(cfg, route, logger)
  if (err instanceof AppError) {
    return logger.logError("Failed to run app", err)
  }

  server.listen(3000, (): void => console.log(`running on port 3000`))
}

await main()