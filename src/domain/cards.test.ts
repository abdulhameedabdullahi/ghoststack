import { describe, expect, it } from "vitest";
import {
  moveCard,
  renameCard,
  renameStack,
  setCardHidden,
  visibleCards,
} from "./cards";
import { ERROR_MESSAGES } from "./result";
import type { Stack } from "./types";

function makeStack(): Stack {
  return {
    schemaVersion: 1,
    id: "s1",
    name: "Provisions",
    currency: "NGN",
    cards: [
      {
        id: "c1",
        type: "stock",
        title: "Stock",
        items: [
          { id: "i1", name: "Rice", quantity: 5, costPrice: 100, sellPrice: 150 },
        ],
      } as Stack["cards"][number],
      { id: "c2", type: "sales-log", title: "Sales", sales: [] },
      { id: "c3", type: "daily-summary", title: "Today", hidden: true },
    ],
  };
}

describe("renameStack", () => {
  it("accepts a name of exactly 40 characters", () => {
    const name = "a".repeat(40);
    const r = renameStack(makeStack(), name);
    expect(r.ok && r.value.name).toBe(name);
  });

  it("rejects a name of 41 characters with NAME_TOO_LONG", () => {
    const r = renameStack(makeStack(), "a".repeat(41));
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe("NAME_TOO_LONG");
      expect(r.error.message).toBe(ERROR_MESSAGES.NAME_TOO_LONG);
    }
  });

  it("trims padding and changes only the name", () => {
    const stack = makeStack();
    const r = renameStack(stack, "   Mama Ade   ");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toEqual({ ...stack, name: "Mama Ade" });
  });

  it("counts length after trimming (40 chars plus padding is valid)", () => {
    const r = renameStack(makeStack(), `  ${"a".repeat(40)}  `);
    expect(r.ok && r.value.name).toBe("a".repeat(40));
  });

  it("rejects a name that is only spaces", () => {
    const r = renameStack(makeStack(), "    ");
    expect(!r.ok && r.error.code).toBe("NAME_REQUIRED");
  });

  it.each([42, null, undefined, {}, ["x"]])(
    "rejects non-string name %j like a blank name",
    (bad) => {
      const blank = renameStack(makeStack(), "");
      const r = renameStack(makeStack(), bad);
      expect(r).toEqual(blank);
      expect(!r.ok && r.error.code).toBe("NAME_REQUIRED");
    },
  );

  it("does not change the input stack", () => {
    const stack = makeStack();
    renameStack(stack, "New");
    expect(stack).toEqual(makeStack());
  });

  it("gives the same stack when the same name is applied twice", () => {
    const first = renameStack(makeStack(), "  New Shop ");
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const second = renameStack(first.value, "  New Shop ");
    expect(second.ok && second.value).toEqual(first.value);
  });
});

describe("renameCard", () => {
  it("accepts a title of exactly 40 characters", () => {
    const title = "b".repeat(40);
    const r = renameCard(makeStack(), "c2", title);
    expect(r.ok && r.value.cards[1].title).toBe(title);
  });

  it("rejects a title of 41 characters with NAME_TOO_LONG", () => {
    const r = renameCard(makeStack(), "c2", "b".repeat(41));
    expect(!r.ok && r.error.code).toBe("NAME_TOO_LONG");
  });

  it("trims padding and changes only the chosen card's title", () => {
    const stack = makeStack();
    const r = renameCard(stack, "c1", "  My Goods  ");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.cards[0].title).toBe("My Goods");
    expect(r.value.cards[0]).toEqual({ ...stack.cards[0], title: "My Goods" });
    expect(r.value.cards.slice(1)).toEqual(stack.cards.slice(1));
    expect(r.value.name).toBe(stack.name);
  });

  it("keeps the hidden flag of a hidden card", () => {
    const r = renameCard(makeStack(), "c3", "Totals");
    expect(r.ok && r.value.cards[2].hidden).toBe(true);
  });

  it("rejects a blank title with NAME_REQUIRED", () => {
    const r = renameCard(makeStack(), "c1", "   ");
    expect(!r.ok && r.error.code).toBe("NAME_REQUIRED");
  });

  it("rejects a non-string title like a blank title", () => {
    const blank = renameCard(makeStack(), "c1", "");
    const r = renameCard(makeStack(), "c1", 7);
    expect(r).toEqual(blank);
  });

  it("returns CARD_NOT_FOUND for an unknown card id", () => {
    const r = renameCard(makeStack(), "nope", "Fine");
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe("CARD_NOT_FOUND");
      expect(r.error.message).toBe(ERROR_MESSAGES.CARD_NOT_FOUND);
    }
  });

  it("gives the same stack when the same title is applied twice", () => {
    const first = renameCard(makeStack(), "c1", " Goods ");
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const second = renameCard(first.value, "c1", " Goods ");
    expect(second.ok && second.value).toEqual(first.value);
  });
});

describe("moveCard", () => {
  const ids = (s: Stack) => s.cards.map((c) => c.id);

  it("returns CANNOT_MOVE_FURTHER both ways for a one-card stack", () => {
    const stack = { ...makeStack(), cards: [makeStack().cards[0]] };
    for (const dir of ["up", "down"]) {
      const r = moveCard(stack, "c1", dir);
      expect(r.ok).toBe(false);
      if (!r.ok) {
        expect(r.error.code).toBe("CANNOT_MOVE_FURTHER");
        expect(r.error.message).toBe(ERROR_MESSAGES.CANNOT_MOVE_FURTHER);
      }
    }
  });

  it("rejects moving the first card up", () => {
    const r = moveCard(makeStack(), "c1", "up");
    expect(!r.ok && r.error.code).toBe("CANNOT_MOVE_FURTHER");
  });

  it("rejects moving the last card down", () => {
    const r = moveCard(makeStack(), "c3", "down");
    expect(!r.ok && r.error.code).toBe("CANNOT_MOVE_FURTHER");
  });

  it("swaps with the neighbour and leaves other fields alone", () => {
    const stack = makeStack();
    const r = moveCard(stack, "c1", "down");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(ids(r.value)).toEqual(["c2", "c1", "c3"]);
    expect(r.value.name).toBe(stack.name);
    expect(r.value.cards[1]).toEqual(stack.cards[0]);
    expect(ids(stack)).toEqual(["c1", "c2", "c3"]);
  });

  it("counts a hidden neighbour as a position", () => {
    const r = moveCard(makeStack(), "c2", "down");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(ids(r.value)).toEqual(["c1", "c3", "c2"]);
    expect(r.value.cards[1].hidden).toBe(true);
  });

  it("returns CARD_NOT_FOUND for an unknown id", () => {
    const r = moveCard(makeStack(), "nope", "up");
    expect(!r.ok && r.error.code).toBe("CARD_NOT_FOUND");
  });

  it.each(["left", "", null, undefined, 1])(
    "returns BAD_DIRECTION for direction %j",
    (bad) => {
      const r = moveCard(makeStack(), "c2", bad);
      expect(!r.ok && r.error.code).toBe("BAD_DIRECTION");
    },
  );
});

describe("setCardHidden", () => {
  it("refuses to hide the last visible card", () => {
    // c3 is already hidden; hide c2 leaves only c1, then hide c1 must fail.
    const first = setCardHidden(makeStack(), "c2", true);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const r = setCardHidden(first.value, "c1", true);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe("MUST_STAY_VISIBLE");
      expect(r.error.message).toBe(ERROR_MESSAGES.MUST_STAY_VISIBLE);
    }
  });

  it("leaves a card with no hidden flag unchanged when shown", () => {
    const stack = makeStack();
    const r = setCardHidden(stack, "c1", false);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value).toEqual(stack);
    expect("hidden" in r.value.cards[0]).toBe(false);
  });

  it("returns the original stack after hiding then showing", () => {
    const stack = makeStack();
    const hiddenR = setCardHidden(stack, "c1", true);
    expect(hiddenR.ok).toBe(true);
    if (!hiddenR.ok) return;
    expect(hiddenR.value.cards[0].hidden).toBe(true);
    const shownR = setCardHidden(hiddenR.value, "c1", false);
    expect(shownR.ok && shownR.value).toEqual(stack);
    expect(shownR.ok && "hidden" in shownR.value.cards[0]).toBe(false);
  });

  it("does not change the input stack", () => {
    const stack = makeStack();
    setCardHidden(stack, "c1", true);
    expect(stack).toEqual(makeStack());
  });
});

describe("visibleCards", () => {
  it("returns only cards that are not hidden, in order", () => {
    expect(visibleCards(makeStack()).map((c) => c.id)).toEqual(["c1", "c2"]);
  });

  it("returns an empty list when every card is hidden", () => {
    const stack = makeStack();
    stack.cards = stack.cards.map((c) => ({ ...c, hidden: true }));
    expect(visibleCards(stack)).toEqual([]);
  });

  it("returns an empty list for a stack with no cards", () => {
    expect(visibleCards({ ...makeStack(), cards: [] })).toEqual([]);
  });
});
