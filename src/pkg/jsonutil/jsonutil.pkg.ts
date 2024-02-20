
import "reflect-metadata";
import { Nullable, Safe } from "../safecatch/safecatch.type.js";
import { safeCatch } from "../safecatch/safecatch.pkg.js";

export type ClassConstructor<T> = {
  new(...args: any[]): T & Object;
};

type JSON = { [x: string]: any }
const _unmarshall = <U extends Object>(src: JSON, target: U, srcKeyPrefix: string = ""): U => {
  var isSrcEmpty = true

  for (let [key, targetValue] of Object.entries(target)) {
    const metadata = Reflect.getMetadata(JSONMetadataKey, target, key) as Nullable<JSONMetadataValue>
    if (typeof targetValue == "object" && metadata?.flatten) {
      if (metadata.ctor) {
        target[key as keyof U] = _unmarshall(src, new metadata.ctor(), metadata.name + metadata.flatten.flattenPrefix) as any
      } else if (targetValue != null) {
        _unmarshall(src, targetValue, metadata.name + metadata.flatten.flattenPrefix)
      }
      continue
    }

    const srcValue = src[srcKeyPrefix + metadata?.name]
    if (typeof targetValue != typeof srcValue) {
      if (typeof targetValue == "number") {
        if (typeof srcValue == "string") {
          const tryNumber = +srcValue
          target[key as keyof U] = Number.isNaN(tryNumber) ? 0 : tryNumber as any
          isSrcEmpty = false
        }
      }
      continue
    }

    target[key as keyof U] = srcValue
    isSrcEmpty = false
  }

  return ((srcKeyPrefix != "" && isSrcEmpty) ? null : target) as U
}

export function unmarshallArr<T>(srcs: JSON[], targetCls: ClassConstructor<T>): Safe<T[]> {
  return safeCatch(() => srcs.map((src) => {
    return _unmarshall(src, new targetCls())
  })
  )
}

export function unmarshall<T>(src: JSON, targetCls: ClassConstructor<T>): Safe<T> {
  return safeCatch(() => _unmarshall(src, new targetCls()))
}


const JSONMetadataKey = Symbol("json-metadata-key");
interface JSONMetadataValue {
  name: string
  ctor?: ClassConstructor<Object>
  flatten?: JSONMetadataFlatten
}
interface JSONMetadataFlatten {
  flattenPrefix: string
}

export function json(metadata: JSONMetadataValue) {
  return Reflect.metadata(JSONMetadataKey, metadata);
}