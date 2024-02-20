import { UserRepository } from "../../repo/user/user.repo.js"
import { AppError } from "../../pkg/apperror/apperror.pkg.js"
import jwt from "jsonwebtoken"
import { Config } from "../../config/config.entity.js"
import { UserEntity } from "../../repo/user/user.entity.js"
import { safeCatch, safeCatchPromise } from "../../pkg/safecatch/safecatch.pkg.js"
import { AccountStatus as UserStatus, UserSessionJWT } from "./auth.type.js"
import { Nullable, PromiseSafe, PromiseSafeT, PromiseSafeVoid } from "../../pkg/safecatch/safecatch.type.js"
import { UserVerificationJWT } from "./auth.type.js"
import { IsolationLevel, QueryRunner } from "../../pkg/poolclient/poolclient.pkg.js"
import { LogLevel, Logger } from "../../pkg/logger/logger.pkg.js"
import * as bcrypt from 'bcrypt';
import { LoginResponse } from "../../controller/http/auth/auth.http.entity.js"
import { HTTPUnauthenticated, HttpError } from "../../controller/http/error.http.js"

export class AuthUsecase {
  constructor(private cfg: Config, private logger: Logger, private queryRunner: QueryRunner, private userRepo: UserRepository) { }

  async login(email: string, password: string): PromiseSafe<LoginResponse> {
    const user = await this.userRepo.get({ email })
    if (user instanceof AppError) {
      return new AppError("Error when findUserByEmail", user)
    }

    if (user == null) {
      return new AppError("Email is not found")
    }

    if (user.isVerified == false) {
      return new AppError("Email is not verified")
    }

    const passwordValid = await safeCatchPromise(() => bcrypt.compare(password, user.password));
    if (passwordValid instanceof AppError) {
      return new AppError("failed to compare hashed password", passwordValid)
    }

    if (!passwordValid) {
      return new AppError("Password is not correct")
    }

    const sessionId = await this.userRepo.saveSession(user, this.cfg.auth.sessionJWT.ttl)
    if (sessionId instanceof AppError) {
      return new AppError("Failed to set login session", sessionId)
    }

    const session: UserSessionJWT = { sessionId }
    const token = safeCatch(() => jwt.sign(session, this.cfg.auth.sessionJWT.secret))
    if (token instanceof AppError) {
      return new AppError("Failed sign JWT", token)
    }

    const expiredAt = new Date(Date.now() + this.cfg.auth.sessionJWT.ttl * 1000)
    return { token, user: { id: user.id, username: user.username }, expiredAt }
  }

  async status(email: string): PromiseSafe<UserStatus> {
    const user = await this.userRepo.get({ email })
    if (user instanceof AppError) {
      return new AppError("failed to get user")
    }

    if (user == null) {
      return UserStatus.NOT_FOUND
    }

    if (user.isVerified == false) {
      return UserStatus.NOT_VERIFIED
    }

    return UserStatus.VERIFIED
  }

  async register(email: string, password: string, username: string): PromiseSafeVoid {
    return this.queryRunner.withTransaction(async (conn) => {
      const user = await this.userRepo.getTx({ email }, conn)
      if (user instanceof AppError) {
        return new AppError("failed to find user by email", user)
      }

      if (user != null) {
        if (user.isVerified == false) {
          return new AppError("User already registered but not verified")
        }
        return new AppError("User already registered")
      }

      const userN = await this.userRepo.getTx({ username }, conn)
      if (userN instanceof AppError) {
        return new AppError("failed to find user by username", userN)
      }

      if (userN != null) {
        return new AppError("Username is already taken")
      }

      const salt = await safeCatchPromise(() => bcrypt.genSalt());
      if (salt instanceof AppError) {
        return new AppError("failed to generate password salt", salt)
      }

      const hashPassword = await safeCatchPromise(() => bcrypt.hash(password, salt));
      if (hashPassword instanceof AppError) {
        return new AppError("failed to hash password", hashPassword)
      }

      const userId = await this.userRepo.create(email, hashPassword, username, conn)
      if (userId instanceof AppError) {
        return new AppError("failed to create user", userId)
      }

      const session: UserVerificationJWT = { userId }
      const token = safeCatch(() => jwt.sign(session, this.cfg.auth.verificationJWT.secret))
      if (token instanceof AppError) {
        return new AppError("Failed sign JWT", token)
      }

      const saveVerficationErr = await this.userRepo.saveVerificationToken(userId, token, this.cfg.auth.verificationJWT.ttl)
      if (saveVerficationErr instanceof AppError) {
        return new AppError("Failed to save verification", saveVerficationErr)
      }

      const sendVerificationErr = await this.userRepo.sendVerificationToken(email, token)
      if (sendVerificationErr instanceof AppError) {
        return new AppError("Failed to send verification", sendVerificationErr)
      }

      return null
    }, { isolationLevel: IsolationLevel.SERIALIZABLE })
  }

  async resendVerification(email: string): PromiseSafeVoid {
    const user = await this.userRepo.get({ email })
    if (user instanceof AppError) {
      return new AppError("failed to find user by email", user)
    }

    if (user == null) {
      return new AppError("Email not found")
    }

    if (user.isVerified) {
      return new AppError("User is already verified")
    }

    const session: UserVerificationJWT = { userId: user.id }
    const token = safeCatch(() => jwt.sign(session, this.cfg.auth.verificationJWT.secret))
    if (token instanceof AppError) {
      return new AppError("Failed sign JWT", token)
    }

    const saveVerficationErr = await this.userRepo.saveVerificationToken(user.id, token, this.cfg.auth.verificationJWT.ttl)
    if (saveVerficationErr instanceof AppError) {
      return new AppError("Failed to save verification", saveVerficationErr)
    }

    const sendVerificationErr = await this.userRepo.sendVerificationToken(email, token)
    if (sendVerificationErr instanceof AppError) {
      return new AppError("Failed to send verification", sendVerificationErr)
    }

    return null
  }

  async verify(token: string): PromiseSafeVoid {
    const userVerification = safeCatch(() => jwt.verify(token, this.cfg.auth.verificationJWT.secret) as UserVerificationJWT)
    if (userVerification instanceof AppError) {
      this.logger.logError("Invalid verfication JWT format", userVerification, LogLevel.debug)
      return new AppError("Invalid verification token")
    }

    const user = await this.userRepo.get({ id: userVerification.userId })
    if (user instanceof AppError) {
      return new AppError("Failed to get user", user)
    }

    if (user == null) {
      return new AppError("User not found")
    }

    if (user.isVerified) {
      return new AppError("User is already verified. Please login")
    }

    const savedToken = await this.userRepo.getVerificationToken(userVerification.userId)
    if (savedToken instanceof AppError) {
      return new AppError("Failed to get verification", savedToken)
    }

    if (token != savedToken) {
      return new AppError("Verification token not found")
    }

    const verifyErr = await this.userRepo.verify(userVerification.userId)
    if (verifyErr instanceof AppError) {
      return new AppError("Failed to verify user", verifyErr)
    }

    const removeToken = await this.userRepo.removeVerificationToken(userVerification.userId)
    if (removeToken instanceof AppError) {
      return new AppError("Failed to remove verification token", verifyErr)
    }

    return null
  }

  async authenticate(token: string): PromiseSafeT<UserEntity, AppError | HttpError> {
    const userSessionJWT = safeCatch(() => jwt.verify(token, this.cfg.auth.sessionJWT.secret) as UserSessionJWT)
    if (userSessionJWT instanceof AppError) {
      return new HTTPUnauthenticated("Invalid session token")
    }

    const userSess = await this.userRepo.getSession(userSessionJWT.sessionId)
    if (userSess instanceof AppError) {
      return new AppError("Failed to get from session", userSess)
    }

    if (userSess == null) {
      return new HTTPUnauthenticated("Session is not found")
    }

    return userSess
  }
}