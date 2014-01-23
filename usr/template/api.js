/// Module Init
var fs            = require('fs'),
    express       = require('express'),
    passport      = require('passport'),
    BasicStrategy = require('passport-http').BasicStrategy,
    flash         = require('connect-flash'),
    http          = require('http');

var app = module.exports = express();

app.use(flash());
app.use(passport.initialize());
app.use(passport.session());

passport.use(new BasicStrategy(checkAuth));
passport.serializeUser(serializeUser);
passport.deserializeUser(deserializeUser);

var authenticate = passport.authenticate('basic', {session: false});
/// End Module Init

/// Routes
app.get('/api/help'              , RestApiHelp);
app.post('/api/help'             , RestApiHelp);
app.post('/api/addgear'          , authenticate  , RestAddGear);
app.post('/api/delgear'          , authenticate  , RestDelGear);
app.post('/api/getgear'          , authenticate  , RestGetGear);
app.post('/api/getgears'         , authenticate  , RestGetGears);
app.post('/api/addbackup'        , authenticate  , RestAddBackup);
app.post('/api/getbackups'       , authenticate  , RestGetBackups);
app.post('/api/gearstarted'      , authenticate  , RestGearStarted);
app.post('/api/gearstopped'      , authenticate  , RestGearStopped);
app.post('/api/schedulebackup'   , authenticate  , RestScheduleBackup);
app.post('/api/unschedulebackup' , authenticate  , RestUnscheduleBackup);
/// End Routes

/// Helper Functions
function execute(command, callback){
    exec(command, function(error, stdout, stderr){
      callback(stdout.replace(/\n/, ''));
    });
};

function BasicApiHelper (req, res, result, status) {
  var httpStatus  = 200;
  var prettyPrint = false;

  if ((req.body["pretty"] && req.body["pretty"] == 'true') ||
      (req.query["pretty"] && req.query["pretty"] == 'true'))
      prettyPrint = true;

  if (status)
    httpStatus = status;

  var output;
  if (prettyPrint)
    output = JSON.stringify(result, null, 4);
  else
    output = JSON.stringify(result);

  output += "\n"
  res.status(httpStatus).send(output);
}

function GetArgument (req, item) {
  var value;

  if (req.query[item])
    value = req.query[item];
  else if (req.body[item])
    value = req.body[item]

  return value;
}

function ApiParseReq (req, res) {
  var result = {};

  result["force"] = GetArgument(req, "force");
  if (typeof(result["force"]) === "undefined")
  {
    result["force"] = false;
  }


  result["gear"] = GetArgument(req, "gear");
  if (typeof(result["gear"]) === "undefined") {
    result = {
      result: false,
      cause: "You did not send a gear name"
    }
    BasicApiHelper(req, res, result, 500);
  }

  return result;
}

function deserializeUser (id, done) {
  findById(id, done, null);
}

function serializeUser (user, done) {
  done(null, user.id)
}

function findById(id, done, err) {
  var idx = id - 1;
  if (OSBS.users[idx])
    done(null, OSBS.users[idx]);
  else
    new error('User ' + id + ' does not exist');
}

function checkAuth (username, password, done) {
  for (var i = 0, len = OSBS.api_users.length; i < len; i++) {
    if (OSBS.api_users[i].username === username &&
        OSBS.api_users[i].password === password) {
      return done(null, OSBS.api_users[i]);
    }
  }
  return done(null, false, { message: 'Unknown user or password' });
}
/// End Helper Functions

/// Routes

// TODO
function RestApiHelp (req, res) {
  return BasicApiHelper(req, res, { TODO : "I need to do this" })
}

function RestAddGear (req, res) {
  var result = {};
  var status = 200;

  result = ApiParseReq(req, res);

  result["uuid"] = GetArgument(req, "uuid");
  if (typeof(result["uuid"]) === "undefined") {
    result = {
      result: false,
      cause: "You did not send a uuid"
    }
    BasicApiHelper(req, res, result, 500);
  }

  if (OSBS.us.contains(OSBS.gears, result)) {
    result = OSBS.us.extend(result, {
      result: false,
      cause: "Gear has already been added"
    });
    status = 500;
  } else {
    OSBS.backups[result.gear] = { backups: [] };

    OSBS.gears.gears[OSBS.gears.gears.length] = {
      name: result.gear,
      uuid: result.uuid,
      backups: {
        daily:   false,
        weekly:  false,
        monthly: false
      }
    };

    fs.writeFileSync(
      "./gears.json",
      JSON.stringify(OSBS.gears, null, 4),
      'UTF-8'
    );

    fs.writeFileSync(
      "./backups.json",
      JSON.stringify(OSBS.backups, null, 4),
      'UTF-8'
    );

    result = OSBS.us.extend(result, {result: true});
  }

  BasicApiHelper(req, res, result, status);
}

// TODO
function RestDelGear (req, res) {
  var request = ApiParseReq(req, res);
  var result  = {};

  if (OSBS.backups[request.name].backups &&
      OSBS.backups[request.name].backups.length > 0 &&
      request.force  == false) {
    result["result"] = false;
    result["cause"]  = "This gear still has backups"
    return BasicApiHelper(req, res, result, 500);
  } else {
    result["result"] = true;
    result["gear"]   = OSBS.us.find(
      OSBS.gears.gears,
      function FindGearForDel (gear) {
        if (gear.name == request.name)
          return gear;
        }
    );

    OSBS.backups[request.name]     = null;
    OSBS.gears.gears[request.name] = null;

    fs.writeFileSync(
      "./gears.json",
      JSON.stringify(OSBS.gears, null, 4),
      'UTF-8'
    );

    fs.writeFileSync(
      "./backups.json",
      JSON.stringify(OSBS.backups, null, 4),
      'UTF-8'
    );

    return BasicApiHelper(req, res, result);
  }
}

function RestGetGear (req, res) {
  var request = ApiParseReq(req, res);
  var result  = {};

  result["gear"] = OSBS.us.find(
    OSBS.gears.gears,
    function FindGearForGet (gear) {
      if (gear.name == request.name)
        return gear;
    }
  );
  result["backups"] = OSBS.backups[request.name].backups;
  return BasicApiHelper(req, res, result)
}

function RestGetGears (req, res) {
  BasicApiHelper(req, res, OSBS.gears);
}

function RestAddBackup (req, res) {
  var request        = ApiParseReq(req, res);
  var result         = {};
  var retCode        = 200;
  var backup         = {
    uid:  GetArgument(req, "uid"),
    size: GetArgument(req, "size"),
    date: GetArgument(req, "date").replace(/\//g, "-"),
  };

  if (typeof(backup.uid) === "undefined") {
    result = {
      result : false,
      cause  : "Error getting backup uid"
    }
    return BasicApiHelper(req, res, result, 500);
  }

  if (typeof(backup.size) === "undefined") {
    result = {
      result : false,
      cause  : "Error getting backup size"
    }
    return BasicApiHelper(req, res, result, 500);
  }

  if (typeof(backup.date) === "undefined") {
    result = {
      result : false,
      cause  : "Error getting backup date"
    }
    return BasicApiHelper(req, res, result, 500);
  }

  console.log(JSON.stringify(backup, null, 4))

  try {
    OSBS.backups[request["gear"]].backups[OSBS.backups[request["gear"]].backups.length] = backup;
  } catch(err) {
    OSBS.backups[request["gear"]].backups = [];
    OSBS.backups[request["gear"]].backups[OSBS.backups[request["gear"]].backups.length] = backup;
  }

  fs.writeFileSync(
    "./backups.json",
    JSON.stringify(OSBS.backups, null, 4),
    'UTF-8'
  );

  result = {
    result: true
  }
  return BasicApiHelper(req, res, result, retCode);
}

function RestGetBackups (req, res) {
  BasicApiHelper(req, res, OSBS.backups);
}

// Hack till I can really do this
function RestGearStarted (req, res) {
  var request = ApiParseReq(req, res);
  var result  = {};
  var retCode = 200;

  var gear;
  var data    = {};

  for (var i = OSBS.gears.gears.length - 1; i >= 0; i--){
      if (OSBS.gears.gears[i].name === request["gear"]) {
          gear = i;
          data = OSBS.gears.gears[i];
          break;
      }
  }
  if (typeof(data.name) === 'undefined')
      throw new error("Gear Not Found");

  if (OSBS.gears.gears[gear].backups.daily == true)
      execute("sed -i 's/#" + data.name + "/" + data.name + "/' $OPENSHIFT_REPO_DIR/.openshift/cron/daily/jobs.allow", null)

  if (OSBS.gears.gears[gear].backups.weekly == true)
      execute("sed -i 's/#" + data.name + "/" + data.name + "/' $OPENSHIFT_REPO_DIR/.openshift/cron/weekly/jobs.allow", null)

  if (OSBS.gears.gears[gear].backups.monthly == true)
      execute("sed -i 's/#" + data.name + "/" + data.name + "/' $OPENSHIFT_REPO_DIR/.openshift/cron/monthly/jobs.allow", null)

  return BasicApiHelper(req, res, { TODO : "I need to do this" })
}

// Hack till I can really do this
function RestGearStopped (req, res) {
  var request = ApiParseReq(req, res);
  var result  = {};
  var retCode = 200;

  var gear;
  var data    = {};

  for (var i = OSBS.gears.gears.length - 1; i >= 0; i--){
      if (OSBS.gears.gears[i].name === request["gear"]) {
          gear = i;
          data = OSBS.gears.gears[i];
          break;
      }
  }
  if (typeof(data.name) === 'undefined')
      throw new error("Gear Not Found");

  if (OSBS.gears.gears[gear].backups.daily == true)
      execute("sed -i 's/" + data.name + "/#" + data.name + "/' $OPENSHIFT_REPO_DIR/.openshift/cron/daily/jobs.allow", null)

  if (OSBS.gears.gears[gear].backups.weekly == true)
      execute("sed -i 's/" + data.name + "/#" + data.name + "/' $OPENSHIFT_REPO_DIR/.openshift/cron/weekly/jobs.allow", null)

  if (OSBS.gears.gears[gear].backups.monthly == true)
      execute("sed -i 's/" + data.name + "/#" + data.name + "/' $OPENSHIFT_REPO_DIR/.openshift/cron/monthly/jobs.allow", null)

  return BasicApiHelper(req, res, { TODO : "I need to do this" })
}

function RestScheduleBackup (req, res) {
  var request    = ApiParseReq(req, res);
  var result     = {};
  var retCode    = 200;
  var occurrence = GetArgument(req, "occurrence");

  if (typeof(occurence) === "undefined" ) {
    result = {
      result: false,
      cause: "Did not send an occurrence"
    }
    BasicApiHelper(req, res, result, 500);
  }

  try {
    var gear;
    var data = {};
    for (var i = OSBS.gears.gears.length - 1; i >= 0; i--) {
      if (OSBS.gears.gears[i].name === request["gear"]) {
        gear = i;
        data = OSBS.gears.gears[i];
        break;
      }
    };

    if (typeof(data.name) === 'undefined')
      throw new error("Nope");

    var occur;
    if (occurrence.toLowerCase() === "once")
      occur = "minutely"
    else
    {
      occur = occurrence.toLowerCase();
      data.backups[occur] = true;
    }

    var cronString   = "";
        cronString += OSBS.config.site.gearHome;
        cronString += "osbs/bin/cron-snapshot";
        cronString += " -g " + data.name;
        cronString += " -u " + data.uuid;
        cronString += " -o " + occur + "\n";

    var baseCronPath   = "";
        baseCronPath += OSBS.config.site.gearHome + "/";
        baseCronPath += "app-root/repo/.openshift/cron/"
        baseCronPath += occur + "/";

    var cronPath = baseCronPath + data.name;
    var jobsPath = baseCronPath + "jobs.allow";

    fs.writeFileSync(cronPath, cronString, null);
    fs.writeFileSync(jobsPath, data.name + "\n", null);

    result = {
      result     : true,
      occurrence : occurrence,
      gear       : request["gear"]
    }

    OSBS.gears.gears[gear] = data;
  } catch (err) {
    result = {
      result : false,
      cause  : err
    }

    retCode = 500;
  }
  return BasicApiHelper(req, res, result, retCode);
}

function RestUnscheduleBackup (req, res) {
  return BasicApiHelper(req, res, { TODO : "I need to do this" })
}
