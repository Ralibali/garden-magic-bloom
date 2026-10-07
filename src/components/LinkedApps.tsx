import { LinkedAppsCard } from "../../packages/app-foundation/src/LinkedAppsCard";
import {
  APP_ID,
  linkedAppAction,
  linkedAppsEnabled,
  openLinkedDestination,
} from "@/lib/linkedApps";
import { isNativeApp as isNative } from "@/lib/native";
export default function LinkedApps() {
  return linkedAppsEnabled && !isNative()
    ? (
      <LinkedAppsCard
        app={APP_ID}
        native={isNative()}
        action={linkedAppAction}
        open={openLinkedDestination}
      />
    )
    : null;
}
