var fs = require('fs'),
    express = require('express'),
    passport = require('passport'),
    BasicStrategy = require('passport-http').BasicStrategy,
    flash = require('connect-flash'),
    http = require('http');

var app = module.exports = express();

app.use(flash());
app.use(passport.initialize());
app.use(passport.session());

passport.use(new BasicStrategy(checkAuth));
passport.serializeUser(serializeUser);
passport.deserializeUser(deserializeUser);

var authenticate = passport.authenticate('basic', {session: false});

function BasicApiHelper (req, res, result, status) {
  var httpStatus = 200;
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

function ApiParseReq (req, res) {
  var result = {};

  if ((req.body["force"] && req.body["force"] == 'true') || 
      (req.query["force"] && req.query["force"] == 'true'))
    result["force"] = true;
  else
    result["force"] = false;


  if (req.query["gear"]) {
    result["gear"] = req.query["gear"];
  }
  else if (req.body["gear"]) {
    result["gear"] = req.body["gear"];
  } else {
    result = {
      result: false,
      cause: "You did not send a gear name"
    }
    BasicApiHelper(req, res, result, 500);
  }

  return result;
}

function RestAddGear (req, res)
{
  var result = {};
  var status = 200;

  result = ApiParseReq(req, res);

  if (req.query["uuid"]) {
    result["uuid"] = req.query["uuid"];
  }
  else if (req.body["uuid"]) {
    result["uuid"] = req.body["uuid"];
  } else {
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
      uuid: result.uuid
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

function GetArgument (req, item) {
  var value;

  if (req.query[item])
    value = req.query[item];
  else if (req.body[item])
    value = req.body[item]

  return value;
}

function RestGetGears (req, res) {
  BasicApiHelper(req, res, OSBS.gears);
}

function RestGetBackups (req, res) {
  BasicApiHelper(req, res, OSBS.backups);
}

function RestDelGear (req, res) {
  var request = ApiParseReq(req, res);
  var result = {};

  if ((OSBS.backups[request.name].backups &&
      OSBS.backups[request.name].backups.length > 0) &&
      request.force == false) {
    result["result"] = false;
    result["cause"]  = "This gear still has backups"
    BasicApiHelper(req, res, result, 500)
  } else {
    result["result"] = true;
    result["gear"]   = OSBS.us.find(
      OSBS.gears.gears,
      function FindGearForDel (gear) {
        if (gear.name == request.name)
          return gear;
        }
    );

    OSBS.backups[request.name] = null;
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

    BasicApiHelper(req, res, result);
  }
}

function RestGetGear (req, res) {
  var request = ApiParseReq(req, res);
  var result = {};

  result["gear"] = OSBS.us.find(
    OSBS.gears.gears,
    function FindGearForGet (gear) {
      if (gear.name == request.name)
        return gear;
    }
  );
  result["backups"] = OSBS.backups[request.name].backups;
  BasicApiHelper(req, res, result)
}

function RestScheduleBackup (req, res) {
  var request = ApiParseReq(req, res);
  var result = {};
  var retCode = 200;
  var occurrence = GetArgument(req, "occurrence");

  if (typeof(occurence) === "undefined" ) {
    result = {
      result: false,
      cause: "Did not send an occurrence"
    }
    BasicApiHelper(req, res, result, 500);
  }

  try {
    var data = {};
    for (var i = OSBS.gears.gears.length - 1; i >= 0; i--) {
      if (OSBS.gears.gears[i].name === request["gear"]) {
        data = OSBS.gears.gears[i];
        break;
      }
    };

    var cronString = "";
    cronString += OSBS.config.site.gearHome;
    cronString += "/osbs/bin/cron-snapshot";
    cronString += " -g " + data.name;
    cronString += " -u " + data.uuid + "\n";

    var occur;
    if (occurrence.toLowerCase() === "once")
      occur = "minutely"
    else
      occur = occurrence.toLowerCase();

    var cronPath = "";
    cronPath += OSBS.config.site.gearHome + "/";
    cronPath += "app-root/repo/.openshift/cron/"
    cronPath += occur + "/" + request["gear"];

    fs.appendFile(cronPath, cronString, null);
    fs.chmodSync(cronPath, '0700');

    result = {
      result: true,
      occurrence: occurrence,
      gear: request["gear"]
    }
  } catch (err) {
    result = {
      result: false,
      cause: err
    }

    retCode = 500;
  }
  return BasicApiHelper(req, res, result, retCode);
}

function RestUnscheduleBackup (req, res) {
  BasicApiHelper(req, res, { TODO : "I need to do this" })
}

function RestApiHelp (req, res) {
  BasicApiHelper(req, res, { TODO : "I need to do this" })
}


// TODO
app.post('/api/help', RestApiHelp);
app.post('/api/addgear', authenticate, RestAddGear);
app.post('/api/delgear', authenticate, RestDelGear);
app.post('/api/getgear', authenticate, RestGetGear);
app.post('/api/getgears', authenticate, RestGetGears);
app.post('/api/getbackups', authenticate, RestGetBackups);
app.post('/api/schedulebackup', authenticate, RestScheduleBackup);
app.post('/api/unschedulebackup', authenticate, RestUnscheduleBackup);

// AUTH crap
function deserializeUser (id, done)
{
  findById(id, done, null);
}

function serializeUser (user, done)
{
  done(null, user.id)
}

function findById(id, done, err)
{
  var idx = id - 1;
  if (OSBS.users[idx])
    done(null, OSBS.users[idx]);
  else
    new error('User ' + id + ' does not exist');
}

function checkAuth (username, password, done)
{
  for (var i = 0, len = OSBS.api_users.length; i < len; i++) {
    if (OSBS.api_users[i].username === username &&
        OSBS.api_users[i].password === password) {
      return done(null, OSBS.api_users[i]);
    }
  }
  return done(null, false, { message: 'Unknown user or password' });
}
