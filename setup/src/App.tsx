import React from 'react';
import logo from './logo.svg';
import { Container, Nav, Navbar } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';

function App() {
  return (
    <div className="App">
      <Container fluid>
        <Navbar>
          <Navbar.Brand><img src={logo} alt="Lamus Logo" width={30} height={30} className="d-inline-block align-top" /> Lamus</Navbar.Brand>
          {/* <Navbar.Toggle aria-controls="basic-navbar-nav"></Navbar.Toggle>
          <Navbar.Collapse>
            <Nav className="me-auto">
              <Nav.Link>Setup</Nav.Link>
            </Nav>
          </Navbar.Collapse> */}
        </Navbar>
      </Container>
    </div>
  );
}

export default App;
