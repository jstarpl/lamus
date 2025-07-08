import type { GeneralIORouter, InOutRequest } from "@lamus/qbasic-vm";
import type { VMStoreClass } from "../../stores/VMStore";

export default function setup(router: GeneralIORouter, vmStore: VMStoreClass) {
  async function outMousePointer(req: InOutRequest) {
    let mousePointerEnabled = true;
    if (req.data === "on" || (req.data !== "off" && req.data !== "0"))
      mousePointerEnabled = true;
    if (req.data === "off" || req.data === "0") mousePointerEnabled = false;

    vmStore.setMousePointer(mousePointerEnabled);
  }

  router.insertRoute("/mouse/pointer", async (req) => {
    if (req.method === "in") return "";
    return outMousePointer(req);
  });

  return async () => {
    return Promise.resolve();
  };
}
