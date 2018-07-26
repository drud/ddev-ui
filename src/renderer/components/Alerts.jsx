import React from "react";

// define the Alert component
const Alert = props => (
  <div
    className={`alert alert-${props.style} alert-dismissible fade show`}
    role="alert"
  >
    {props.msg}
    <button
      type="button"
      className="close"
      data-dismiss="alert"
      aria-label="Close"
    >
      <span aria-hidden="true">&times;</span>
    </button>
  </div>
);

// define the Alerts component
class Alerts extends React.Component {
  renderAlert = (type, key) => {
    switch (type) {
      case "docker":
        return (
          <Alert
            key={key}
            id={key}
            msg={this.props.errors[type][key].msg}
            style="warning"
          />
        );
        break;

      default:
        return (
          <Alert
            key={key}
            id={key}
            msg={this.props.errors[type][key].msg}
            style="primary"
          />
        );
        break;
    }
  };
  renderAlertType(type) {
    let alertTypes = null;
    if (type == "docker") {
      // send only the first alert for now
      alertTypes = this.renderAlert(
        type,
        Object.keys(this.props.errors[type])[0]
      );
    } else {
      alertTypes = Object.keys(this.props.errors[type]).map(key =>
        this.renderAlert(type, key)
      );
    }
    return alertTypes;
  }
  render() {
    // find errors stored in state
    const alerts = Object.keys(this.props.errors).map(type =>
      this.renderAlertType(type)
    );
    return <div className="alerts mt-3">{alerts}</div>;
  }
}

export default Alerts;
