var fs = require('fs');

var backupstring = process.env.OPENSHIFT_REPO_DIR + "backups.json";
var updated_flag = process.env.OPENSHIFT_DATA_DIR + "backups_updated";
var backups = require(backupstring);

var args = {};

process.argv.forEach(function (val, index, array) {
  arg = val.split("=");
  if (arg[0].match(/^--/))
  {
    arg[0]=arg[0].replace("--", '');
    args[arg[0]] = arg[1];
  }
});

if (typeof(backups[args.gear]) == "undefined")
{
  backups[args.gear] = [];
}

var num = backups[args.gear].length;
backups[args.gear][num] = {};
backups[args.gear][num].date = args.date;
backups[args.gear][num].size = args.size;

fs.writeFileSync(backupstring, JSON.stringify(backups, null, 4), 'UTF-8');
fs.writeFileSync(updated_flag, "", 'UTF-8');
