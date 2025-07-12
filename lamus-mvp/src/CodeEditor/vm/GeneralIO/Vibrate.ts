import type { GeneralIORouter, InOutRequest } from "@lamus/qbasic-vm";
import type { VMStoreClass } from "../../stores/VMStore";

export default function setup(router: GeneralIORouter, _: VMStoreClass) {
  async function outVibrate(req: InOutRequest) {
    if (!('vibrate' in navigator)) return
    navigator.vibrate(req.data?.split(',').map(parseInt) ?? [100])
  }

  router.insertRoute("/vibrate", async (req) => {
    if (req.method === "in") return "";
    return outVibrate(req);
  });

  return async () => {
    return Promise.resolve();
  };
}
