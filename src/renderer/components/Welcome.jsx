import React from "react";
import { NavLink } from "react-router-dom";

class Welcome extends React.Component {
  render() {
    return (
      <section className="Main">
        <NavLink to="/app">TESTING</NavLink>
      </section>
    );
  }
}

export default Welcome;
