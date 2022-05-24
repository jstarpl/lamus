import React from "react";
import { Button, Container } from "react-bootstrap";
import { AppStore } from "../stores/AppStore";

export function Dashboard() {
  function onConnectDropbox() {
    AppStore.connectToDropbox().catch(console.error);
  }

  return (
    <Container fluid="sm">
      <h1>Your Computer</h1>
      <Button onClick={onConnectDropbox}>Connect to Dropbox</Button>
    </Container>
  );
}
