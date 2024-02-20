export type UserSessionJWT = {
  sessionId: string
}

export type UserVerificationJWT = {
  userId: number
}

export enum AccountStatus {
  NOT_FOUND = "not_found",
  NOT_VERIFIED = "not_verified",
  VERIFIED = "verified"
}
