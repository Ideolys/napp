
var fs = require('fs');
var path = require('path');

var TMP_NAME = null;
[ 'TMPDIR', 'TMP', 'TEMP' ].map(function(tmpName){
  if(TMP_NAME === null && process.env[tmpName] !== undefined){
    TMP_NAME = process.env[tmpName];
  }
});

var helpers = module.exports = {
  /**
   * Creates a folder in temp folder and returns its path
   * @param  {Function} callback
   * @return {String} tempPath
   */
  checkTempFolderSync : function(){
    var _uniqueTempFolderPath = path.join(TMP_NAME, 'napp-' + (new Date()).valueOf().toString());
    fs.mkdirSync(_uniqueTempFolderPath);
    return _uniqueTempFolderPath;
  },
  /**
   * get list of hidden files and folders inside given path
   * @param  {String} path
   * @return {Array}
   */
  getHiddenFilesAndFoldersSync : function(rootPath){
    var _filesAndFolders = fs.readdirSync(rootPath);
    var _hiddenFilesAndFolders = [];
    for (var i = 0; i < _filesAndFolders.length; i++) {
      if(_filesAndFolders[i].charAt(0) === '.'){
        var _filePath = path.join(rootPath, _filesAndFolders[i]);
        _hiddenFilesAndFolders.push({
          'path' : _filePath,
          'isDirectory' : fs.statSync(_filePath).isDirectory()
        });
      }
    }
    return _hiddenFilesAndFolders;
  },
  removeFilesAndFoldersSync : function(list){
    list.map(function(item){
      if(item.isDirectory){
        helpers.rmDirRecursiveSync(item.path);
      }
      else{
        fs.unlinkSync(item.path);
      }
    });
  },
  /**
   * Remove recursively and synchronously a folder
   * @param  {[type]} dirPath
   * @return {void}
   */
  rmDirRecursiveSync: function(dirPath) {
    if(!fs.existsSync(dirPath)){
      return;
    }
    var _list = fs.readdirSync(dirPath);

    for(var i = 0; i < _list.length; i++){
      var _filename = path.join(dirPath, _list[i]);
      var _stat = fs.statSync(_filename);

      if(_stat.isFile()){
        //if this is a file, remove it
        fs.unlinkSync(_filename);
      }
      else if(_stat.isDirectory()) {
        //if the is a dircetory, call the function recursively
        this.rmDirRecursiveSync(_filename);
      }
    }
    fs.rmdirSync(dirPath);
  }
};
