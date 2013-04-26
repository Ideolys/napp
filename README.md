Node AP[P]lication [P]ackager
=============================

What's napp ?
-------------
Napp is a node module to pack and unpack your node js applications.

Features
--------
- Keeps all dependencies, even private ones (not published on NPM)
- Installs your application on the target host without querying NPM server
- Rebuilds automatically the node modules on the target host

Install
-------
Napp is made to work with the command line so you have to install it globally.

```bash
sudo npm install -g napp
```

Pack
----

### Simple usage

```bash
napp pack my-application/
```

### Usage options

```bash
napp pack <app folder> [<dest file>] [-v] [-s] [-a] [-n]
  <dest file> tar filename where to pack (default = appNam@appVersion--node@nodeVersion.tar.gz)
  -v
  --verbose   be verbose
  -s
  --silent    be silent
  -a
  --app       relative app path in your app where is the package.json file (default = <app folder>)
  -n
  --node      node version where the app will be unpacked (default = your node version)
```

Simple unpack
-------------

### Simple usage

```bash
napp unpack my-application.tar.gz
```

### Usage options

```bash
napp unpack <tar file> [<dest dir>] [-v] [-s]
  <dest dir>  dirname where to unpack the app (default = <app folder> of pack command)
  -v
  --verbose   be verbose
  -s
  --silent    be silent
```
