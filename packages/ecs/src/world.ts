import type { ComponentKind, ComponentMap } from "./components.ts";
import type { EntityId } from "./entity.ts";

type Table<K extends ComponentKind> = Map<EntityId, ComponentMap[K]>;

export interface World {
  readonly tables: {
    [K in ComponentKind]: Table<K>;
  };
}

export function createWorld(): World {
  return {
    tables: {
      EventMeta: new Map(),
      Participant: new Map(),
      Membership: new Map(),
      Group: new Map(),
      Form: new Map(),
      Response: new Map(),
      Presence: new Map(),
    },
  };
}

export function set<K extends ComponentKind>(
  world: World,
  kind: K,
  id: EntityId,
  value: ComponentMap[K],
): void {
  world.tables[kind].set(id, value);
}

export function get<K extends ComponentKind>(
  world: World,
  kind: K,
  id: EntityId,
): ComponentMap[K] | undefined {
  return world.tables[kind].get(id);
}

export function remove<K extends ComponentKind>(
  world: World,
  kind: K,
  id: EntityId,
): void {
  world.tables[kind].delete(id);
}

export function all<K extends ComponentKind>(
  world: World,
  kind: K,
): ReadonlyArray<readonly [EntityId, ComponentMap[K]]> {
  return Array.from(world.tables[kind].entries());
}

export function filter<K extends ComponentKind>(
  world: World,
  kind: K,
  predicate: (v: ComponentMap[K]) => boolean,
): ComponentMap[K][] {
  const out: ComponentMap[K][] = [];
  for (const v of world.tables[kind].values()) {
    if (predicate(v)) out.push(v);
  }
  return out;
}
