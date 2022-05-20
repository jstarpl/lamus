import { AppStore } from "../stores/AppStore";
import { QRCodeSVG } from "qrcode.react";
import { observer } from "mobx-react-lite";
import { Dialog } from "../components/Dialog";
import "./AdminCode.css";

const ADMIN_URL_BASE = "https://setup.lamus.jsbg.pl/d";

function generateAdminUrl(deviceId: string) {
  return `${ADMIN_URL_BASE}/${deviceId}`;
}

export const AdminCode = observer(function AdminCode() {
  const showAdminCode = AppStore.showAdminCode;
  const deviceId = AppStore.deviceId;

  function onClose(e: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
    e.preventDefault();
    AppStore.setShowAdminCode(false);
  }

  return showAdminCode ? (
    <Dialog>
      <p>
        <QRCodeSVG
          value={generateAdminUrl(deviceId)}
          className="admin-code-qr"
        />
      </p>
      <p>
        <input tabIndex={-1} value={deviceId} readOnly />
      </p>
      <div className="buttons">
        <button tabIndex={1} data-accept type="submit" onClick={onClose}>
          OK
        </button>
      </div>
    </Dialog>
  ) : null;
});
