// Copyright 2023 J.W. Lagendijk. All rights reserved. MIT license.

import { assert, assertEquals, beforeEach, describe, it } from "../dev_deps.ts";

import { Scanner } from "../src/lib/Scanner.ts";

describe("A new Mustache.Scanner", () => {
  describe("for an empty string", () => {
    it("is at the end", () => {
      const scanner = new Scanner("");
      assert(scanner.eos());
    });
  });

  describe("for a non-empty string", () => {
    let scanner: Scanner;
    beforeEach(() => {
      scanner = new Scanner("a b c");
    });

    describe("scan", () => {
      describe("has a string property", () => {
        it("returns the string", () => {
          assertEquals(scanner.string, "a b c");
        });
        it("returns the tail", () => {
          assertEquals(scanner.tail, "a b c");
        });
      });

      describe("when the RegExp matches the entire string", () => {
        it("returns the entire string", () => {
          const match = scanner.scan(/a b c/);
          assertEquals(match, scanner.string);
          assert(scanner.eos());
        });
      });

      describe("when the RegExp matches at index 0", () => {
        it("returns the portion of the string that matched", () => {
          const match = scanner.scan(/a/);
          assertEquals(match, "a");
          assertEquals(scanner.pos, 1);
        });
      });

      describe("when the RegExp matches at some index other than 0", () => {
        it("returns the empty string", () => {
          const match = scanner.scan(/b/);
          assertEquals(match, "");
          assertEquals(scanner.pos, 0);
        });
      });

      describe("when the RegExp does not match", () => {
        it("returns the empty string", () => {
          const match = scanner.scan(/z/);
          assertEquals(match, "");
          assertEquals(scanner.pos, 0);
        });
      });
    }); // scan

    describe("scanUntil", () => {
      describe("when the RegExp matches at index 0", () => {
        it("returns the empty string", () => {
          const match = scanner.scanUntil(/a/);
          assertEquals(match, "");
          assertEquals(scanner.pos, 0);
        });
      });

      describe("when the RegExp matches at some index other than 0", () => {
        it("returns the string up to that index", () => {
          const match = scanner.scanUntil(/b/);
          assertEquals(match, "a ");
          assertEquals(scanner.pos, 2);
        });
      });

      describe("when the RegExp does not match", () => {
        it("returns the entire string", () => {
          const match = scanner.scanUntil(/z/);
          assertEquals(match, scanner.string);
          assert(scanner.eos());
        });
      });
    }); // scanUntil
  }); // for a non-empty string
});
