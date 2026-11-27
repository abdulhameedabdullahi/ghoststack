import fc from "fast-check";
import { describe, it } from "vitest";
import { checkProperty, nameArb } from "../../test/shareArbitraries";
import { sanitiseText } from "./sanitise";

const FORBIDDEN =
  /[\u0000-\u001F\u007F\u202A-\u202E\u2066-\u2069]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/;

describe("sanitiseText properties", () => {
  // Property P4: idempotent, no forbidden character, at most `max` code points.
  // **Validates: Requirements 3.1**
  it.each([30, 20])("P4: holds for max = %i", (max) => {
    checkProperty(
      fc.property(nameArb, (input) => {
        const once = sanitiseText(input, max);
        const twice = sanitiseText(once, max);
        return (
          twice === once &&
          !FORBIDDEN.test(once) &&
          Array.from(once).length <= max
        );
      }),
    );
  });
});
