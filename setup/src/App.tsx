import React from "react";
import logo from "./logo-name.svg";
import { Container, Nav, Navbar } from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";
import { Login } from "./components/Login";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

function App() {
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
          </Navbar>
        </Container>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<Navigate to={"/login"} />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
