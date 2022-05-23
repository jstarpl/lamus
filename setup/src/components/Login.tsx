import React, { useCallback, useEffect, useRef, useState } from "react";
import { observer } from "mobx-react-lite";
import { LoginStore } from "../stores/LoginStore";
import QrScanner from "qr-scanner";
import { Button, Container, Form } from "react-bootstrap";
import { AppStore } from "../stores/AppStore";
import { useNavigate } from "react-router-dom";

function onLogin(deviceId: string) {
  return AppStore.login(deviceId);
}

export const Login = observer(function Login(props) {
  const navigate = useNavigate();
  const [hasCamera, setHasCamera] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoOverlayRef = useRef<HTMLDivElement>(null);
  const loginMode = LoginStore.loginMode;

  function onLoginSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (LoginStore.form.meta.isValid) {
      onLogin(LoginStore.form.fields.token.value)
        .then(() => {
          LoginStore.onFormReset();
          navigate("/dashboard");
        })
        .catch(console.error);
    }
  }

  useEffect(() => {
    QrScanner.hasCamera().then((cameraAvailable) =>
      setHasCamera(cameraAvailable)
    );
  }, []);

  useEffect(() => {
    if (!hasCamera) return;
    LoginStore.setLoginMode("qrcode");
  }, [hasCamera]);

  const onQrCodeResult = useCallback((result: QrScanner.ScanResult) => {
    if (result.data.startsWith("https://setup.lamus.jsbg.pl/d/")) {
      console.log(result.data);
      const deviceId = result.data.replace(
        /^https:\/\/setup.lamus.jsbg.pl\/d\//,
        ""
      );
      onLogin(deviceId).catch(console.error);
    }
  }, []);

  useEffect(() => {
    if (!showVideo || !videoRef.current || !videoOverlayRef.current) return;

    const scanner = new QrScanner(videoRef.current, onQrCodeResult, {
      returnDetailedScanResult: true,
      overlay: videoOverlayRef.current,
      highlightCodeOutline: true,
      highlightScanRegion: true,
    });
    scanner.start();
  }, [showVideo, onQrCodeResult]);

  function onOpenCamera() {
    setShowVideo(true);
  }

  return (
    <Container fluid="sm" className="my-5" style={{ maxWidth: "30rem" }}>
      <Form onSubmit={onLoginSubmit}>
        {hasCamera && (
          <>
            {showVideo && (
              <div className="video-preview">
                <video ref={videoRef} className="mw-100"></video>
                <div ref={videoOverlayRef}></div>
              </div>
            )}
            <Button
              variant={loginMode === "qrcode" ? "primary" : "secondary"}
              className="w-100 mb-5"
              onClick={onOpenCamera}
            >
              Login using QR Code
            </Button>
          </>
        )}
        <Form.Group className="mb-3" controlId="formBasicEmail">
          <Form.Label>Enter your device code</Form.Label>
          <Form.Control
            type="password"
            name="token"
            placeholder="XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXX"
            onChange={LoginStore.onFieldChange}
          />
          <Form.Text className="text-muted">
            Never share this code with anyone, treat it as your password.
          </Form.Text>
        </Form.Group>
        <Button
          variant={loginMode === "text" ? "primary" : "secondary"}
          className="w-100"
          type="submit"
        >
          Login
        </Button>
      </Form>
    </Container>
  );
});
