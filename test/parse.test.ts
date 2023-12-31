// Copyright 2023 J.W. Lagendijk. All rights reserved. MIT license.

import {
  assertEquals,
  assertNotEquals,
  assertThrows,
  beforeAll,
  beforeEach,
  describe,
  it,
} from "../dev_deps.ts";

import mustache from "../src/lib/Mustache.ts";

import { Token } from "../src/lib/parse.ts";

// A map of templates to their expected token output. Tokens are in the format:
// [type, value, startIndex, endIndex, subTokens].

// @deno-fmt-ignore
const expectations = {
  ''                                        : [],
  '{{hi}}'                                  : [ [ 'name', 'hi', 0, 6 ] ],
  '{{hi.world}}'                            : [ [ 'name', 'hi.world', 0, 12 ] ],
  '{{hi . world}}'                          : [ [ 'name', 'hi . world', 0, 14 ] ],
  '{{ hi}}'                                 : [ [ 'name', 'hi', 0, 7 ] ],
  '{{hi }}'                                 : [ [ 'name', 'hi', 0, 7 ] ],
  '{{ hi }}'                                : [ [ 'name', 'hi', 0, 8 ] ],
  '{{{hi}}}'                                : [ [ '&', 'hi', 0, 8 ] ],
  '{{!hi}}'                                 : [ [ '!', 'hi', 0, 7 ] ],
  '{{! hi}}'                                : [ [ '!', 'hi', 0, 8 ] ],
  '{{! hi }}'                               : [ [ '!', 'hi', 0, 9 ] ],
  '{{ !hi}}'                                : [ [ '!', 'hi', 0, 8 ] ],
  '{{ ! hi}}'                               : [ [ '!', 'hi', 0, 9 ] ],
  '{{ ! hi }}'                              : [ [ '!', 'hi', 0, 10 ] ],
  'a\n b'                                   : [ [ 'text', 'a\n b', 0, 4 ] ],
  'a{{hi}}'                                 : [ [ 'text', 'a', 0, 1 ], [ 'name', 'hi', 1, 7 ] ],
  'a {{hi}}'                                : [ [ 'text', 'a ', 0, 2 ], [ 'name', 'hi', 2, 8 ] ],
  ' a{{hi}}'                                : [ [ 'text', ' a', 0, 2 ], [ 'name', 'hi', 2, 8 ] ],
  ' a {{hi}}'                               : [ [ 'text', ' a ', 0, 3 ], [ 'name', 'hi', 3, 9 ] ],
  'a{{hi}}b'                                : [ [ 'text', 'a', 0, 1 ], [ 'name', 'hi', 1, 7 ], [ 'text', 'b', 7, 8 ] ],
  'a{{hi}} b'                               : [ [ 'text', 'a', 0, 1 ], [ 'name', 'hi', 1, 7 ], [ 'text', ' b', 7, 9 ] ],
  'a{{hi}}b '                               : [ [ 'text', 'a', 0, 1 ], [ 'name', 'hi', 1, 7 ], [ 'text', 'b ', 7, 9 ] ],
  'a\n{{hi}} b \n'                          : [ [ 'text', 'a\n', 0, 2 ], [ 'name', 'hi', 2, 8 ], [ 'text', ' b \n', 8, 12 ] ],
  'a\n {{hi}} \nb'                          : [ [ 'text', 'a\n ', 0, 3 ], [ 'name', 'hi', 3, 9 ], [ 'text', ' \nb', 9, 12 ] ],
  'a\n {{!hi}} \nb'                         : [ [ 'text', 'a\n', 0, 2 ], [ '!', 'hi', 3, 10 ], [ 'text', 'b', 12, 13 ] ],
  'a\n{{#a}}{{/a}}\nb'                      : [ [ 'text', 'a\n', 0, 2 ], [ '#', 'a', 2, 8, [], 8 ], [ 'text', 'b', 15, 16 ] ],
  'a\n {{#a}}{{/a}}\nb'                     : [ [ 'text', 'a\n', 0, 2 ], [ '#', 'a', 3, 9, [], 9 ], [ 'text', 'b', 16, 17 ] ],
  'a\n {{#a}}{{/a}} \nb'                    : [ [ 'text', 'a\n', 0, 2 ], [ '#', 'a', 3, 9, [], 9 ], [ 'text', 'b', 17, 18 ] ],
  'a\n{{#a}}\n{{/a}}\nb'                    : [ [ 'text', 'a\n', 0, 2 ], [ '#', 'a', 2, 8, [], 9 ], [ 'text', 'b', 16, 17 ] ],
  'a\n {{#a}}\n{{/a}}\nb'                   : [ [ 'text', 'a\n', 0, 2 ], [ '#', 'a', 3, 9, [], 10 ], [ 'text', 'b', 17, 18 ] ],
  'a\n {{#a}}\n{{/a}} \nb'                  : [ [ 'text', 'a\n', 0, 2 ], [ '#', 'a', 3, 9, [], 10 ], [ 'text', 'b', 18, 19 ] ],
  'a\n{{#a}}\n{{/a}}\n{{#b}}\n{{/b}}\nb'    : [ [ 'text', 'a\n', 0, 2 ], [ '#', 'a', 2, 8, [], 9 ], [ '#', 'b', 16, 22, [], 23 ], [ 'text', 'b', 30, 31 ] ],
  'a\n {{#a}}\n{{/a}}\n{{#b}}\n{{/b}}\nb'   : [ [ 'text', 'a\n', 0, 2 ], [ '#', 'a', 3, 9, [], 10 ], [ '#', 'b', 17, 23, [], 24 ], [ 'text', 'b', 31, 32 ] ],
  'a\n {{#a}}\n{{/a}}\n{{#b}}\n{{/b}} \nb'  : [ [ 'text', 'a\n', 0, 2 ], [ '#', 'a', 3, 9, [], 10 ], [ '#', 'b', 17, 23, [], 24 ], [ 'text', 'b', 32, 33 ] ],
  'a\n{{#a}}\n{{#b}}\n{{/b}}\n{{/a}}\nb'    : [ [ 'text', 'a\n', 0, 2 ], [ '#', 'a', 2, 8, [ [ '#', 'b', 9, 15, [], 16 ] ], 23 ], [ 'text', 'b', 30, 31 ] ],
  'a\n {{#a}}\n{{#b}}\n{{/b}}\n{{/a}}\nb'   : [ [ 'text', 'a\n', 0, 2 ], [ '#', 'a', 3, 9, [ [ '#', 'b', 10, 16, [], 17 ] ], 24 ], [ 'text', 'b', 31, 32 ] ],
  'a\n {{#a}}\n{{#b}}\n{{/b}}\n{{/a}} \nb'  : [ [ 'text', 'a\n', 0, 2 ], [ '#', 'a', 3, 9, [ [ '#', 'b', 10, 16, [], 17 ] ], 24 ], [ 'text', 'b', 32, 33 ] ],
  '{{>abc}}'                                : [ [ '>', 'abc', 0, 8, '', 0, false ] ],
  '{{> abc }}'                              : [ [ '>', 'abc', 0, 10, '', 0, false ] ],
  '{{ > abc }}'                             : [ [ '>', 'abc', 0, 11, '', 0, false ] ],
  '  {{> abc }}\n'                          : [ [ '>', 'abc', 2, 12, '  ', 0, false ] ],
  '  {{> abc }} {{> abc }}\n'               : [ [ '>', 'abc', 2, 12, '  ', 0, false ], [ '>', 'abc', 13, 23, '   ', 1, false ] ],
  '{{=<% %>=}}'                             : [ [ '=', '<% %>', 0, 11 ] ],
  '{{= <% %> =}}'                           : [ [ '=', '<% %>', 0, 13 ] ],
  '{{=<% %>=}}<%={{ }}=%>'                  : [ [ '=', '<% %>', 0, 11 ], [ '=', '{{ }}', 11, 22 ] ],
  '{{=<% %>=}}<%hi%>'                       : [ [ '=', '<% %>', 0, 11 ], [ 'name', 'hi', 11, 17 ] ],
  '{{#a}}{{/a}}hi{{#b}}{{/b}}\n'            : [ [ '#', 'a', 0, 6, [], 6 ], [ 'text', 'hi', 12, 14 ], [ '#', 'b', 14, 20, [], 20 ], [ 'text', '\n', 26, 27 ] ],
  '{{a}}\n{{b}}\n\n{{#c}}\n{{/c}}\n'        : [ [ 'name', 'a', 0, 5 ], [ 'text', '\n', 5, 6 ], [ 'name', 'b', 6, 11 ], [ 'text', '\n\n', 11, 13 ], [ '#', 'c', 13, 19, [], 20 ] ],
  '{{#foo}}\n  {{#a}}\n    {{b}}\n  {{/a}}\n{{/foo}}\n'
                                            : [ [ '#', 'foo', 0, 8, [ [ '#', 'a', 11, 17, [ [ 'text', '    ', 18, 22 ], [ 'name', 'b', 22, 27 ], [ 'text', '\n', 27, 28 ] ], 30 ] ], 37 ] ]
};

let originalTemplateCache: Map<string, Token[]>;

describe("mustache.parse", () => {
  beforeAll(() => {
    originalTemplateCache = mustache.templateCache as Map<string, Token[]>;
  });

  beforeEach(() => {
    mustache.clearCache();
    mustache.templateCache = originalTemplateCache;
  });

  for (const template in expectations) {
    if (Object.prototype.hasOwnProperty.call(expectations, template)) {
      ((template, tokens) => {
        it("knows how to parse " + JSON.stringify(template), () => {
          assertEquals(mustache.parse(template), tokens as Token[]);
        });
      })(template, expectations[template as keyof typeof expectations]);
    }
  }

  describe("when there is an unclosed tag", () => {
    it("throws an error", () => {
      assertThrows(() => {
        mustache.parse("My name is {{name");
      });
    });
  });

  describe("when there is an unclosed section", () => {
    it("throws an error", () => {
      assertThrows(() => {
        mustache.parse("A list: {{#people}}{{name}}");
      });
    });
  });

  describe("when there is an unopened section", () => {
    it("throws an error", () => {
      assertThrows(() => {
        mustache.parse("The end of the list! {{/people}}");
      });
    });
  });

  describe("when invalid tags are given as an argument", () => {
    it("throws an error", () => {
      assertThrows(() => {
        mustache.parse("A template <% name %>", ["<%"]);
      });
    });
  });

  describe("when the template contains invalid tags", () => {
    it("throws an error", () => {
      assertThrows(() => {
        mustache.parse("A template {{=<%=}}");
      });
    });
  });

  describe("when parsing a template without tags specified followed by the same template with tags specified", () => {
    it("returns different tokens for the latter parse", () => {
      const template = "{{foo}}[bar]";
      const parsedWithBraces = mustache.parse(template);
      const parsedWithBrackets = mustache.parse(template, ["[", "]"]);
      assertNotEquals(parsedWithBrackets, parsedWithBraces);
    });
  });

  describe("when parsing a template with tags specified followed by the same template with different tags specified", () => {
    it("returns different tokens for the latter parse", () => {
      const template = "(foo)[bar]";
      const parsedWithParens = mustache.parse(template, ["(", ")"]);
      const parsedWithBrackets = mustache.parse(template, ["[", "]"]);
      assertNotEquals(parsedWithBrackets, parsedWithParens);
    });
  });

  describe("when parsing a template after already having parsed that template with a different mustache.tags", () => {
    it("returns different tokens for the latter parse", () => {
      const template = "{{foo}}[bar]";
      const parsedWithBraces = mustache.parse(template);

      const oldTags = mustache.tags;
      mustache.tags = ["[", "]"];
      const parsedWithBrackets = mustache.parse(template);
      mustache.tags = oldTags;

      assertNotEquals(parsedWithBrackets, parsedWithBraces);
    });
  });

  describe("when parsing a template with the same tags second time, return the cached tokens", () => {
    it("returns the same tokens for the latter parse", () => {
      const template = "{{foo}}[bar]";
      const parsedResult1 = mustache.parse(template);
      const parsedResult2 = mustache.parse(template);

      assertEquals(parsedResult1, parsedResult2);
    });
  });

  describe("when parsing a template with caching disabled and the same tags second time, do not return the cached tokens", () => {
    it("returns different tokens for the latter parse", () => {
      mustache.templateCache = undefined;
      const template = "{{foo}}[bar]";
      const parsedResult1 = mustache.parse(template);
      const parsedResult2 = mustache.parse(template);

      assertEquals(parsedResult1, parsedResult2);
    });
  });
});
