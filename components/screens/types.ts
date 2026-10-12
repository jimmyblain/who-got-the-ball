import type { Dispatch } from "react";
import type { SessionAction, SessionState } from "@/lib/session";

export type ScreenProps = {
  state: SessionState;
  dispatch: Dispatch<SessionAction>;
};
