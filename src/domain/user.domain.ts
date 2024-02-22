import { json } from "../pkg/jsonutil/jsonutil.pkg.js";

export class UserEntity {
  @json({ name: "id" })
  id: number = 0;

  @json({ name: "first_name" })
  firstName: string = "";

  @json({ name: "last_name" })
  lastName: string = "";

  @json({ name: "birthday" })
  birthday: string = "";

  @json({ name: "gmt_offset" })
  gmtOffset: number = 0.0;
}