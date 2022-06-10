import { AppStore } from "../stores/AppStore";
import { QRCodeSVG } from "qrcode.react";
import { observer } from "mobx-react-lite";
import { Dialog } from "../components/Dialog";
import "./AdminCode.css";
import { useContext, useEffect } from "react";
import { KeyboardHandler } from "../helpers/useKeyboardHandler";

const KONAMI_CODE =
  "ArrowUp ArrowUp ArrowDown ArrowDown ArrowLeft ArrowRight ArrowLeft ArrowRight KeyB KeyA";

const ADMIN_URL_BASE = "https://setup.lamus.jsbg.pl/d";

function generateAdminUrl(deviceId: string) {
  return `${ADMIN_URL_BASE}/${deviceId}`;
}

export const AdminCode = observer(function AdminCode() {
  const showAdminCode = AppStore.showAdminCode;
  const deviceId = AppStore.deviceId;
  const keyboardHandler = useContext(KeyboardHandler);

  function onClose(e: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
    e.preventDefault();
    AppStore.setShowAdminCode(false);
  }

  function onShow() {
    AppStore.setShowAdminCode(true);
  }

  useEffect(() => {
    if (!keyboardHandler) return;

    keyboardHandler.bind(KONAMI_CODE, onShow, {
      preventDefaultPartials: false,
      global: true,
      exclusive: true,
    });

    return () => {
      keyboardHandler.unbind(KONAMI_CODE, onShow);
    };
  }, [keyboardHandler]);

  return showAdminCode ? (
    <Dialog>
      <p>
        <QRCodeSVG
          value={generateAdminUrl(deviceId)}
          className="admin-code-qr"
        />
      </p>
      <p>
        <input
          className="form-control"
          tabIndex={-1}
          value={deviceId}
          readOnly
        />
      </p>
      <div className="buttons">
        <button tabIndex={1} data-accept type="submit" onClick={onClose}>
          OK
        </button>
      </div>
    </Dialog>
  ) : null;
});
AdminCode.displayName = "AdminCode";
