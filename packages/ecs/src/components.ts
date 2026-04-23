import type {
  EventMeta,
  Form,
  Group,
  Membership,
  Participant,
  Presence,
  Response,
} from "@app/shared-types";

export type ComponentKind =
  | "EventMeta"
  | "Participant"
  | "Membership"
  | "Group"
  | "Form"
  | "Response"
  | "Presence";

export interface ComponentMap {
  EventMeta: EventMeta;
  Participant: Participant;
  Membership: Membership;
  Group: Group;
  Form: Form;
  Response: Response;
  Presence: Presence;
}
