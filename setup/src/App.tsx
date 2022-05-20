import React from "react";
import logo from "./logo-name.svg";
import { Container, Nav, Navbar } from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";
import { Login } from "./components/Login";

function App() {
  return (
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
        </Navbar>
      </Container>
      <Login />
    </div>
  );
}

export default App;
