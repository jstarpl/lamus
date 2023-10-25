import React, { useEffect, useMemo } from "react";
import { OAUTH2_CODE_BCHANNEL_NAME } from ".";

export default function OAuth2Code(): JSX.Element | null {
  const codeChannel = useMemo(
    () => new BroadcastChannel(OAUTH2_CODE_BCHANNEL_NAME),
    []
  );

  useEffect(() => {
    const currentUrl = new URL(window.location.href);
    const receivedCode = currentUrl.searchParams.get("code");
    codeChannel.postMessage(receivedCode);

    console.log("👀 Sent OAuth2 Code back to main window");

    window.close();
  }, [codeChannel]);

  return null;
}
