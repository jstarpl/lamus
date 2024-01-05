import { GeneralIORouter } from "@lamus/qbasic-vm";
import { ShowModalDialogFunction } from "../../../helpers/useModalDialog";
import type { Lambda } from "mobx";
import type { VMStoreClass } from "../../stores/VMStore";

export default function setup(
  generalIORouter: GeneralIORouter,
  showModalDialog: ShowModalDialogFunction,
  vmStore: VMStoreClass
) {
  let isDestroyed = false;
  const allDestructors: Lambda[] = [];

  function handleImportError(e: unknown) {
    console.error("🌩️ Could not import GeneralIO module: ", e);
  }

  function handleImport(handler: () => Lambda) {
    if (isDestroyed) return;
    allDestructors.push(handler());
  }

  import("./PoweredUp")
    .then((poweredUp) => handleImport(() => poweredUp.default(generalIORouter)))
    .catch(handleImportError);
  import("./Meshtastic")
    .then((meshtastic) =>
      handleImport(() => meshtastic.default(generalIORouter))
    )
    .catch(handleImportError);
  import("./ModalDialog")
    .then((modalDialog) =>
      handleImport(() => modalDialog.default(generalIORouter, showModalDialog))
    )
    .catch(handleImportError);
  import("./OAuth2")
    .then((oauth2) => handleImport(() => oauth2.default(generalIORouter)))
    .catch(handleImportError);
  import("./PowerSaving")
    .then((powerSaving) =>
      handleImport(() => powerSaving.default(generalIORouter, vmStore))
    )
    .catch(handleImportError);

  return () => {
    allDestructors.forEach((destroy) => destroy());
    isDestroyed = true;
  };
}
