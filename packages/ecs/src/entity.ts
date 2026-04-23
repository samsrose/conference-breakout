export type EntityId = string & { readonly __entity: unique symbol };

export function newEntityId(prefix: string): EntityId {
  const bytes = new Uint8Array(9);
  crypto.getRandomValues(bytes);
  const rand = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${prefix}_${rand}` as EntityId;
}
