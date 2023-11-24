// Copyright 2023 J.W. Lagendijk. All rights reserved. MIT license.

import { assertEquals, beforeEach, describe, it } from "../dev_deps.ts";

import { Context } from "../src/lib/Context.ts";

describe("A new Mustache.Context", () => {
  let context: Context;

  beforeEach(() => {
    context = new Context({ name: "parent", message: "hi", a: { b: "b" } });
  });

  it("is able to lookup properties of its own view", () => {
    assertEquals(context.lookup("name"), "parent");
  });

  it("is able to lookup nested properties of its own view", () => {
    assertEquals(context.lookup("a.b"), "b");
  });

  describe("when pushed", () => {
    beforeEach(() => {
      context = context.push({ name: "child", c: { d: "d" } });
    });

    describe("returns the child context", () => {
      it("has child name", () => {
        assertEquals(context.view.name, "child");
      });

      it("has parent name", () => {
        assertEquals(context.parent?.view.name, "parent");
      });

      it("is able to lookup properties of its own view", () => {
        assertEquals(context.lookup("name"), "child");
      });

      it("is able to lookup properties of the parent context's view", () => {
        assertEquals(context.lookup("message"), "hi");
      });

      it("is able to lookup nested properties of its own view", () => {
        assertEquals(context.lookup("c.d"), "d");
      });
    });

    it("is able to lookup nested properties of its parent view", () => {
      assertEquals(context.lookup("a.b"), "b");
    });
  });
});

describe("A Mustache.Context", () => {
  let context: Context;

  describe("with an empty string in the lookup chain", () => {
    let view: Record<string, string | Record<string, string>>;

    beforeEach(() => {
      view = {
        a: {
          b: "b",
          "": "empty",
        },
      };
      (view.a as Record<string, string>).b = "value";
      context = new Context(view);
    });

    it("is able to lookup a nested property", () => {
      assertEquals(context.lookup("a.b"), (view.a as Record<string, string>).b);
    });
  });
});
