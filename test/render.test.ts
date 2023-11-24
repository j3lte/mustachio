// Copyright 2023 J.W. Lagendijk. All rights reserved. MIT license.

import { assertEquals, assertThrows, beforeEach, describe, it } from "../dev_deps.ts";
import { getTests } from "./helpers/render-helper.ts";

import mustache from "../src/lib/Mustache.ts";

const tests = await getTests();

describe("mustache.render", () => {
  beforeEach(() => {
    mustache.clearCache();
  });

  it("requires template to be a string", () => {
    assertThrows(
      () => {
        // @ts-ignore This should be caught by the type system, but for JS users we need to check at runtime
        mustache.render(["dummy template"], ["foo", "bar"]);
      },
      TypeError,
      'Invalid template! Template should be a "string" but ' +
        '"array" was given as the first argument ' +
        "for mustache#render(template, view, partials)",
    );
  });

  describe("custom tags", () => {
    it("uses tags argument instead of mustache.tags when given", () => {
      const template = "<<placeholder>>bar{{placeholder}}";

      mustache.tags = ["{{", "}}"];
      assertEquals(
        mustache.render(template, { placeholder: "foo" }, {}, ["<<", ">>"]),
        "foobar{{placeholder}}",
      );
    });

    it("uses config.tags argument instead of mustache.tags when given", () => {
      const template = "<<placeholder>>bar{{placeholder}}";

      mustache.tags = ["{{", "}}"];
      assertEquals(
        mustache.render(template, { placeholder: "foo" }, {}, { tags: ["<<", ">>"] }),
        "foobar{{placeholder}}",
      );
    });

    it("uses tags argument instead of mustache.tags when given, even when it previously rendered the template using mustache.tags", () => {
      const template = "((placeholder))bar{{placeholder}}";

      mustache.tags = ["{{", "}}"];
      mustache.render(template, { placeholder: "foo" });
      assertEquals(
        mustache.render(template, { placeholder: "foo" }, {}, ["((", "))"]),
        "foobar{{placeholder}}",
      );
    });

    it("uses config.tags argument instead of mustache.tags when given, even when it previously rendered the template using mustache.tags", () => {
      const template = "((placeholder))bar{{placeholder}}";

      mustache.tags = ["{{", "}}"];
      mustache.render(template, { placeholder: "foo" });
      assertEquals(
        mustache.render(template, { placeholder: "foo" }, {}, { tags: ["((", "))"] }),
        "foobar{{placeholder}}",
      );
    });

    it("uses tags argument instead of mustache.tags when given, even when it previously rendered the template using different tags", () => {
      const template = "[[placeholder]]bar<<placeholder>>";

      mustache.render(template, { placeholder: "foo" }, {}, ["<<", ">>"]);
      assertEquals(
        mustache.render(template, { placeholder: "foo" }, {}, ["[[", "]]"]),
        "foobar<<placeholder>>",
      );
    });

    it("uses config.tags argument instead of mustache.tags when given, even when it previously rendered the template using different tags", () => {
      const template = "[[placeholder]]bar<<placeholder>>";

      mustache.render(template, { placeholder: "foo" }, {}, ["<<", ">>"]);
      assertEquals(
        mustache.render(template, { placeholder: "foo" }, {}, { tags: ["[[", "]]"] }),
        "foobar<<placeholder>>",
      );
    });

    it("does not mutate mustache.tags when given tags argument", () => {
      const correctMustacheTags = ["{{", "}}"];
      mustache.tags = correctMustacheTags;

      mustache.render("((placeholder))", { placeholder: "foo" }, {}, ["((", "))"]);

      assertEquals(mustache.tags, correctMustacheTags);
      assertEquals(mustache.tags, ["{{", "}}"]);
    });

    it("does not mutate mustache.tags when given config.tags argument", () => {
      const correctMustacheTags = ["{{", "}}"];
      mustache.tags = correctMustacheTags;

      mustache.render(
        "((placeholder))",
        { placeholder: "foo" },
        {},
        { tags: ["((", "))"] },
      );

      assertEquals(mustache.tags, correctMustacheTags);
      assertEquals(mustache.tags, ["{{", "}}"]);
    });

    it("uses provided tags when rendering partials", () => {
      const output = mustache.render("<%> partial %>", { name: "Santa Claus" }, {
        partial: "<% name %>",
      }, ["<%", "%>"]);

      assertEquals(output, "Santa Claus");
    });

    it("uses provided config.tags when rendering partials", () => {
      const output = mustache.render("<%> partial %>", { name: "Santa Claus" }, {
        partial: "<% name %>",
      }, { tags: ["<%", "%>"] });

      assertEquals(output, "Santa Claus");
    });

    it("uses config.escape argument instead of mustache.escape when given", () => {
      const template = "Hello, {{placeholder}}";

      function escapeBang(text: string): string {
        return text + "!";
      }
      assertEquals(
        mustache.render(template, { placeholder: "world" }, {}, { escape: escapeBang }),
        "Hello, world!",
      );
    });

    it("uses config.escape argument instead of mustache.escape when given, even when it previously rendered the template using mustache.escape", () => {
      const template = "Hello, {{placeholder}}";

      function escapeQuestion(text: string): string {
        return text + "?";
      }
      mustache.render(template, { placeholder: "world" });
      assertEquals(
        mustache.render(
          template,
          { placeholder: "world" },
          {},
          { escape: escapeQuestion },
        ),
        "Hello, world?",
      );
    });

    it("uses config.escape argument instead of mustache.escape when given, even when it previously rendered the template using a different escape function", () => {
      const template = "Hello, {{placeholder}}";

      function escapeQuestion(text: string): string {
        return text + "?";
      }
      function escapeBang(text: string): string {
        return text + "!";
      }
      mustache.render(template, { placeholder: "foo" }, {}, { escape: escapeQuestion });
      assertEquals(
        mustache.render(template, { placeholder: "foo" }, {}, { escape: escapeBang }),
        "Hello, foo!",
      );
    });

    it("does not mutate mustache.escape when given config.escape argument", () => {
      const correctMustacheEscape = mustache.escape;

      function escapeNone(text: string): string {
        return text;
      }
      mustache.render(
        "((placeholder))",
        { placeholder: "foo" },
        {},
        { escape: escapeNone },
      );

      assertEquals(mustache.escape, correctMustacheEscape);
      assertEquals(mustache.escape(">&"), "&gt;&amp;");
    });

    it("uses provided config.escape when rendering partials", () => {
      function escapeDoubleAmpersand(text: string): string {
        return text.replace("&", "&&");
      }
      const output = mustache.render("{{> partial }}", { name: "Ampersand &" }, {
        partial: "{{ name }}",
      }, { escape: escapeDoubleAmpersand });

      assertEquals(output, "Ampersand &&");
    });

    it("uses config.tags and config.escape arguments instead of mustache.tags and mustache.escape when given", () => {
      const template = "Hello, {{placeholder}} [[placeholder]]";

      function escapeTwoBangs(text: string): string {
        return text + "!!";
      }
      const config = {
        tags: ["[[", "]]"],
        escape: escapeTwoBangs,
      };
      assertEquals(
        mustache.render(template, { placeholder: "world" }, {}, config),
        "Hello, {{placeholder}} world!!",
      );
    });

    it("uses provided config.tags and config.escape when rendering partials", () => {
      function escapeDoubleAmpersand(text: string): string {
        return text.replace("&", "&&");
      }
      const config = {
        tags: ["[[", "]]"],
        escape: escapeDoubleAmpersand,
      };
      const output = mustache.render("[[> partial ]]", { name: "Ampersand &" }, {
        partial: "[[ name ]]",
      }, config);

      assertEquals(output, "Ampersand &&");
    });

    it("uses provided config.tags and config.escape when rendering sections", () => {
      const template = "<[[&value-raw]]: " +
        "[[#test-1]][[value-1]][[/test-1]]" +
        "[[^test-2]][[value-2]][[/test-2]], " +
        "[[#test-lambda]][[value-lambda]][[/test-lambda]]" +
        ">";

      function escapeQuotes(text: string): string {
        return '"' + text + '"';
      }
      const config = {
        tags: ["[[", "]]"],
        escape: escapeQuotes,
      };
      const viewTestTrue = {
        "value-raw": "foo",
        "test-1": true,
        "value-1": "abc",
        "test-2": true,
        "value-2": "123",
        "test-lambda": () => {
          return function (text: string, render: (text: string) => string): string {
            return "lambda: " + render(text);
          };
        },
        "value-lambda": "bar",
      };
      const viewTestFalse = {
        "value-raw": "foo",
        "test-1": false,
        "value-1": "abc",
        "test-2": false,
        "value-2": "123",
        "test-lambda": () => {
          return function (text: string, render: (text: string) => string): string {
            return "lambda: " + render(text);
          };
        },
        "value-lambda": "bar",
      };
      const outputTrue = mustache.render(template, viewTestTrue, {}, config);
      const outputFalse = mustache.render(template, viewTestFalse, {}, config);

      assertEquals(outputTrue, '<foo: "abc", lambda: "bar">');
      assertEquals(outputFalse, '<foo: "123", lambda: "bar">');
    });
  });

  tests.forEach((test) => {
    const view = eval(test.view);

    if (test.template === null) {
      console.log("Skipping " + test.name + " because no template was found.");
      return;
    }

    it("knows how to render " + test.name, () => {
      let output;
      if (test.partial) {
        output = mustache.render(test.template as string, view, { partial: test.partial });
      } else {
        output = mustache.render(test.template as string, view);
      }

      // output.should.equal(test.expect);
      assertEquals(output, test.expect);
    });
  });
});
