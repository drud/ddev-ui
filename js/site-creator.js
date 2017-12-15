var distroUpdater = require('./distro-updater');
var tarball = require('tarball-extract');
var ddevShell = require('./ddev-shell');

/**
 * Basic validation of a hostname based on RFC 2396 Section 3.2.2
 * @param hostname {string} a hostname to validate
 * @return {bool} if hostname has passed validation
 */
function validateHostname(hostname){
    var promise = new Promise(function(resolve, reject){
        var hostnameRegex = /^([a-zA-Z0-9]+(-[a-zA-Z0-9]+)*)+(\.([a-zA-Z0-9]+(-[a-zA-Z0-9‌​]+)*))*$/;
        if(hostnameRegex.test(hostname.toLowerCase())){
            resolve(true);
        } else {
            var error = hostname ? 'Hostname is Invalid.' : 'Hostname Cannot Be Blank.';
            reject(error);
        }
    });
    return promise;
}

/**
 * Validates a supported cmsType was passed in by the UI selector
 * @param cmsType {string} the cmsType provided by the UI selector
 * @return {promise} resolves with validity boolean if passes check, rejects with error message if fails.
 */
function validateCMSType(cmsType){
    var promise = new Promise(function(resolve, reject){
        var cmsString = cmsType.toLowerCase();
        if(cmsString === 'wordpress' || cmsString === 'drupal7' || cmsString === 'drupal8'){
            resolve(true);
        } else {
            var error = cmsType ? 'CMS Type is Invalid.' : 'CMS Type Cannot Be Blank.';
            reject(error);
        }
    });
    return promise;
}

/**
 * Validates that the chosen install path is both valid and can be written to by the UI process
 * @param path {string} path to test for read/write access
 * @return {promise} resolves if path is read/writable, rejects with system error if not
 */
function validateInstallPath(path){
    return distroUpdater.canReadAndWrite(path);
}

/**
 * Gets the file location of the CMS image tarball pre-downloaded by the UI
 * @param cmsType {string} the name of the target CMS
 * @return {promise} resolves with tarball path if found, rejects with system error if not found
 */
function getCMSPath(cmsType){
    var targetCMS;
    switch(cmsType) {
        case 'wordpress':
            targetCMS = ['wordpress',''];
            break;
        case 'drupal7':
            targetCMS = ['drupal',7];
            break;
        case 'drupal8':
            targetCMS = ['drupal',8];
            break;
        default:
            throw 'No CMS selected';
    }
    return distroUpdater.getCMSTarballPath(targetCMS[0],targetCMS[1]);
}

/**
 * unpacks tarball to target directory
 * @param tarballPath {string} the path to a tarball to extract
 * @param outputPath {string} the path to extract the target tarball to
 * @return {promise} resolves with the path to the files extracted from tarball, rejects with system error if not
 */
function unpackCMSTarball(tarballPath, outputPath) {
    var promise = new Promise(function(resolve,reject){
        tarball.extractTarball(tarballPath, outputPath, function (err) {
            if (err) {
                reject(err);
            } else {
                resolve(outputPath);
            }
        });
    });
    return promise;
}

/**
 * wrapper that runs all validations
 * @param name {string} hostname to be validated
 * @param type {string} cms type to be validated
 * @param type {string} target install path to have read/write permissions validated
 * @return {promise} resolves if ALL validations pass, rejects with message of failed validations of any do not pass
 */
function validateInputs(name, type, targetPath){
    return Promise.all([
        validateHostname(name),
        validateCMSType(type),
        validateInstallPath(targetPath)
    ]);
}

/**
 * wrapper that will unpack target CMS tarball to directory based on sitename and return docroot for ddev config use
 * @param siteName {string} site name of new site. used to build directory ( ex: {targetpath}/{sitename}/wordpress)
 * @param cmsType {string} target CMS to extract
 * @param targetFolder {string} target folder to extract to
 * @return {promise} resolves with path to new site docroot, rejects with error returned from any failed called function
 */
function createFiles(siteName, cmsType, targetFolder){
    var promise = new Promise(function(resolve, reject){
        getCMSPath(cmsType).then(function(CMSTarballPath){
            targetFolder = targetFolder + "/" + siteName;
            unpackCMSTarball(CMSTarballPath,targetFolder).then(function(unzippedPath){
                var CMSWorkingPath = (cmsType.indexOf('wordpress') !== -1) ? 'wordpress' : CMSTarballPath.split('/').pop().replace('.tar.gz','');
                resolve(unzippedPath + "/" + CMSWorkingPath);
            });
        })
        .catch(function(err){
            reject(err);
        });
    });
    return promise;
}


/**
 * wrapper for ddev config
 * @param siteName {string} name of site to configure
 * @param workingPath {string} the path of the extracted files to run ddev config in
 * @return {promise} resolves with a successful terminal output from ddev config, rejects with ddev error output
 */
function configureSite(siteName, workingPath){
    var promise = new Promise(function(resolve, reject){
        ddevShell.config(workingPath, siteName, '', resolve, reject);
    });
    return promise;
}

/**
 * wrapper for ddev hostname
 * @param siteName {string} name of site to create hosts file entry
 * @return {promise} resolves with a successful terminal output from ddev hostname, rejects with ddev error output
 */
function updateHostsFile(siteName) {
    return ddevShell.hostname(siteName);
}

/**
 * wrapper for ddev start
 * @param workingPath {string} the path of the extracted files to run ddev start in
 * @return {promise} resolves with a successful terminal output from ddev start, rejects with ddev error output
 */
function startSite(workingPath) {
    var promise = new Promise(function(resolve, reject){
        ddevShell.start(workingPath, resolve, reject);
    });
    return promise;
}

/**
 * public function - calls private functions to validate inputs, unpack files, and configure/start site
 * @param name {string} name of site to create
 * @param type {string} type of CMS to install (drupal7, drupal8, wordpress)
 * @param targetPath {string} path to unpack CMS and install site
 */
function addCMS(name, type, targetPath) {
    showLoadingScreen(true);
    validateInputs(name,type,targetPath)
        .then(function(){
            updateLoadingText('Unzipping files');
            createFiles(name, type, targetPath)
                .then(function(workingPath){
                    updateLoadingText('Configuring Site');
                    configureSite(name, workingPath)
                        .then(function(){
                            updateLoadingText('Updating Hosts File');
                            updateHostsFile(name)
                        })
                        .then(function(){
                            updateLoadingText('Starting Site');
                            startSite(workingPath)
                                .then(function(stdout){
                                    if(stdout.toString().indexOf('Starting environment') != -1){
                                        updateLoadingText('Start Process Initiated.' + stdout);
                                        resetAddModal();
                                    }
                                })
                        })
                })
        })
        .catch((err) => {
            showErrorScreen(true, err.toString());
        });
}

/**
 *
 * Markup and DOM Bindings
 *
 */
function showLoadingScreen(display){
    var displayType = display ? "flex" : "none";
    $('.loading-overlay').css('display', displayType);
}

function showErrorScreen(display, error){
    $('.error-overlay').click(function(){
        showErrorScreen(false, '');
    });
    var displayType = display ? "flex" : "none";
    showLoadingScreen(false);
    $('.error-text').text(error.toString());
    $('.error-overlay').css('display', displayType);
}

function updateLoadingText(text){
    $('.loading-text').text(text.toString());
}

function resetAddModal() {
    $('#appType').val('').trigger('change');
    $('#site-name').val('');
    $('.selected-path-text').val('');
    showLoadingScreen(false);
    showErrorScreen(false);
    $('#distroModal').modal('hide');
}

module.exports.addCMS = addCMS;