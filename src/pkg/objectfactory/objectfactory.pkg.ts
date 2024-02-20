import { ClassConstructor } from "../jsonutil/jsonutil.pkg.js";

type NonFunctionPropertyNames<T> = {
  [K in keyof T]: T[K] extends Function ? never : K
}[keyof T];
type NonFunctionProperties<T> = Pick<T, NonFunctionPropertyNames<T>>;

export class Obj {
  static make<T extends Object>(cls: ClassConstructor<T>, param: Partial<NonFunctionProperties<T>>): T {
    return Object.assign(new cls(), param)
  }
}