# ddev-ui
A Graphical User Interface for the DDEV CLI (https://github.com/drud/ddev)

## Prerequisites
* DDEV CLI is installed and properly working.

## Run Instructions
* Ensure DDEV is installed and properly working via CLI and you have valid projects installed.

## Build Instructions
DDEV UI has been tested on macOS, Win7/8/10, Ubuntu 16.04+ and Fedora 25+. The following commands will output the compiled binary to /release-builds .

* macOS: `make darwin` 
* windows: `make windows`
* linux: `make linux`

While developing and testing locally, you may wish to skip building the full binary by simply running `electron .` from within the git repository. This will launch the electron app without requiring building disk images and closing/reopening the binary.

## Initial Roadmap
The planned roadmap can be found at 
https://github.com/drud/ddev-ui/wiki/Roadmap.

DDEV-UI is currently at V0.2, with the exception of "Add an app from a starting distribution" from release v0.1 and "Add an app from a local repo" from release v0.2 being non-functional.
