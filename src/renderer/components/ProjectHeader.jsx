import React from 'react';
import electron from 'electron';

import ProjectTypeIcon from './ProjectTypeIcon';
import ProjectStatusIcon from './ProjectStatusIcon';

import ddevShell from '../modules/ddev-shell';

class ProjectHeader extends React.PureComponent {
  processStart = e => {
    e.preventDefault();
    console.log('starting');
    ddevShell.start(
      this.props.approot,
      data => {
        console.log(data);
      },
      error => {
        console.log(error);
      }
    );
  };

  processRestart = e => {
    e.preventDefault();
    console.log('restarting');
    ddevShell.restart(
      this.props.approot,
      data => {
        console.log(data);
      },
      error => {
        console.log(error);
      }
    );
  };

  processStop = e => {
    e.preventDefault();
    console.log('stopping');
    ddevShell.stop(
      this.props.approot,
      data => {
        console.log(data);
      },
      error => {
        console.log(error);
      }
    );
  };

  processRemove = e => {
    e.preventDefault();
    console.log('stopping');
    ddevShell.remove(
      this.props.name,
      false, // TODO: Need to remove
      data => {
        console.log(data);
      },
      error => {
        console.log(error);
      }
    );
  };

  render() {
    return (
      <header className="row align-items-center">
        <div className="project-info-wrapper col-sm-8">
          <div className="row align-items-center section-box">
            <div className="col-3 text-center p-0">
              <ProjectTypeIcon {...this.props} />
            </div>
            <div className="project-info col-9 p-0">
              <h1 className="mb-1">
                <a
                  href="#!"
                  className="open-site"
                  onClick={e => {
                    e.preventDefault();
                    electron.shell.openExternal(this.props.httpurl);
                  }}
                >
                  {this.props.name}
                  <span className="ml-2">
                    <ProjectStatusIcon {...this.props} />
                  </span>
                </a>
              </h1>
              <p className="project-path text-secondary mb-1">
                <a
                  href="#!"
                  className="text-secondary"
                  onClick={e => {
                    e.preventDefault();
                    electron.shell.showItemInFolder(this.props.approot);
                  }}
                >
                  <i className="fa fa-folder-open-o" />
                  <span className="mx-2">{this.props.shortroot}</span>
                  <i className="fa fa-eye" />
                </a>
              </p>
              <ul className="project-actions list-unstyled list-inline mb-0">
                {this.props.status === 'stopped' ? (
                  <li className="restart list-inline-item">
                    <a href="#!" className="text-success" onClick={this.processStart}>
                      <i className="fa fa-retweet" aria-hidden="true" /> Start
                    </a>
                  </li>
                ) : (
                  <li className="restart list-inline-item">
                    <a href="#!" className="text-success" onClick={this.processRestart}>
                      <i className="fa fa-retweet" aria-hidden="true" /> Restart
                    </a>
                  </li>
                )}
                {this.props.status !== 'stopped' ? (
                  <li className="stop list-inline-item">
                    <a href="#!" className="text-danger" onClick={this.processStop}>
                      <i className="fa fa-stop-circle-o" aria-hidden="true" /> Stop
                    </a>
                  </li>
                ) : null}
                <li className="remove list-inline-item">
                  <a href="#!" className="text-danger" onClick={this.processRemove}>
                    <i className="fa fa-trash-o" aria-hidden="true" /> Remove
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
        <div className="project-buttons col-sm-4">
          <div className="btn-group" role="group" aria-label="View Site">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={e => {
                e.preventDefault();
                electron.shell.openExternal(this.props.httpurl);
              }}
            >
              View Site
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={e => {
                e.preventDefault();
                electron.shell.openExternal(this.props.httpurl);
              }}
            >
              Site Admin
            </button>
          </div>
        </div>
      </header>
    );
  }
}

export default ProjectHeader;
