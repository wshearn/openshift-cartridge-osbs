/// Module Init
var base_title = "OpenShift Backup Service"

var fs            = require('fs'),
    express       = require('express'),
    passport      = require('passport'),
    LocalStrategy = require('passport-local').Strategy,
    flash         = require('connect-flash'),
    exec          = require('child_process').exec,
    http          = require('http');

var app = module.exports = express();
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(checkAuth));
passport.serializeUser(serializeUser);
passport.deserializeUser(deserializeUser);

var authenticate = passport.authenticate('local', {failureRedirect: '/login'});

var diskSpace = "";
var usedSpace = "";

if (OSBS.config.site.on_openshift)
  execute("quota | tail -1 | awk '{print $3 }'", getDiskSpace);
else
  execute("echo 10240", getDiskSpace);
if (OSBS.config.site.on_openshift)
  execute("du -s $HOME | awk '{print $1 }'", getUsedSpace);
else
  execute("echo 1024", getUsedSpace);
/// End Module Init

/// Routes
app.get('/login'                             , RenderLogin);
app.get('/logout'                            , RenderLogout);
app.get('/'                                  , ensureAuthenticated , RenderIndex);
app.get('/apidocs'                           , ensureAuthenticated , RenderApiDocs);
app.get('/gearinfo/:gear'                    , ensureAuthenticated , RenderGearInfo);
app.get('/gearlist'                          , ensureAuthenticated , RenderGearList);
app.get('/downloadbackup/:gear/:date/:uid'   , ensureAuthenticated , GetGearDownload);
app.get('/deletegearbackup/:gear/:date/:uid' , ensureAuthenticated , RenderGearDelete);
app.get('/accountstats'                      , ensureAuthenticated , RenderAccountStats);
app.get('/schedulebackup'                    , ensureAuthenticated , RenderScheduleBackup);

app.post('/login'                            , authenticate        , RenderIndex);
app.post('/deletegearbackup'                 , ensureAuthenticated , PostGearDelete);
app.post('/restorebackup'                    , ensureAuthenticated , PostRestoreBackup);
app.post('/schedulebackup'                   , ensureAuthenticated , PostScheduleBackup);
/// End Routes

/// Helper Functions
function execute(command, callback){
    exec(command, function(error, stdout, stderr){
      callback(stdout.replace(/\n/, ''));
    });
};

function getDiskSpace(output) {
  diskSpace = output;
}
function getUsedSpace (output) {
  usedSpace = output;
}

function reloadBackups () {
  try
  {
    var backupStats = fs.statSync(OSBS.config.site.gearHome + "/app-root/data/backups_updated");
    if (backupStats.isFile())
    {
      OSBS.backups = require("./backups.json");
      fs.unlinkSync(OSBS.config.site.gearHome + "/app-root/data/backups_updated");
    }
  } catch(e) {}
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
  for (var i = 0, len = OSBS.users.length; i < len; i++) {
    if (OSBS.users[i].username === username &&
        OSBS.users[i].password === password) {
      return done(null, OSBS.users[i]);
    }
  }
  return done(null, false, { message: 'Unknown user or password' });
}

function authenticate (req, res, next) {
  passport.authenticate(
    'local',
    {
      failureRedirect : '/admin/login.html',
      failureFlash    : true
    }
  );
  return next();
}

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated())
    return next();
  res.redirect('/login');
}

// Render Helper
// This is just a function to help reduce dup code in the routes
// args:
//  jade template, page title, page subHeader, request, result
function RenderHelper (template, title, subHeader, req, res, otherItems)
{
  var baseItems = {
    title     : title,
    subHeader : subHeader,
    index     : OSBS.menu.items,
    loggedIn  : req.isAuthenticated(),
  };
  res.render(template, OSBS.us.extend(baseItems, otherItems));
}
/// End Helper Functions

/// Routes

/// Get routes

/// Open Routes(they do not have ensureAuthenticated in the route def)
// Render the login page. See app.post('/login') at the bottom for magic
function RenderLogin (req, res) {
  OSBS.menu.handleMenu("Index");
  var title = base_title + " - Login";
  RenderHelper('login', title, 'Please login to manage your backups', req, res);
};

// Logout route is simple, request.logout then goto /
function RenderLogout (req, res) {
  req.logout();
  res.redirect('/');
}
/// End Open Routes

// We want <site url>/ to redirect to /accountstats
function RenderIndex (req, res) {
  res.redirect('/accountstats');
};

// TODO: Write api docs. yay?
function RenderApiDocs(req, res) {
  OSBS.menu.handleMenu("API Docs");
  var title = base_title + " - API Docs";
  RenderHelper('apidocs', title, '', req, res);
}

// TODO: Handle restore option
function RenderGearInfo(req, res) {
  reloadBackups();

  var gearInfo = OSBS.us.extend(
    {gear: req.params.gear},
    OSBS.backups[req.params.gear]
  );

  OSBS.menu.handleMenu("Gear Info");
  var title = base_title + " - Gear Info";
  RenderHelper('gearInfo', title, '', req, res, gearInfo);
}

// Renders a list of applications you have set up(ie added the client cartridge)
function RenderGearList(req, res) {
  OSBS.menu.handleMenu("Gear List");
  var title = base_title + " - Gear List";
  RenderHelper('gearList', title, '', req, res, OSBS.gears);
}

// TODO: Add correct link to call delete
function RenderGearDelete (req, res) {
  var title = base_title + " - Delete Gear Backup";
  var data = {
      gear : req.params.gear,
      date : req.params.date
  }
  RenderHelper('deletegearbackup', title, '', req, res, data);
}

// TODO: Add more pretty graphs and stuff.
// TODO: Find out exactly people would want here
function RenderAccountStats(req, res) {
  var graphData = [];

  for (var i = OSBS.gears.gears.length - 1; i >= 0; i--) {
    var numOfBackups = 0;

    if (typeof(OSBS.backups[OSBS.gears.gears[i].name]["backups"]) != "undefined" &&
        OSBS.backups[OSBS.gears.gears[i].name]["backups"].length > 0)
      numOfBackups = OSBS.backups[OSBS.gears.gears[i].name]["backups"].length;

    graphData[graphData.length] = {
      label : OSBS.gears.gears[i].name,
      data  : numOfBackups
    }
  };

  var data = {
    usedSpace : usedSpace,
    diskSpace : diskSpace,
    graphData : graphData
  }

  OSBS.menu.handleMenu("Account Stats");
  var title = base_title + " - Account Stats";
  RenderHelper('accountStats', title, '', req, res, data);
}

// Render a simple space that allows people to schedule a backup
// TODO: Merge this in with the gear info page.
function RenderScheduleBackup(req, res) {
  OSBS.menu.handleMenu("Schedule Backup");
  var title = base_title + " - Schedule Backup";
  RenderHelper('scheduleBackup', title, '', req, res, OSBS.gears);
}

// Uses express.js download function to send the backup to the user
// Doing the downloads is "more secure" as the downloads are not sitting on a
// web facing directoy.
// More secure != most secured. Need to evaluate how secure this really is.
function GetGearDownload (req, res) {
  var downloadPath  = "";
      downloadPath += OSBS.config.site.gearHome + "/";
      downloadPath += "app-root/data/backups/";
      downloadPath += req.params.date.replace(/-/g, "/") + "/";
      downloadPath += req.params.gear + "-" + req.params.uid + ".tar.gz";

  var downloadName  = req.params.gear + "_";
      downloadName += req.params.date.replace(/\//g, "-") + ".tar.gz"

  res.download(downloadPath, downloadName);
}
/// End Get Routes

/// Post Routes
// TODO: Remove from OSBS.backups and call fs.unlinksync on the backup
function PostGearDelete (req, res) {
  console.log(req.data);
  res.redirect('/managebackups');
}

// TODO: Doing
// Try out ssh2 node module
// If all else fails do a single cronjob like we do for one backup.
// Should be pretty easy to handle
function PostRestoreBackup(req, res) {
    try {
        throw new error("Not Implet");
      var gear;
      var data = {};
      for (var i = OSBS.gears.gears.length; i >= 0; i--) {
          if (OSBS.gears.gears[i] === req.body["gear"]) {
            gear = i;
            data = OSBS.gears.gears[i];
            break;
          }
      }
      if (typeof(data.name) === 'undefined')
          throw new error("Gear Not Found");

      var backupString  = "";
          backupString += process.env.OPENSHIFT_DATA_DIR + "backups/";
          backupString += req.body["date"].replace(/-/g, "/") + data.name;
          backupString += "-"+ req.body["uuid"] + "tar.gz"
    console.log(backupString);

      var cronString  = "";
          cronString += OSBS.config.site.gearHome;
          cronString += " -g " + data.name;
          cronString += " -u " + data.uuid;
          cronString += " -b " + backupString;

      console.log(cronString);
      return res.status(200).send("success");
    } catch (err) {
      return res.status(500).send("failure");
    }
}

// Done
function PostScheduleBackup(req, res) {
  try {
    var gear;
    var data = {};
    for (var i = OSBS.gears.gears.length - 1; i >= 0; i--) {
      if (OSBS.gears.gears[i].name === req.body["gear"]) {
        gear = i;
        data = OSBS.gears.gears[i];
        break;
      }
    };
    if (typeof(data.name) === 'undefined')
      throw new error("Gear Not Found");

    var occur;
    if (req.body["occurrence"] == "Once")
      occur = "minutely"
    else
    {
      occur = req.body["occurrence"].toLowerCase();
      data.backups[occur] = true;
    }

    var cronString  = "";
        cronString += OSBS.config.site.gearHome;
        cronString += "osbs/bin/cron-snapshot";
        cronString += " -g " + data.name;
        cronString += " -u " + data.uuid;
        cronString += " -o " + occur + "\n";

    var baseCronPath  = "";
        baseCronPath += OSBS.config.site.gearHome + "/";
        baseCronPath += "app-root/repo/.openshift/cron/"
        baseCronPath += occur + "/";

    var cronPath = baseCronPath + data.name;
    var jobsPath = baseCronPath + "jobs.allow";

    fs.writeFileSync(cronPath, cronString, null);
    fs.writeFileSync(jobsPath, data.name + "\n", null);

    OSBS.gears.gears[gear] = data;

    return res.send("success");
  } catch (err) {
    return res.status(500).send("failure");
  }
}
/// End Routes
