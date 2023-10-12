import { GeneralIORouter } from "@lamus/qbasic-vm";
import poweredUp from "./PoweredUp";
import meshtastic from "./Meshtastic";
import modalDialog from "./ModalDialog";
import { ShowModalDialogFunction } from "../../../helpers/useModalDialog";

export default function setup(
  generalIORouter: GeneralIORouter,
  showModalDialog: ShowModalDialogFunction
) {
  const allDestructors = [
    poweredUp(generalIORouter),
    meshtastic(generalIORouter),
    modalDialog(generalIORouter, showModalDialog),
  ];

  return () => {
    allDestructors.forEach((destroy) => destroy());
  };
}
