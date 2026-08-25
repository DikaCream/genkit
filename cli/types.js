/* Maps GenVM schema types to TypeScript and Python types. */

export function tsType(type) {
  if (type === "int" || type === "uint" || type === "u8" || type === "u16" || type === "u32" || type === "u64" || type === "u256" || type === "i8" || type === "i16" || type === "i32" || type === "i64" || type === "i256") {
    return "number";
  }
  if (type === "string") return "string";
  if (type === "bool") return "boolean";
  if (type === "address") return "Address";
  if (type === "any") return "unknown";
  if (type === "null") return "null";
  if (type && typeof type === "object") {
    if ("$dict" in type) {
      return `Record<string, ${tsType(type.$dict)}>`;
    }
    if ("$rep" in type) {
      return `${tsType(type.$rep)}[]`;
    }
  }
  return "unknown";
}

export function pyType(type) {
  if (type === "int" || type === "uint" || type === "u8" || type === "u16" || type === "u32" || type === "u64" || type === "u256" || type === "i8" || type === "i16" || type === "i32" || type === "i64" || type === "i256") {
    return "int";
  }
  if (type === "string") return "str";
  if (type === "bool") return "bool";
  if (type === "address") return "str";
  if (type === "any") return "Any";
  if (type === "null") return "None";
  if (type && typeof type === "object") {
    if ("$dict" in type) {
      return `Dict[str, ${pyType(type.$dict)}]`;
    }
    if ("$rep" in type) {
      return `List[${pyType(type.$rep)}]`;
    }
  }
  return "Any";
}

export function tsLiteralExample(type) {
  if (type === "int" || type === "uint" || type === "u8" || type === "u16" || type === "u32" || type === "u64" || type === "u256") {
    return "1";
  }
  if (type === "string") return '"example"';
  if (type === "bool") return "true";
  if (type === "address") return '"0x0000000000000000000000000000000000000000"';
  if (type === "null") return "null";
  if (type && typeof type === "object") {
    if ("$dict" in type) return `{} as ${tsType(type)}`;
    if ("$rep" in type) return `[] as ${tsType(type)}`;
  }
  return "undefined as unknown";
}

export function pyLiteralExample(type) {
  if (type === "int" || type === "uint" || type === "u8" || type === "u16" || type === "u32" || type === "u64" || type === "u256") {
    return "1";
  }
  if (type === "string") return '"example"';
  if (type === "bool") return "True";
  if (type === "address") return '"0x0000000000000000000000000000000000000000"';
  if (type === "null") return "None";
  if (type && typeof type === "object") {
    if ("$dict" in type) return "{}";
    if ("$rep" in type) return "[]";
  }
  return "None";
}

export function camelCase(name) {
  return name.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());
}

export function methodParams(method) {
  const params = Array.isArray(method.params) ? method.params : [];
  return params.map((p) => ({ name: p[0], type: p[1] }));
}
