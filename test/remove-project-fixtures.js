const removeProjectArray = [
  { name: 'removeOptions', value: 'Project from Dashboard' },
  { name: 'projectName', value: 'testyMcTestProject' },
];
const removeProjectDataArray = [
  { name: 'removeOptions', value: 'Project from Dashboard AND Project Database' },
  { name: 'projectName', value: 'testyMcTestProject' },
];
const brokenProjectArray = [{ bad: 'object' }, 'wrong type'];

const brokenErrorMessage = `Invalid Input Passed To Remove (TypeError: Cannot read property 'value' of undefined) payload:[{"bad":"object"},"wrong type"]`;

module.exports.removeProjectArray = removeProjectArray;
module.exports.removeProjectDataArray = removeProjectDataArray;
module.exports.brokenProjectArray = brokenProjectArray;
module.exports.brokenErrorMessage = brokenErrorMessage;
