import { GeneralIORouter } from "@lamus/qbasic-vm";
import poweredUp from "./PoweredUp";

export default function setup(generalIORouter: GeneralIORouter) {
  const allDestructors = [poweredUp(generalIORouter)];

  return () => {
    allDestructors.forEach((destroy) => destroy());
  };
}
