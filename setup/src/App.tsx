import React from "react";
import logo from "./logo-name.svg";
import { Container, Nav, Navbar } from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";
import { Login } from "./components/Login";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppStore } from "./stores/AppStore";
import { Dashboard } from "./components/Dashboard";
import { observer } from "mobx-react-lite";
import { Notifier } from "./components/Notifier";

const App = observer(function App() {
  let publicRoutes: JSX.Element | null = (
    <>
      <Route path="/login" element={<Login />} />
      <Route path="*" element={<Navigate to={"/login"} />} />
    </>
  );
  let restrictedRoutes = null;
  if (AppStore.loggedIn) {
    publicRoutes = null;
    restrictedRoutes = (
      <>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="*" element={<Navigate to={"/dashboard"} />} />
      </>
    );
  }

  return (
    <BrowserRouter>
      <div className="App">
        <Container fluid>
          <Navbar>
            <Navbar.Brand>
              <img
                src={logo}
                alt="Lamus"
                width={127}
                height={30}
                className="d-inline-block align-top"
              />
            </Navbar.Brand>
            <Navbar.Toggle type="button">
              <span className="navbar-toggler-icon"></span>
            </Navbar.Toggle>
            <Navbar.Collapse>
              <Nav className="navbar-nav me-auto mb-2 mb-lg-0"></Nav>
              <Nav className="d-flex">
                {AppStore.loggedIn && (
                  <Nav.Link onClick={() => AppStore.logout()}>Logout</Nav.Link>
                )}
              </Nav>
            </Navbar.Collapse>
          </Navbar>
        </Container>
        <Routes>
          {publicRoutes}
          {restrictedRoutes}
        </Routes>
        <Notifier />
      </div>
    </BrowserRouter>
  );
});

export default App;
