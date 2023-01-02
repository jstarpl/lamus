import { GeneralIORouter } from "@lamus/qbasic-vm";
import poweredUp from "./PoweredUp";
import meshtastic from "./Meshtastic";

export default function setup(generalIORouter: GeneralIORouter) {
  const allDestructors = [
    poweredUp(generalIORouter),
    meshtastic(generalIORouter),
  ];

  return () => {
    allDestructors.forEach((destroy) => destroy());
  };
}
