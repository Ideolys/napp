
VERBOSE_MODE = false;
SILENT_MODE = false;

var APP_NAME = 'napp';

var FG_COLORS = {
  'blue' : '\033[34m',
  'green' : '\033[32m',
  'purple' : '\033[35m',
  'red' : '\033[31m',
  'reset' : '\033[0m',
  'white' : '\033[37m'
};
var BG_COLORS = {
  'black' : '\033[40m',
  'blue' : '\033[44m',
  'green' : '\033[42m',
  'red' : '\033[41m',
  'reset' : '\033[0m'
};
var FONT = {
  'bold' : '\033[1m'
};

var log = module.exports = {
  debug : function(message){
    if(!SILENT_MODE){
      console.log(FG_COLORS.white + BG_COLORS.black + APP_NAME + FG_COLORS.reset + ' ' + FG_COLORS.green + BG_COLORS.black + 'info' + FG_COLORS.reset + ' ' + message);
    }
  },
  error : function(message){
    console.log(FG_COLORS.white + BG_COLORS.black + APP_NAME + FG_COLORS.reset + ' ' + FG_COLORS.red + BG_COLORS.black + 'ERROR' + FG_COLORS.reset + ' ' + message);
    process.exit(1);
  },
  silentMode : function(isSilent){
    SILENT_MODE = isSilent === true;
  },
  usage : function(command, options){
    console.log(APP_NAME + ' ' + command);
    if(options !== undefined){
      for(var o in options){
        console.log('  ' + o + '  ' + options[o]);
      }
    }
  },
  verbose : function(type, message){
    if(VERBOSE_MODE && !SILENT_MODE){
      var _message = FG_COLORS.white + BG_COLORS.black + APP_NAME + FG_COLORS.reset + ' ' + FG_COLORS.blue + BG_COLORS.black + 'verb' + FG_COLORS.reset;
      if(message !== undefined){
        _message += FG_COLORS.purple + ' ' + type;
      }
      else{
        message = type;
      }
      console.log(_message + FG_COLORS.reset + ' ' + message);
    }
  },
  verboseMode : function(isVerbose){
    VERBOSE_MODE = isVerbose === true;
  }
};
