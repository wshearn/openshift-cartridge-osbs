var fs = require('fs');

var backupstring = process.env.OPENSHIFT_REPO_DIR + "backups.json";
var updated_flag = process.env.OPENSHIFT_DATA_DIR + "backups_updated";
var backups = require(backupstring);

var args = {};

process.argv.forEach(function (val, index, array) {
  if (val.match(/^--/))
  {
    arg = val.split("=");
    arg[0]=arg[0].replace("--", '');
    args[arg[0]] = arg[1];
  }
});

args.size = parseInt(args.size);

var backupData = {
  date: args.date,
  local: true,
  remote: false,
  size: args.size
}

if (typeof(backups[args.gear]) === "undefined") {
  backups[args.gear] = {
    backups: []
  };
}

backups[args.gear].backups[backups[args.gear].backups.length] = backupData;

fs.writeFileSync(backupstring, JSON.stringify(backups, null, 4), 'UTF-8');
fs.writeFileSync(updated_flag, "", 'UTF-8');
