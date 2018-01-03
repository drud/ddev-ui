//TODO: Implement Redux to store application state
var state = {};
var electron = require('electron');
var dialog = require('electron').remote.dialog;
var ddevShell = require('./js/ddev-shell');
var updater = require('./js/distro-updater');
var siteCreator = require('./js/cms-installer');
var siteCard = require('./js/site-cards');
var describeSite = require('./js/describe-site');
var removeSite = require('./js/remove-site');

/**
 * bootstraps application by initializing modules, downloading distros, starting ddev list polling
 */
function init() {
    siteCard.init();
    siteCreator.init();
    describeSite.init();
    removeSite.init();
    updater.updateDistros();
    setInterval(fetchState, 1000);
}

/**
 * to be run on a loop - polls ddev list and compares CLI state to current app state and rerenders on mismatch
 */
function fetchState() {
    ddevShell.list().then(function (data) {
        if (JSON.stringify(data).trim() !== JSON.stringify(state).trim()) {
            state = data;
            renderUI(state);
        }
    });
}

/**
 * (re)renders UI cards and status messaging from a ddev list raw output
 * @param list
 */
function renderUI(list) {
    var validRouterStates = [
        "starting",
        "healthy"
    ];
    var routerStatusText = "DDEV Router Not Running - No Running DDEV Applications.";
    $('.card-container').empty();
    $('.card-container').append(siteCard.createAddCard());
    if(list.length !== 0){
        list.forEach(function (site) {
            var card = siteCard.createCard(site);
            $('.card-container').append(card);
        });
        routerStatusText = (validRouterStates.indexOf(list[0].router_status) != -1) ? '' : routerStatusText;
    }
    $('.router-status-label').text(routerStatusText);
}