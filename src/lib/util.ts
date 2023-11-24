// Copyright 2023 J.W. Lagendijk. All rights reserved. MIT license.

// deno-lint-ignore-file ban-types no-explicit-any

export function isFunction(obj: any): obj is Function {
  return typeof obj === "function";
}

export function objectToString(o: any): string {
  return Object.prototype.toString.call(o);
}

export function isArray(a: any): a is Array<any> {
  return Array.isArray(a) || objectToString(a) === "[object Array]";
}

export function typeStr(obj: any): string {
  return isArray(obj) ? "array" : typeof obj;
}

export function escapeRegExp(string: string): string {
  return string.replace(/[\-\[\]{}()*+?.,\\\^$|#\s]/g, "\\$&");
}

/**
 * Null safe way of checking whether or not an object,
 * including its prototype, has a given property
 *
 * @param obj The object to check
 * @param propName The property name to check for
 * @returns true if the object has the property, false otherwise
 */
export function hasProperty(obj: any, propName: string): boolean {
  return obj != null && typeof obj === "object" && (propName in obj);
}

/**
 * Safe way of detecting whether or not the given thing is a primitive and
 * whether it has the given property
 *
 * @param primitive The thing to check
 * @param propName The property name to check for
 * @returns true if the thing is a primitive and has the property, false otherwise
 */
export function primitiveHasOwnProperty(primitive: any, propName: string): boolean {
  return (
    primitive != null &&
    typeof primitive !== "object" &&
    primitive.hasOwnProperty &&
    // deno-lint-ignore no-prototype-builtins
    primitive.hasOwnProperty(propName)
  );
}

const regExpTest = RegExp.prototype.test;
export function testRegExp(re: RegExp, string: string): boolean {
  return regExpTest.call(re, string);
}

const nonSpaceRe = /\S/;
export function isWhitespace(string: string): boolean {
  return !testRegExp(nonSpaceRe, string);
}

const entityMap = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
  "/": "&#x2F;",
  "`": "&#x60;",
  "=": "&#x3D;",
};

export function escapeHtml(string: string): string {
  return String(string).replace(/[&<>"'`=\/]/g, (s) => {
    return entityMap[s as keyof typeof entityMap] as string;
  });
}
