import { json } from "../../pkg/jsonutil/jsonutil.pkg.js";

export class CreateUserRes {
  @json({ name: "id" })
  id: number = 0
}

export interface SendEmailReq {
  email: string
  message: string
}

export class SendEmailRes {
  @json({name: "status"})
  status: string = ""

  @json({name: "sentTime"})
  sentTime: string = ""
}