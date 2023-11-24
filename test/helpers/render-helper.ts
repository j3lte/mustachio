// Copyright 2023 J.W. Lagendijk. All rights reserved. MIT license.

const getDirPath = (): string => {
  const filePath = new URL(import.meta.url).pathname;
  const dirPath = filePath.split("/").slice(0, -1).join("/");
  return dirPath;
};

const filesPath = `${getDirPath()}/_files`;

const getContens = async (testName: string, ext: string): Promise<string | null> => {
  try {
    const contents = await Deno.readTextFile(`${filesPath}/${testName}.${ext}`);
    return contents;
  } catch (_ex) {
    return null;
  }
};

const getView = async (testName: string): Promise<string> => {
  let view = await getContens(testName, "js");
  if (!view) view = await getContens(testName, "cjs");
  if (!view) throw new Error(`Cannot find view for test "${testName}"`);
  return view;
};

const getPartial = async (testName: string): Promise<string | null> => {
  try {
    const partial = await getContens(testName, "partial");
    return partial;
  } catch (_ex) {
    return null;
  }
};

export interface Test {
  name: string;
  view: string;
  template: string | null;
  partial: string | null;
  expect: string | null;
}

const getTest = async (testName: string): Promise<Test> => {
  const view = await getView(testName);
  const template = await getContens(testName, "mustache");
  const partial = await getPartial(testName);
  const expect = await getContens(testName, "txt");
  return { name: testName, view, template, partial, expect };
};

export const getTests = async (): Promise<Test[]> => {
  const testNames = Deno.readDir(filesPath);
  const tests: Test[] = [];

  for await (const file of testNames) {
    if (!file.name.endsWith(".js") && !file.name.endsWith(".cjs")) continue;
    const testName = file.name.split(".")[0];
    const test = await getTest(testName);
    tests.push(test);
  }
  return tests;
};
