import { json } from '../../pkg/jsonutil/jsonutil.pkg.js';

export class UserEntity {
  @json({ name: "id" })
  id: number = 0;

  @json({ name: "email" })
  email: string = "";

  @json({ name: "username" })
  username: string = "";

  @json({ name: "password" })
  password: string = "";

  @json({ name: "is_verified" })
  isVerified: boolean = false;

  @json({ name: "balance" })
  balance: number = 0;
}

export class CreateUserRes {
  @json({ name: "id" })
  id: number = 0
}

export interface GetUserFilter {
  id?: number
  email?: string
  username?: string
}