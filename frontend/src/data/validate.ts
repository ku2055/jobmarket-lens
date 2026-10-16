import Ajv from "ajv";
import schema from "./contracts/release.schema.json";
const ajv = new Ajv({ allErrors: true, strict: false });
const validators = new Map<string, ReturnType<typeof ajv.compile>>();
export function validate<T>(kind: string, value: unknown): T {
  let fn = validators.get(kind);
  if (!fn) {
    fn = ajv.compile({ $ref: `#/$defs/${kind}`, $defs: schema.$defs });
    validators.set(kind, fn);
  }
  if (!fn(value))
    throw new Error(
      `Invalid ${kind}: ${ajv.errorsText(fn.errors).slice(0, 300)}`,
    );
  return value as T;
}
export async function hash(bytes: ArrayBuffer): Promise<string> {
  const out = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(out)]
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}
