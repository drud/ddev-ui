import React, { Component } from 'react';
import FormProjectInfo from './FormProjectInfo';

export default class ConnectContainer extends Component {
  render() {
    return <FormProjectInfo className="ConnectContainer" {...this.props} />;
  }
}
