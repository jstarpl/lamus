import type { GeneralIORouter, InOutRequest } from "@lamus/qbasic-vm";
import type { VMStoreClass } from "../../stores/VMStore";

export default function setup(router: GeneralIORouter, vmStore: VMStoreClass) {
  async function outScreenWakeLock(req: InOutRequest) {
    let screenWakeLockEnabled = false;
    if (req.data === "on" || (req.data !== "off" && req.data !== "0"))
      screenWakeLockEnabled = true;
    if (req.data === "off" || req.data === "0") screenWakeLockEnabled = false;

    vmStore.setPowerSaving(screenWakeLockEnabled);
  }

  router.insertRoute("/screenWakeLock", async (req) => {
    if (req.method === "in") return "";
    return outScreenWakeLock(req);
  });

  return async () => {
    return Promise.resolve();
  };
}
