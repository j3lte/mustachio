// Copyright 2023 J.W. Lagendijk. All rights reserved. MIT license.

import { build, emptyDir } from "https://deno.land/x/dnt@0.39.0/mod.ts";

const cleanupTypes = async (dir: string) => {
  for await (const dirEntry of Deno.readDir(dir)) {
    const entryPath = `${dir}/${dirEntry.name}`;
    if (dirEntry.isDirectory) {
      await cleanupTypes(entryPath);
    } else {
      const file = await Deno.readTextFile(entryPath);
      const newFile = file.replaceAll('.js"', '"');
      await Deno.writeTextFile(entryPath, newFile);
    }
  }
};

await emptyDir("./npm");

await build({
  entryPoints: ["./src/mod.ts"],
  outDir: "./npm",
  mappings: {},
  declaration: "separate",
  skipSourceOutput: true,
  // scriptModule: false,
  shims: {
    // deno: true,
  },
  test: false,
  typeCheck: false,
  compilerOptions: {
    importHelpers: true,
    target: "ES2021",
    lib: ["ESNext"],
  },
  package: {
    // package.json properties
    name: "@j3lte/mustachio",
    version: Deno.args[0] || "1.0.0",
    description: "Mustache template engine for Deno/Node",
    license: "MIT",
    publishConfiig: {
      access: "public",
    },
    keywords: [
      "mustachio",
      "mustache",
      "template",
      "templates",
      "ejs",
    ],
    author: {
      name: "J.W. Lagendijk",
      email: "jwlagendijk@gmail.com",
    },
    repository: {
      type: "git",
      url: "git+https://github.com/j3lte/mustachio.git",
    },
    bugs: {
      url: "https://github.com/j3lte/mustachio/issues",
    },
  },
  async postBuild(): Promise<void> {
    // steps to run after building and before running the tests
    await Deno.copyFile("./LICENSE", "npm/LICENSE");
    await Deno.copyFile("./README.md", "npm/README.md");
    await cleanupTypes("./npm/types");
  },
});
