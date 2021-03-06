import React from 'react';
import { TabContent, TabPane, Nav, NavItem, NavLink, Row, Col } from 'reactstrap';
import classnames from 'classnames';
import _ from 'lodash';

import electron, { remote as _remote } from 'electron';
import { x } from 'tar';
import { readdir, mkdir } from 'fs';
import { homedir } from 'os';

import { start, hostname as _hostname } from 'ddev-shell';
import { getLocalDistros } from 'distro-updater';

import {
  showLoadingScreen,
  showErrorScreen,
  validateHostname,
  validateCMSType,
  validateInstallPath,
  validateDocroot,
  configureSite,
  checkIfExistingConfig,
} from 'helpers';

import InstallProfiles from './InstallProfiles';
import CleanContainer from './CleanContainer';
import ConnectContainer from './ConnectContainer';

const remote = _remote || electron;
const { dialog } = remote;

/**
 * wrapper that runs all validations for new projects from CMS
 * @param name {string} hostname to be validated
 * @param type {string} cms type to be validated
 * @param targetPath {string} target install path to have read/write permissions validated
 * @return {promise} resolves if ALL validations pass, rejects with message of failed validations of any do not pass
 */
export function validateNewProjectInputs(name, type, targetPath) {
  return Promise.all([
    validateHostname(name),
    validateCMSType(type),
    validateInstallPath(targetPath),
  ]);
}

/**
 * wrapper that runs all validations for new projects from existing files
 * @param name {string} hostname to be validated
 * @param path {string} target install path to have read/write permissions validated
 * @param docroot {string} - optional - docroot path
 * @return {promise} resolves if ALL validations pass, rejects with message of failed validations of any do not pass
 */
export function validateExistingFilesInputs(name, path, docroot) {
  return Promise.all([
    validateHostname(name),
    validateInstallPath(path),
    validateDocroot(path, docroot),
  ]);
}

/**
 * Gets the file location of the CMS image tarball pre-downloaded by the UI
 * @param cmsType {string} the name of the target CMS
 * @param cmsPath {string} the path that the CMS tarballs are saved
 * @return {promise} resolves with tarball path if found, rejects with system error if not found
 */
export function getCMSTarballPath(cmsType, cmsPath) {
  const promise = new Promise((resolve, reject) => {
    let targetCMS;
    switch (cmsType) {
      case 'wordpress':
        targetCMS = 'wordpress';
        break;
      case 'drupal6':
        targetCMS = 'drupal-6';
        break;
      case 'drupal7':
        targetCMS = 'drupal-7';
        break;
      case 'drupal8':
        targetCMS = 'drupal-8';
        break;
      default:
        Error('No CMS selected');
    }
    getLocalDistros(cmsPath).then(files => {
      files.forEach(fileName => {
        if (fileName.indexOf(targetCMS) !== -1) {
          resolve(`${cmsPath}/${fileName}`);
        }
      });
      reject(
        new Error(
          'CMS archive not found in `~/.ddev/CMS`. Restarting the UI will attempt to redownload these files.'
        )
      );
    });
  });
  return promise;
}

/**
 * unpacks tarball to target directory
 * @param tarballPath {string} the path to a tarball to extract
 * @param outputPath {string} the path to extract the target tarball to
 * @return {promise} resolves with the path to the files extracted from tarball, rejects with system error if not
 */
export function unpackCMSTarball(tarballPath, outputPath) {
  const promise = new Promise((resolve, reject) => {
    readdir(outputPath, (err, items) => {
      if (err && err.toString().includes('ENOENT')) {
        mkdir(outputPath, err => {
          if (err) {
            reject(err);
          }
        });
      } else if (items.length > 0) {
        reject(
          new Error(
            `The path ${outputPath} already exists and is not empty. Please select a new path or try a different project name`
          )
        );
      }
    });
    try {
      x(
        {
          file: tarballPath,
          C: outputPath,
          strip: 1,
        },
        '',
        () => {
          resolve(outputPath);
        }
      );
    } catch (err) {
      reject(
        new Error(
          'Cannot extract base CMS file in `~/.ddev/CMS`. Restarting the UI will attempt to redownload them.'
        )
      );
    }
  });
  return promise;
}

/**
 * wrapper that will unpack target CMS tarball to directory based on sitename and return docroot for ddev config use
 * @param siteName {string} site name of new site. used to build directory ( ex: {targetpath}/{sitename}/wordpress)
 * @param cmsType {string} target CMS to extract
 * @param targetFolder {string} target folder to extract to
 * @return {promise} resolves with path to new site docroot, rejects with error returned from any failed called function
 */
export function extractCMSImageToTargetPath(siteName, cmsType, cmsPath, targetFolder) {
  const promise = new Promise((resolve, reject) => {
    getCMSTarballPath(cmsType, cmsPath)
      .then(CMSTarballPath => {
        const targetPath = `${targetFolder}/${siteName}`;
        unpackCMSTarball(CMSTarballPath, targetPath)
          .then(unzippedPath => {
            resolve(unzippedPath);
          })
          .catch(err => {
            reject(err);
          });
      })
      .catch(err => {
        reject(err);
      });
  });
  return promise;
}

/**
 * public function - calls private functions to validate inputs, unpack files, and configure/start site
 * @param name {string} name of site to create
 * @param type {string} type of CMS to install (drupal6, drupal7, drupal8, wordpress)
 * @param targetPath {string} path to unpack CMS and install site
 */
export function addCMS(name, type, targetPath, args = {}, history = {}) {
  let cmsPath = '~/.ddev/CMS';
  let workingPath = cmsPath;
  cmsPath = cmsPath.replace('~', homedir());
  showLoadingScreen(true);
  validateNewProjectInputs(name, type, targetPath)
    .then(() => {
      if (type !== 'php') {
        showLoadingScreen(true, 'Unzipping files');
        return extractCMSImageToTargetPath(name, type, cmsPath, targetPath);
      }
      return Promise.resolve(`${targetPath}/${name}`);
    })
    .then(newWorkingPath => {
      showLoadingScreen(true, 'Configuring Project');
      workingPath = newWorkingPath;
      return configureSite(workingPath, args);
    })
    .then(() => {
      showLoadingScreen(true, 'Updating Hosts File');
      return _hostname(name);
    })
    .then(() => {
      showLoadingScreen(true, 'Starting Project');
      return start(
        workingPath,
        data => {
          const res = data.toString();
          if (res.includes('Successfully started')) {
            history.push(`/project/${name}`);
          } else if (res.includes('Process Exited')) {
            showLoadingScreen(false);
          }
        },
        err => {
          console.error(err);
          showErrorScreen(true, err.toString());
        }
      );
    })
    .catch(err => {
      showErrorScreen(true, err.toString());
    });
}

/**
 * public function - calls private functions to validate inputs, runs ddev config from existing project directory
 * @param name {string} name of site to create
 * @param targetPath {string} path to existing project files
 * @param docroot {string} - optional - application docroot relative to targetPath
 */
export function addCMSFromExisting(name, targetPath, docroot, args = {}, history = {}) {
  showLoadingScreen(true);
  validateExistingFilesInputs(name, targetPath, docroot)
    .then(() => checkIfExistingConfig(targetPath))
    .then(shouldConfig => {
      if (shouldConfig) {
        showLoadingScreen(true, 'Configuring Project');
        return configureSite(targetPath, args);
      }
      return Promise.resolve(true);
    })
    .then(() => {
      showLoadingScreen(true, 'Updating Hosts File');
      return _hostname(name);
    })
    .then(() => {
      showLoadingScreen(true, 'Starting Project');
      return start(
        targetPath,
        data => {
          const res = data.toString();
          if (res.includes('Successfully started')) {
            history.push(`/project/${name}`);
          } else if (res.includes('Process Exited')) {
            showLoadingScreen(false);
          }
        },
        err => {
          console.error(err);
          showErrorScreen(true, err.toString());
        }
      );
    })
    .catch(err => {
      showErrorScreen(true, err.toString());
    });
}

class CreateProject extends React.PureComponent {
  state = {
    name: '',
    installtype: 'new',
    path: '',
    docroot: '',
    phpVersion: '7.1',
    webServer: 'nginx-fpm',
    dbType: 'MariaDB',
    enableXDebug: false,
    httpPort: '80',
    httpsPort: '443',
    cmsType: 'php',
    cmsVersion: 'latest',
    activeTab: 'installProfiles',
  };

  // toggle the ui tab
  toggleTab = tab => {
    if (this.state.activeTab !== tab) {
      this.setState({
        activeTab: tab,
      });
    }
  };

  // generic input handler
  handleInputChange = e => {
    const { target } = e;
    const { type, checked, name } = target;
    let { value } = target;

    value = type === 'checkbox' ? checked : value;

    this.setState({
      [name]: value,
    });
  };

  handleInstallTypeUpdate = type => {
    this.setState(prevState => {
      if (prevState.installtype !== type) {
        return { installtype: type };
      }
      return { prevState };
    });
  };

  handleInstallProfileUpdate = (type = this.state.cmsType, version = this.state.cmsVersion) => {
    this.setState(prevState => {
      if (prevState.cmsType !== type) {
        return { cmsType: type };
      }
      if (prevState.cmsVersion !== version) {
        return { cmsVersion: version };
      }
      // TODO: some general input resetting between tabs
      return { prevState };
    });
  };

  handlePathSetting = () => {
    const projectRoot = this.state.path;
    const path = dialog.showOpenDialog({
      defaultPath: projectRoot,
      properties: ['openDirectory'],
    });
    if (path) {
      this.setState({ path: path[0], docroot: path[0] });
      if (this.state.installtype !== 'new') {
        const name = path[0].match(/([^/]*)\/*$/)[1];
        this.setState({ name });
      }
    }
  };

  handleDocrootSetting = () => {
    const projectRoot = this.state.docroot;
    const docroot = dialog.showOpenDialog({
      defaultPath: projectRoot,
      properties: ['openDirectory'],
    });
    if (docroot) {
      if (docroot[0].includes(projectRoot)) {
        this.setState({ docroot: docroot[0] });
      } else {
        alert('Docroot must be in the selected project folder.');
      }
    }
  };

  handleProjectCreation = e => {
    e.preventDefault();
    const args = {};
    const { history } = this.props;
    let { docroot } = this.state;
    const {
      path,
      name,
      installtype,
      cmsType,
      cmsVersion,
      phpVersion,
      webServer,
      httpPort,
      httpsPort,
      enableXDebug,
    } = this.state;

    // --projectname
    args['--projectname'] = name;

    // --php-version
    args['--php-version'] = phpVersion;

    // --webserver
    args['--webserver-type'] = webServer;

    // --http-port
    args['--http-port'] = httpPort;
    // --https-port
    args['--https-port'] = httpsPort;

    // --xdebug-enabled
    if (enableXDebug) args['--xdebug-enabled'] = null;

    if (installtype === 'new') {
      // Temp filter for drupal
      // TODO: make the version allow for any version of a CMS
      let cms = '';

      if (cmsType === 'drupal') {
        const version = cmsVersion === 'latest' ? '8' : cmsVersion;
        cms = cmsType + version;
      } else {
        cms = cmsType;
      }

      // --projecttype
      args['--projecttype'] = cms;

      //
      addCMS(name, cms, path, args, history);
    } else {
      if (!_.isEmpty(docroot)) {
        docroot = docroot.replace(path, '');
        if (docroot[0] === '/') {
          docroot = docroot.substr(1);
        }
      }

      // --docroot
      args['--docroot'] = docroot;

      //
      addCMSFromExisting(name, path, docroot, args, history);
    }
  };

  render() {
    return (
      <div className="create-project w-100">
        <h1 className="mt-1 mb-4">Start new project</h1>
        <Nav tabs>
          <NavItem>
            <NavLink
              className={classnames({ active: this.state.activeTab === 'installProfiles' })}
              onClick={() => {
                this.handleInstallTypeUpdate('new');
                this.toggleTab('installProfiles');
              }}
            >
              Install Profiles
            </NavLink>
          </NavItem>
          <NavItem>
            <NavLink
              className={classnames({ active: this.state.activeTab === 'clean' })}
              onClick={() => {
                this.handleInstallTypeUpdate('new');
                this.handleInstallProfileUpdate('php', 'latest');
                this.toggleTab('clean');
              }}
            >
              Clean Container
            </NavLink>
          </NavItem>
          <NavItem>
            <NavLink
              className={classnames({ active: this.state.activeTab === 'existing' })}
              onClick={() => {
                this.handleInstallTypeUpdate('existing');
                this.handleInstallProfileUpdate('php', 'latest');
                this.toggleTab('existing');
              }}
            >
              Connect Existing
            </NavLink>
          </NavItem>
        </Nav>
        <TabContent activeTab={this.state.activeTab}>
          <TabPane tabId="installProfiles">
            <Row>
              <Col>
                <InstallProfiles
                  {...this.state}
                  projectName={this.state.name}
                  handleInputChange={this.handleInputChange}
                  handlePathSetting={this.handlePathSetting}
                  handleDocrootSetting={this.handleDocrootSetting}
                  handleInstallTypeUpdate={this.handleInstallTypeUpdate}
                  handleProjectCreation={this.handleProjectCreation}
                  handleInstallProfileUpdate={this.handleInstallProfileUpdate}
                />
              </Col>
            </Row>
          </TabPane>
          <TabPane tabId="clean">
            <Row>
              <Col>
                <CleanContainer
                  {...this.state}
                  projectName={this.state.name}
                  handleInputChange={this.handleInputChange}
                  handlePathSetting={this.handlePathSetting}
                  handleDocrootSetting={this.handleDocrootSetting}
                  handleInstallTypeUpdate={this.handleInstallTypeUpdate}
                  handleProjectCreation={this.handleProjectCreation}
                />
              </Col>
            </Row>
          </TabPane>
          <TabPane tabId="existing">
            <Row>
              <Col>
                <ConnectContainer
                  {...this.state}
                  projectName={this.state.name}
                  handleInputChange={this.handleInputChange}
                  handlePathSetting={this.handlePathSetting}
                  handleDocrootSetting={this.handleDocrootSetting}
                  handleInstallTypeUpdate={this.handleInstallTypeUpdate}
                  handleProjectCreation={this.handleProjectCreation}
                />
              </Col>
            </Row>
          </TabPane>
        </TabContent>
      </div>
    );
  }
}

export default CreateProject;
