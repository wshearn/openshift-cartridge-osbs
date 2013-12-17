var base_title = "OpenShift Backup Service"

var fs = require('fs'),
    express = require('express'),
    passport = require('passport'),
    LocalStrategy = require('passport-local').Strategy,
    flash = require('connect-flash'),
    exec = require('child_process').exec,
    http = require('http');

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

if (OSBS.config.site.on_openshift)
  execute("quota | tail -1 | awk '{print $3 }'", getDiskSpace);
else
  execute("echo 10240", getDiskSpace);
if (OSBS.config.site.on_openshift)
  execute("du -s $HOME | awk '{print $1 }'", getUsedSpace);
else
  execute("echo 1024", getUsedSpace);

// Render Helper
// This is just a function to help reduce dup code in the routes
// args:
//  jade template, page title, page subHeader, request, result
function RenderHelper (template, title, subHeader, req, res, otherItems)
{
  var baseItems = {
    title: title,
    subHeader: subHeader,
    index: OSBS.menu.items,
    loggedIn: req.isAuthenticated(),
  };
  res.render(template, OSBS.us.extend(baseItems, otherItems));
}

// Routes
// We want <site url>/ to redirect to /accountstats
function RenderIndex (req, res)
{
  res.redirect('/accountstats');
};

// Logout route is simple, request.logout then goto /
function RenderLogout (req, res)
{
  req.logout();
  res.redirect('/');
}

// Render the login page. See app.post('/login') at the bottom for magic
function RenderLogin (req, res)
{
  OSBS.menu.handleMenu("Index");
  var title = base_title + " - Login";
  RenderHelper('login', title, 'Please login to manage your backups', req, res);
};

// Nothing special here yet...
function RenderAccountStats(req, res)
{
  var graphData = [];

  for (var i = OSBS.gears.gears.length - 1; i >= 0; i--) {
    var numOfBackups = 0;

    if (typeof(OSBS.backups[OSBS.gears.gears[i].name]["backups"]) != "undefined"
        && OSBS.backups[OSBS.gears.gears[i].name]["backups"].length > 0)
      numOfBackups = OSBS.backups[OSBS.gears.gears[i].name]["backups"].length;

    graphData[graphData.length] = {
      label: OSBS.gears.gears[i].name,
      data: numOfBackups
    }
  };

  var data = {
    usedSpace: usedSpace,
    diskSpace: diskSpace,
    graphData: graphData
  }

  OSBS.menu.handleMenu("Account Stats");
  var title = base_title + " - Account Stats";
  RenderHelper('accountStats', title, '', req, res, data);
}

// TODO: Handle restore option
function RenderGearInfo(req, res)
{
  var gearInfo = OSBS.us.extend(
    {gear: req.params.gear},
    OSBS.backups[req.params.gear]
  );
  
  OSBS.menu.handleMenu("Gear Info");
  var title = base_title + " - Gear Info";
  RenderHelper('gearInfo', title, '', req, res, gearInfo);
}

// Stables, that was easy
function RenderGearList(req, res)
{
  OSBS.menu.handleMenu("Gear List");
  var title = base_title + " - Gear List";
  RenderHelper('gearList', title, '', req, res, OSBS.gears);
}

// TODO: Handle Delete and add some pretty graphs and shit..
// Somewhat done
function RenderManageBackups(req, res)
{
  var data = { data: OSBS.us.extend(OSBS.gears, OSBS.backups) }
  OSBS.menu.handleMenu("Manage Backups");
  var title = base_title + " - Manage Backups";
  RenderHelper('manageBackups', title, '', req, res, data);
}

function RenderGearDelete (req, res) {
  var title = base_title + " - Delete Gear Backup";
  var data = {gear: req.params.gear, date: req.params.date }
  RenderHelper('deletegearbackup', title, '', req, res, data);
}

// Done
function RenderScheduleBackup(req, res)
{
  OSBS.menu.handleMenu("Schedule Backup");
  var title = base_title + " - Schedule Backup";
  RenderHelper('scheduleBackup', title, '', req, res, OSBS.gears);
}

// TODO
function RenderApiDocs(req, res)
{
  OSBS.menu.handleMenu("API Docs");
  var title = base_title + " - API Docs";
  RenderHelper('apidocs', title, '', req, res);
}

function PostScheduleBackup(req, res)
{
  try {
    var data = {};
    for (var i = OSBS.gears.gears.length - 1; i >= 0; i--) {
      if (OSBS.gears.gears[i].name === req.body["gear"]) {
        data = OSBS.gears.gears[i];
        break;
      }
    };
    if (typeof(data.name) === 'undefined')
      throw new error("Nope");

    var occur;
    if (req.body["occurrence"] == "Once")
      occur = "minutely"
    else
      occur = req.body["occurrence"].toLowerCase();

    var cronString = "";
    cronString += OSBS.config.site.gearHome;
    cronString += "/backup/bin/cron-snapshot";
    cronString += " -g " + data.name;
    cronString += " -u " + data.uuid;
    cronString += " -o " + occur + "\n";

    var baseCronPath = "";
    baseCronPath += OSBS.config.site.gearHome + "/";
    baseCronPath += "app-root/repo/.openshift/cron/"
    baseCronPath += occur + "/";

    var cronPath = baseCronPath + data.name;
    var jobsPath = baseCronPath + "jobs.allow";

    fs.writeFileSync(cronPath, cronString, null);
    fs.writeFileSync(jobsPath, data.name + "\n", null);

    return res.send("success");fs
  } catch (err) {
    return res.status(500).send("failure");
  }
}

function PostGearDelete (req, res) {
  console.log(req.data);
  res.redirect('/managebackups');
}

function GetGearDownload (req, res) {
  var downloadPath = "";
  downloadPath += OSBS.config.gearHome + "/";
  downloadPath += "app-root/data/backups/" + params.date;
  downloadPath += "/" + params.gear + ".tar.gz";

  var downloadName = params.gear + "-" + params.date.replace("/", "-") + ".tar.gz"

  res.download(downloadPath, downloadName);
}

app.get('/', ensureAuthenticated, RenderIndex);
app.get('/login', RenderLogin);
app.get('/logout', RenderLogout);
app.get('/accountstats', ensureAuthenticated, RenderAccountStats);
app.get('/gearinfo/:gear', ensureAuthenticated, RenderGearInfo);
app.get('/gearlist', ensureAuthenticated, RenderGearList);
app.get('/managebackups', ensureAuthenticated, RenderManageBackups);
app.get('/schedulebackup', ensureAuthenticated, RenderScheduleBackup);
app.get('/apidocs', ensureAuthenticated, RenderApiDocs);
app.get('/deletegearbackup/:gear/:date', ensureAuthenticated, RenderGearDelete);
app.post('/schedulebackup', ensureAuthenticated, PostScheduleBackup);
app.post('/deletegearbackup', ensureAuthenticated, PostGearDelete);
app.post('/downloadbackup/:gear/:date', ensureAuthenticated, GetGearDownload);
app.post('/login', authenticate, RenderIndex);

// AUTH Crap
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
  for (var i = 0, len = OSBS.users.length; i < len; i++) {
    if (OSBS.users[i].username === username &&
        OSBS.users[i].password === password) {
      return done(null, OSBS.users[i]);
    }
  }
  return done(null, false, { message: 'Unknown user or password' });
}

function authenticate (req, res, next)
{
  passport.authenticate(
    'local',
    {
      failureRedirect: '/admin/login.html',
      failureFlash: true
    }
  );
  return next();
}

function ensureAuthenticated(req, res, next)
{
  if (req.isAuthenticated())
    return next();
  res.redirect('/login');
}
