import { observer } from "mobx-react-lite";
import { QRCodeSVG } from "qrcode.react";
import { useContext, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Dialog } from "../components/Dialog";
import { KeyboardHandler } from "../helpers/useKeyboardHandler";
import { AppStore } from "../stores/AppStore";
import * as classes from "./AdminCode.module.css";

const KONAMI_CODE =
  "ArrowUp ArrowUp ArrowDown ArrowDown ArrowLeft ArrowRight ArrowLeft ArrowRight KeyB KeyA";

const ADMIN_URL_BASE = "https://setup.lamus.jsbg.pl/d";

function generateAdminUrl(deviceId: string) {
  return `${ADMIN_URL_BASE}#${deviceId}`;
}

export const AdminCode = observer(function AdminCode() {
  const showAdminCode = AppStore.showAdminCode;
  const deviceId = AppStore.deviceId;
  const keyboardHandler = useContext(KeyboardHandler);
  const location = useLocation();
  const navigate = useNavigate();

  const adminUrl = useMemo(() => generateAdminUrl(deviceId), [deviceId]);

  const isMobile = useMemo(
    () =>
      !!navigator.userAgent.match(
        /iPad|iPhone|Android|BlackBerry|Windows Phone|webOS/i
      ),
    []
  );

  function onClose(e: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
    e.preventDefault();
    // AppStore.setShowAdminCode(false);
    navigate(location.pathname + location.search);
  }

  useEffect(() => {
    if (!keyboardHandler) return;

    function onShow() {
      // AppStore.setShowAdminCode(true);
      navigate("#serviceMode");
    }

    keyboardHandler.bind(KONAMI_CODE, onShow, {
      preventDefaultPartials: false,
      global: true,
      exclusive: true,
    });

    return () => {
      keyboardHandler.unbind(KONAMI_CODE, onShow);
    };
  }, [keyboardHandler, navigate]);

  useEffect(() => {
    if (location.hash === "#serviceMode") {
      AppStore.setShowAdminCode(true);
    } else {
      AppStore.setShowAdminCode(false);
    }
  }, [location]);

  return showAdminCode ? (
    <Dialog>
      <p>
        {isMobile ? (
          <a href={adminUrl} target="_blank" rel="noreferrer">
            <QRCodeSVG value={adminUrl} className={classes["admin-code-qr"]} />
          </a>
        ) : (
          <QRCodeSVG value={adminUrl} className={classes["admin-code-qr"]} />
        )}
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
        <button
          tabIndex={1}
          data-accept
          data-focus
          type="submit"
          onClick={onClose}
        >
          OK
        </button>
      </div>
    </Dialog>
  ) : null;
});
AdminCode.displayName = "AdminCode";
