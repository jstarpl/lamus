import type { GeneralIORouter, InOutRequest } from "@lamus/qbasic-vm";
import type { VMStoreClass } from "../../stores/VMStore";

export default function setup(router: GeneralIORouter, vmStore: VMStoreClass) {
  async function outPowerSaving(req: InOutRequest) {
    let powerSavingEnabled = true;
    if (req.data === "on" || (req.data !== "off" && req.data !== "0"))
      powerSavingEnabled = true;
    if (req.data === "off" || req.data === "0") powerSavingEnabled = false;

    vmStore.setPowerSaving(powerSavingEnabled);
  }

  router.insertRoute("/powerSaving", async (req) => {
    if (req.method === "in") return "";
    return outPowerSaving(req);
  });

  return async () => {
    return Promise.resolve();
  };
}
