import { GeneralIORouter } from "@lamus/qbasic-vm";
import poweredUp from "./PoweredUp";
import meshtastic from "./Meshtastic";
import modalDialog from "./ModalDialog";
import oauth2 from "./OAuth2";
import { ShowModalDialogFunction } from "../../../helpers/useModalDialog";

export default function setup(
  generalIORouter: GeneralIORouter,
  showModalDialog: ShowModalDialogFunction
) {
  const allDestructors = [
    poweredUp(generalIORouter),
    meshtastic(generalIORouter),
    modalDialog(generalIORouter, showModalDialog),
    oauth2(generalIORouter),
  ];

  return () => {
    allDestructors.forEach((destroy) => destroy());
  };
}
