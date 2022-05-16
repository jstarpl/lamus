import { AppStore } from "../stores/AppStore";
import { QRCodeSVG } from "qrcode.react";
import { observer } from "mobx-react-lite";
import { useEffect, useRef } from "react";

const ADMIN_URL_BASE = "https://setup.lamus.jsbg.pl/device";

declare global {
  interface HTMLDialogElement extends HTMLElement {
    showModal(): void;
    close(): void;
  }
}

function generateAdminUrl(deviceId: string) {
  return `${ADMIN_URL_BASE}/${deviceId}`;
}

export const AdminCode = observer(function AdminCode() {
  const dialogRef = useRef<HTMLDialogElement>(null); // marked as unavailable "in most browsers", MDN disagrees

  const showAdminCode = AppStore.showAdminCode;
  const deviceId = AppStore.deviceId;

  useEffect(() => {
    if (!dialogRef.current) return;
    if (showAdminCode) {
      dialogRef.current.showModal();
    }
  }, [showAdminCode, dialogRef]);

  function onClose(e: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
    e.preventDefault();
    if (!dialogRef.current) return;
    dialogRef.current.close();
    AppStore.setShowAdminCode(false);
  }

  return (
    <dialog ref={dialogRef}>
      <form>
        <p>
          <QRCodeSVG value={generateAdminUrl(deviceId)} />
        </p>
        <p>
          <input tabIndex={-1} value={deviceId} readOnly />
        </p>
        <div className="buttons">
          <button tabIndex={1} type="submit" onClick={onClose}>
            OK
          </button>
        </div>
      </form>
    </dialog>
  );
});
