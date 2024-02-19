import {describe, expect, it} from '@jest/globals';
import { add } from "./main";

describe("test add", () => {
  it("should return 3", () => {
    expect(add(1, 2)).toBe(3);
  });
});
