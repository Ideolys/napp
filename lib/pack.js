
var fs = require('fs');
var path = require('path');
var spawn = require('child_process').spawn;
var EE = require('events').EventEmitter;
var helpers = require('./helpers');
var log = require('./log');

var seqI = 0;
var seq = new EE()
    .on('next', function(){
      if(seqI === actionsSequence.length){
        process.exit(0);
      }
      actionsSequence[seqI++](function(){
        seq.emit('next');
      });
    });

var actionsSequence = [
  setEnvValues,
  copyDirectoryToTemp,
  cleanProject,
  getAppInformations,
  installTargetNodeVersion,
  rebuildApp,
  checkNodeSource,
  getNodeSource,
  deleteOldTar,
  saveConfigInApp,
  tarApp,
  reinstallCurrentNodeVersion,
  cleanTempInfos
];

var _env = {};


function pack(args){
  _env.tempPath = helpers.checkTempFolderSync();
  _env.tempAppPath = path.join(_env.tempPath, 'app');
  log.verboseMode(false);
  log.silentMode(false);
  var nbSingleParams = 0;
  while(args.length > 0){
    var _argument = args.shift();
    switch(_argument){
      case "-a":
      case "--app":
        _env.tempNodeAppPath = _env.nodeAppRelativePath = args.shift();
        break;
      case "-v":
      case "--verbose":
        log.verboseMode(true);
        break;
      case "-s":
      case "--silent":
        log.silentMode(true);
        break;
      case "-n":
      case "--node":
        _env.nodeTargetVersion = args.shift();
        break;
      default :
        if(nbSingleParams === 0){
          _env.appPath = path.resolve(_argument);
        }
        else{
          _env.tarPath = path.resolve(_argument);
        }
        nbSingleParams++;
    }
  }
  seq.emit('next');
}

function setEnvValues(done){
  _env.platform = process.platform;
  log.verbose('env values', 'platform of this computer : ' + _env.platform);
  log.verbose('env values', 'tempPath where work will be done : ' + _env.tempPath);
  log.verbose('env values', 'tempAppPath where app will be copied : ' + _env.tempAppPath);
  _env.tempNodeAppPath = path.join(_env.tempAppPath, _env.tempNodeAppPath || '');
  log.verbose('env values', 'rootPath of application where is package.json and modules is : ' + _env.tempNodeAppPath);
  if(_env.appPath === undefined){
    _env.appPath = path.resolve();
  }
  log.verbose('env values', 'appPath of packaged application is : ' + _env.appPath);
  _env.appName = path.basename(_env.appPath);
  log.verbose('env values', 'appName of packaged application is : ' + _env.appName);
  _env.packagePath = path.join(_env.tempNodeAppPath, 'package.json');
  log.verbose('env values', 'packagePath of package.json file is : ' + _env.packagePath);
  _env.nappHiddenPath = path.join(_env.tempAppPath, '.napp');
  log.verbose('env values', 'nappHiddenPath of folder with napp specifics files and folders is : ' + _env.nappHiddenPath);
  _env.homePath = process.env.HOME;
  log.verbose('env values', 'homePath of current user is : ' + _env.homePath);
  _env.nodeVersion = process.versions.node;
  log.verbose('env values', 'nodeVersion is ' + _env.nodeVersion);
  if(_env.nodeTargetVersion === undefined){
    _env.nodeTargetVersion = process.versions.node;
  }
  log.verbose('env values', 'nodeTargetVersion is ' + _env.nodeTargetVersion);
  _env.nodeSrcExists = false;
  done();
}

function copyDirectoryToTemp(done){
  log.debug('Copying files and folders');
  log.verbose('spawn', 'cp -r ./ ' + _env.tempAppPath + '/');
  log.verbose('spawn cwd', _env.appPath);
  var cpFolder = spawn('cp', [ '-r', './', _env.tempAppPath + '/' ], { cwd : _env.appPath });
  cpFolder.on('exit', function(){
    log.debug('Files and folders copied');
    done();
  });
}

function cleanProject(done){
  log.verbose('clean project', 'removing hidden files and folders');
  log.verbose('clean project', 'searching for hidden files and folders in ' + _env.tempAppPath);
  var _hiddenFilesAndFolders = helpers.getHiddenFilesAndFoldersSync(_env.tempAppPath);
  log.verbose('clean project', _hiddenFilesAndFolders.length + ' hidden files or folders were found');
  helpers.removeFilesAndFoldersSync(_hiddenFilesAndFolders);
  log.debug('Hidden files and folders removed');
  log.debug('Creating .napp folder in temp folder');
  fs.mkdirSync(_env.nappHiddenPath);
  log.verbose('clean project', 'hidden napp folder created at ' + _env.nappHiddenPath);
  done();
}

function getAppInformations(done){
  var _package = require(_env.packagePath);
  log.debug('Getting app informations');
  log.verbose('app informations', 'loading informations from package file');
  _env.app = _package;
  if(_env.tarPath === undefined){
    _env.tarFileName = _env.app.name + '@' + _env.app.version + '--node@' + _env.nodeTargetVersion + '.tar.gz';
    _env.tarPath = path.join(_env.appPath, _env.tarFileName);
  }
  else{
    _env.tarFileName = path.basename(_env.tarPath);
  }
  log.verbose('app informations', 'tar file name will be ' + _env.tarFileName);
  log.verbose('app informations', 'tar file path will be ' + _env.tarPath);
  _env.tempTarPath = path.join(_env.tempAppPath, _env.tarFileName);
  log.verbose('app informations', 'tar file path in temp folder is ' + _env.tempTarPath);
  done();
}

function installTargetNodeVersion(done){
  log.debug('Checking if current node version is equal to target node version');
  log.verbose('check node version', 'current node version is ' + _env.nodeVersion);
  log.verbose('check node version', 'target node version is ' + _env.nodeTargetVersion);
  if(_env.nodeVersion !== _env.nodeTargetVersion){
    log.verbose('check node version', 'target version is different of current version');
    log.verbose('check node version', 'will have to download and install target version');
    downloadCurrentNodeVersion(function(){
      downloadTargetNodeVersion(function(){
        applyInstallTargetNodeVersion(done);
      });
    });
  }
  else{
    log.verbose('check node version', 'target version is equal of current version');
    log.verbose('check node version', 'nothing more to do here');
    done();
  }
}

function downloadCurrentNodeVersion(callback){
  _env.nodeURL = 'http://nodejs.org/dist/v' + _env.nodeVersion + '/node-v' + _env.nodeVersion + '.pkg';
  log.verbose('download current node', 'download current node installer to reinstall it after rebuild');
  log.verbose('download current node', 'node URL : ' + _env.nodeURL);
  _env.nodeInstallerPath = path.join(_env.tempPath, 'node-v' + _env.nodeVersion + '.pkg');
  log.verbose('download current node', 'node installer path : ' + _env.nodeInstallerPath);
  log.verbose('spawn', 'wget -O ' + _env.nodeInstallerPath + ' ' + _env.nodeURL);
  var wgetNode = spawn('wget', [ '-O', _env.nodeInstallerPath, _env.nodeURL ], { stdio : 'inherit' });
  wgetNode.on('exit', function(){
    log.verbose('download current node', 'node installer downloaded');
    callback();
  });
}

function downloadTargetNodeVersion(callback){
  _env.nodeTargetURL = 'http://nodejs.org/dist/v' + _env.nodeTargetVersion + '/node-v' + _env.nodeTargetVersion + '.pkg';
  log.verbose('download target node', 'download target node installer to rebuild app');
  log.verbose('download target node', 'node target URL : ' + _env.nodeTargetURL);
  _env.nodeTargetInstallerPath = path.join(_env.tempPath, 'node-v' + _env.nodeTargetVersion + '.pkg');
  log.verbose('download target node', 'node target installer path : ' + _env.nodeTargetInstallerPath);
  log.verbose('spawn', 'wget -O ' + _env.nodeTargetInstallerPath + ' ' + _env.nodeTargetURL);
  var wgetNode = spawn('wget', [ '-O', _env.nodeTargetInstallerPath, _env.nodeTargetURL ], { stdio : 'inherit' });
  wgetNode.on('exit', function(){
    log.verbose('download target node', 'node installer downloaded');
    callback();
  });
}

function applyInstallTargetNodeVersion(callback){
  log.verbose('install target node', 'installing target node');
  log.verbose('spawn', 'sudo installer -pkg ' + _env.nodeTargetInstallerPath + ' -target /');
  var installNode = spawn('sudo', [ 'installer', '-pkg', _env.nodeTargetInstallerPath, '-target', '/' ], { stdio : 'inherit' });
  installNode.on('exit', function(){
    log.verbose('install target node', 'installation finished');
    log.verbose('install target node', 'fixing he new node version in process config');
    process.versions.node = _env.nodeTargetVersion;
    process.version = 'v' + _env.nodeTargetVersion;
    log.verbose('install target node', 'current node version should be the target one');
    log.verbose('install target node', 'target : ' + _env.nodeTargetVersion);
    log.verbose('install target node', 'current : ' + process.versions.node);
    callback();
  });
}

function rebuildApp(done){
  log.debug('Rebuilding application');
  log.verbose('spawn', 'npm rebuild');
  log.verbose('spawn cwd', _env.tempNodeAppPath);
  log.verbose('spawn', 'redirecting npm stdout to this terminal');
  var rebuild = spawn('npm', [ 'rebuild' ], { cwd : _env.tempNodeAppPath, stdio : 'inherit' });
  rebuild.on('exit', function rebuildDone(){
    done();
  });
}

function checkNodeSource(done){
  log.debug('Checking if node source is present');
  log.verbose('check node source', 'looking for node source in node-gyp in home path');
  _env.nodeSrcPath = path.join(_env.homePath, '.node-gyp', _env.nodeTargetVersion);
  log.verbose('check node source', 'node source path is : ' + _env.nodeSrcPath);
  log.verbose('check node source', 'does ' + _env.nodeSrcPath + ' exist ?');
  _env.nodeSrcExists = fs.existsSync(_env.nodeSrcPath);
  done();
}

function getNodeSource(done){
  if(_env.nodeSrcExists){
    log.verbose('get node source', _env.nodeSrcPath + ' exists');
    log.verbose('get node source', 'copying this folder to the application');
    var _nodeSrcPathInNapp = path.join(_env.nappHiddenPath, 'node-source');
    log.verbose('spawn', 'cp -r ' + _env.nodeSrcPath + ' ' + _nodeSrcPathInNapp);
    var copyNodeSrc = spawn('cp', [ '-r', _env.nodeSrcPath, _nodeSrcPathInNapp ]);
    copyNodeSrc.on('exit', function(){
      log.verbose('get node source', 'node sources copied to the project');
      done();
    });
  }
  else{
    log.verbose('get node source', _env.nodeSrcPath + ' does not exist. Will not try to get node sources.');
    done();
  }
}

function deleteOldTar(done){
  log.debug('Deleting file '  + _env.tarFileName + ' if it exists');
  var _exists = fs.existsSync(_env.tarPath);
  log.verbose('old tar', 'checked tar file path : ' + _env.tarPath);
  if(_exists){
    log.verbose('old tar', 'tar file exists in original folder');
    log.verbose('old tar', 'removing tar file in original folder');
    /*try{*/
      fs.unlinkSync(_env.tarPath);
    /*}catch(e){}*/
    log.verbose('old tar', 'tar file removed in original folder');

    log.verbose('old tar', 'if tar file exists in original folder it exists in temp folder');
    log.verbose('old tar', 'removing tar file in temp folder');
    try{
      fs.unlinkSync(_env.tempTarPath);
    }catch(e){}
    log.verbose('old tar', 'tar file removed in temp folder');
  }
  else{
    log.verbose('old tar', 'tar file does not exist');
  }
  done();
}

function saveConfigInApp(done){
  log.debug('Saving configuration of this pack in the app');
  var _confPath = path.join(_env.nappHiddenPath, 'napp.json');
  log.verbose('save config', 'path where configuration will be save : ' + _confPath);
  log.verbose('save config', 'writing configuration');
  fs.writeFileSync(_confPath, JSON.stringify(_env, null, 2));
  log.verbose('save config', 'configuration saved');
  done();
}

function tarApp(done){
  log.debug('Packaging application');
  log.verbose('spawn', 'tar -czf ' + _env.tarPath + ' ./');
  log.verbose('spawn cwd', _env.tempAppPath);
  var tar = spawn('tar', [ '-czf', _env.tarPath, './' ], { cwd : _env.tempAppPath });
  tar.on('exit', function(){
    log.debug('Application packgaged to : ' + _env.tarPath);
    done();
  });
}

function reinstallCurrentNodeVersion(done){
  if(_env.nodeVersion !== _env.nodeTargetVersion){
    log.verbose('reinstall current node', 'reinstalling current node');
    log.verbose('spawn', 'sudo installer -pkg ' + _env.nodeInstallerPath + ' -target /');
    var installNode = spawn('sudo', [ 'installer', '-pkg', _env.nodeInstallerPath, '-target', '/' ], { stdio : 'inherit' });
    installNode.on('exit', function(){
      log.verbose('reinstall current node', 'installation finished');
      log.verbose('reinstall current node', 'fixing he new node version in process config');
      process.versions.node = _env.nodeVersion;
      process.version = 'v' + _env.nodeVersion;
      log.verbose('reinstall current node', 'current node version should not be anymore the target one');
      log.verbose('reinstall current node', 'target : ' + _env.nodeVersion);
      log.verbose('reinstall current node', 'current : ' + process.versions.node);
      done();
    });
  }
}

function cleanTempInfos(done){
  log.debug('Cleaning temp folder');
  helpers.rmDirRecursiveSync(_env.tempPath);
  done();
}

module.exports = pack;