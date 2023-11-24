// Copyright 2023 J.W. Lagendijk. All rights reserved. MIT license.

import { Context } from "./Context.ts";
import { Config, Writer } from "./Writer.ts";
import { Token } from "./parse.ts";
import { escapeHtml, typeStr } from "./util.ts";

export class Mustache {
  static name = "mustache.deno";
  static version = "0.1.0";
  tags = ["{{", "}}"];
  escape = escapeHtml;

  writer: Writer;

  /**
   * The name of the module.
   * `name = "mustache.deno"`
   */
  readonly name = Mustache.name;
  /**
   * The version of the module.
   * `version = "1.0.0"`
   */
  readonly version = Mustache.version;

  constructor() {
    this.writer = new Writer();
  }

  set templateCache(cache: Map<string, Token[]> | undefined) {
    this.writer.templateCache = cache;
  }

  clearCache(): void {
    return this.writer.clearCache();
  }

  parse(template: string, tags: string[] = this.tags): Token[] {
    return this.writer.parse(template, tags);
  }

  render(
    template: string,
    view: Context | unknown,
    partials: Record<string, string> = {},
    config: Partial<Config> | string[] = {
      tags: this.tags,
      escape: escapeHtml,
    },
  ): string {
    if (typeof template !== "string") {
      throw new TypeError(
        'Invalid template! Template should be a "string" ' +
          'but "' +
          typeStr(template) +
          '" was given as the first ' +
          "argument for mustache#render(template, view, partials)",
      );
    }
    return this.writer.render(template, view, partials, config);
  }
}

const mustache = new Mustache();

export default mustache;
