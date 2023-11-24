// Copyright 2023 J.W. Lagendijk. All rights reserved. MIT license.

import { Scanner } from "./Scanner.ts";
import { escapeRegExp, isArray, isWhitespace } from "./util.ts";

const whiteRe = /\s*/;
const spaceRe = /\s+/;
const equalsRe = /\s*=/;
const curlyRe = /\s*\}/;
const tagRe = /#|\^|\/|>|\{|&|=|!/;

export type Token = [string, string, number, number, (string | Token[])?, number?, boolean?];

/**
 * Forms the given array of `tokens` into a nested tree structure where
 * tokens that represent a section have two additional items: 1) an array of
 * all tokens that appear in that section and 2) the index in the original
 * template that represents the end of that section.
 */
function nestTokens(tokens: Token[]): Token[] {
  const nestedTokens: Token[] = [];
  let collector: Token[] = nestedTokens;
  const sections: Token[] = [];

  // var token, section;
  let token: Token;
  let section: Token;

  for (let i = 0, numTokens = tokens.length; i < numTokens; ++i) {
    token = tokens[i];

    switch (token[0]) {
      case "#":
      case "^":
        collector.push(token);
        sections.push(token);
        collector = token[4] = [];
        break;
      case "/":
        section = sections.pop() as Token;
        section[5] = token[2];
        collector =
          (sections.length > 0 ? sections[sections.length - 1][4] : nestedTokens) as Token[];
        break;
      default:
        collector.push(token);
    }
  }

  return nestedTokens;
}

/**
 * Combines the values of consecutive text tokens in the given `tokens` array
 * to a single token.
 */
function squashTokens(tokens: Token[]): Token[] {
  const squashedTokens: Token[] = [];

  // var token, lastToken;
  let token: Token;
  let lastToken: Token | undefined;

  for (let i = 0, numTokens = tokens.length; i < numTokens; ++i) {
    token = tokens[i];

    if (token) {
      if (token[0] === "text" && lastToken && lastToken[0] === "text") {
        lastToken[1] += token[1];
        lastToken[3] = token[3];
      } else {
        squashedTokens.push(token);
        lastToken = token;
      }
    }
  }

  return squashedTokens;
}

function compileTags(tagsToCompile: string | string[]): {
  openingTagRe: RegExp;
  closingTagRe: RegExp;
  closingCurlyRe: RegExp;
} {
  if (typeof tagsToCompile === "string") {
    tagsToCompile = tagsToCompile.split(spaceRe, 2);
  }

  if (!isArray(tagsToCompile) || tagsToCompile.length !== 2) {
    throw new Error("Invalid tags: " + tagsToCompile);
  }

  const openingTagRe = new RegExp(escapeRegExp(tagsToCompile[0]) + "\\s*");
  const closingTagRe = new RegExp("\\s*" + escapeRegExp(tagsToCompile[1]));
  const closingCurlyRe = new RegExp("\\s*" + escapeRegExp("}" + tagsToCompile[1]));

  return { openingTagRe, closingTagRe, closingCurlyRe };
}

/**
 * Breaks up the given `template` string into a tree of tokens. If the `tags`
 * argument is given here it must be an array with two string values: the
 * opening and closing tags used in the template (e.g. [ "<%", "%>" ]). Of
 * course, the default is to use mustaches (i.e. mustache.tags).
 *
 * A token is an array with at least 4 elements. The first element is the
 * mustache symbol that was used inside the tag, e.g. "#" or "&". If the tag
 * did not contain a symbol (i.e. {{myValue}}) this element is "name". For
 * all text that appears outside a symbol this element is "text".
 *
 * The second element of a token is its "value". For mustache tags this is
 * whatever else was inside the tag besides the opening symbol. For text tokens
 * this is the text itself.
 *
 * The third and fourth elements of the token are the start and end indices,
 * respectively, of the token in the original template.
 *
 * Tokens that are the root node of a subtree contain two more elements: 1) an
 * array of tokens in the subtree and 2) the index in the original template at
 * which the closing tag for that section begins.
 *
 * Tokens for partials also contain two more elements: 1) a string value of
 * indendation prior to that tag and 2) the index of that tag on that line -
 * eg a value of 2 indicates the partial is the third tag on this line.
 */

export function parseTemplate(template: string, tags: string[]): Token[] {
  if (!template) {
    return [];
  }
  let lineHasNonSpace = false;
  const sections = []; // Stack to hold section tokens
  const tokens: Array<Token> = []; // Buffer to hold the tokens

  let spaces: number[] = []; // Indices of whitespace tokens on the current line
  let hasTag = false; // Is there a {{tag}} on the current line?
  let nonSpace = false; // Is there a non-space char on the current line?
  let indentation = ""; // Tracks indentation for tags that use it
  let tagIndex = 0; // Stores a count of number of tags encountered on a line

  // Strips all whitespace tokens array for the current line
  // if there was a {{#tag}} on it and otherwise only space.
  function stripSpace(): void {
    if (hasTag && !nonSpace) {
      while (spaces.length) {
        delete tokens[spaces.pop() as number];
      }
    } else {
      spaces = [];
    }

    hasTag = false;
    nonSpace = false;
  }

  let { openingTagRe, closingTagRe, closingCurlyRe } = compileTags(tags || ["{{", "}}"]);

  const scanner = new Scanner(template);

  let start: number;
  let type: string;
  let value: string;
  let chr: string;
  let token: Token;
  let openSection;

  while (!scanner.eos()) {
    start = scanner.pos;

    // Match any text between tags.
    value = scanner.scanUntil(openingTagRe);

    if (value) {
      for (let i = 0, valueLength = value.length; i < valueLength; ++i) {
        chr = value.charAt(i);

        if (isWhitespace(chr)) {
          spaces.push(tokens.length);
          indentation += chr;
        } else {
          nonSpace = true;
          lineHasNonSpace = true;
          indentation += " ";
        }

        tokens.push(["text", chr, start, start + 1]);
        start += 1;

        // Check for whitespace on the current line.
        if (chr === "\n") {
          stripSpace();
          indentation = "";
          tagIndex = 0;
          lineHasNonSpace = false;
        }
      }
    }

    // Match the opening tag.
    if (!scanner.scan(openingTagRe)) {
      break;
    }

    hasTag = true;

    // Get the tag type.
    type = scanner.scan(tagRe) || "name";
    scanner.scan(whiteRe);

    // Get the tag value.
    if (type === "=") {
      value = scanner.scanUntil(equalsRe);
      scanner.scan(equalsRe);
      scanner.scanUntil(closingTagRe);
    } else if (type === "{") {
      value = scanner.scanUntil(closingCurlyRe);
      scanner.scan(curlyRe);
      scanner.scanUntil(closingTagRe);
      type = "&";
    } else {
      value = scanner.scanUntil(closingTagRe);
    }

    // Match the closing tag.
    if (!scanner.scan(closingTagRe)) {
      throw new Error("Unclosed tag at " + scanner.pos);
    }

    if (type == ">") {
      token = [type, value, start, scanner.pos, indentation, tagIndex, lineHasNonSpace];
    } else {
      token = [type, value, start, scanner.pos];
    }
    tagIndex++;
    tokens.push(token);

    if (type === "#" || type === "^") {
      sections.push(token);
    } else if (type === "/") {
      // Check section nesting.
      openSection = sections.pop();

      if (!openSection) {
        throw new Error('Unopened section "' + value + '" at ' + start);
      }

      if (openSection[1] !== value) {
        throw new Error('Unclosed section "' + openSection[1] + '" at ' + start);
      }
    } else if (type === "name" || type === "{" || type === "&") {
      nonSpace = true;
    } else if (type === "=") {
      ({ openingTagRe, closingTagRe, closingCurlyRe } = compileTags(value));
    }
  }

  stripSpace();

  // Make sure there are no open sections when we're done.
  openSection = sections.pop();

  if (openSection) {
    throw new Error('Unclosed section "' + openSection[1] + '" at ' + scanner.pos);
  }

  return nestTokens(squashTokens(tokens));
}
