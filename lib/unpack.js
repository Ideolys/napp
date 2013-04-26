
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
  extractTar,
  getPackEnvValues,
  checkCompatibility,
  moveExtractedFolder,
  rebuildApplication,
  cleanTempInfos
];

var _packEnv = {};
var _env = {};

function usage(){
  log.usage('unpack <tar file> [<target folder>] [-v -s]',{
    '<tar file>' : 'file where was packaged application',
    '<target folder>' : 'folder where to unpack application',
    '-v' : 'verbose mode',
    '--verbose' : 'verbose mode',
    '-s' : 'silent mode',
    '--silent' : 'silent mode'
  });
}

function unpack(args){
  _env.tempPath = helpers.checkTempFolderSync();
  _env.tempAppPath = path.join(_env.tempPath, 'app');
  fs.mkdirSync(_env.tempAppPath);
  log.verboseMode(false);
  log.silentMode(false);
  var nbSingleParams = 0;
  while(args.length > 0){
    var _argument = args.shift();
    switch(_argument){
      case "-a":
      case "--app":
        _env.tempNodeAppPath = args.shift();
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
          _env.tarPath = path.resolve(_argument);
        }
        else{
          _env.targetFolderPath = path.resolve(_argument);
        }
        nbSingleParams++;
    }
  }
  seq.emit('next');
}

function setEnvValues(done){
  log.verbose('env values', 'check if tar path was specified');
  if(_env.tarPath === undefined){
    usage();
    process.exit(1);
  }
  log.verbose('env values', 'tarPath of app : ' + _env.tarPath);
  _env.platform = process.platform;
  log.verbose('env values', 'platform of this computer : ' + _env.platform);
  log.verbose('env values', 'tempPath where work will be done : ' + _env.tempPath);
  log.verbose('env values', 'tempAppPath where app will be extracted : ' + _env.tempAppPath);
  _env.nappHiddenPath = path.join(_env.tempAppPath, '.napp');
  log.verbose('env values', 'nappHiddenPath of folder with napp specifics files and folders is : ' + _env.nappHiddenPath);
  _env.nappConfPath = path.join(_env.nappHiddenPath, 'napp.json');
  log.verbose('env values', 'nappConfPath where pack options are stored : ' + _env.nappConfPath);
  _env.nodeVersion = process.versions.node;
  log.verbose('env values', 'nodeVersion is ' + _env.nodeVersion);
  done();
}

function extractTar(done){
  log.debug('Extracting application');
  log.verbose('extract tar', 'archive will be extracted to temp directory before moving it to wanted path');
  log.verbose('spawn', 'tar -xzf ' + _env.tarPath + ' -C ' + _env.tempAppPath);
  var extract = spawn('tar', [ '-xzf', _env.tarPath, '-C', _env.tempAppPath ]);
  extract.on('exit', function(){
    log.verbose('extract tar', 'application extracted to temp folder');
    done();
  });
}

function getPackEnvValues(done){
  log.debug('Getting pack env values from extracted application');
  log.verbose('pack env values', 'reading config file at ' + _env.nappConfPath);
  var _conf = fs.readFileSync(_env.nappConfPath, 'utf8');
  log.verbose('pack env values', 'storing this configuration');
  _packEnv = JSON.parse(_conf);
  done();
}

function checkCompatibility(done){
  log.debug('Check compatibility of the application with your system');
  log.verbose('pack env values', 'this app was packaged for node version ' + _packEnv.nodeTargetVersion);
  log.verbose('pack env values', 'your running node version ' + _env.nodeVersion);
  if(_env.nodeVersion === _packEnv.nodeTargetVersion){
    log.verbose('pack env values', 'node version is ok');
    done();
  }
  else{
    log.error('The application was packaged for node version ' + _packEnv.nodeTargetVersion + ' and you have ' + _env.nodeVersion);
  }
}

function moveExtractedFolder(done){
  log.debug('Moving extracted application to wanted destination');
  if(_env.targetFolderPath === undefined){
    _env.targetFolderPath = path.resolve(_packEnv.appName);
  }
  log.verbose('move extracted app', 'destination : ' + _env.targetFolderPath);
  fs.renameSync(_env.tempAppPath, _env.targetFolderPath);
  log.verbose('move extracted app', 'app moved');
  done();
}

function rebuildApplication(done){
  log.debug('Rebuilding application');
  _env.appPath = path.join(_env.targetFolderPath, _packEnv.appRelativePath);
  /*log.verbose('rebuild application', '');*/
  log.verbose('spawn', 'npm rebuild');
  log.verbose('spawn cwd', _env.appPath);
  var rebuild = spawn('npm', [ 'rebuild' ], { cwd : _env.appPath, stdio : 'inherit' });
  rebuild.on('exit', function(){
    process.exit();
  });
}

function cleanTempInfos(done){
  log.debug('Cleaning temp folder');
  helpers.rmDirRecursiveSync(_env.tempPath);
  done();
}

module.exports = unpack;