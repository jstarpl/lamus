import { observer } from "mobx-react-lite";
import { AppStore } from "../../stores/AppStore";
import { Spinner } from "../Spinner";
import "./GlobalSpinner.css";

export const GlobalSpinner = observer(function GlobalSpinner() {
  return AppStore.isBusy ? (
    <div className="system-spinner">
      <Spinner />
    </div>
  ) : null;
});
GlobalSpinner.displayName = "GlobalSpinner";
