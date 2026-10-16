// Stable ID-derived display coordinates. These are not a semantic embedding.
export function skillAngle(id: string) {
  let value = 2166136261;
  for (let i = 0; i < id.length; i++)
    value = Math.imul(value ^ id.charCodeAt(i), 16777619);
  return ((value >>> 0) / 4294967296) * Math.PI * 2;
}
