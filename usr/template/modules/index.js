var base_title = "OpenShift Backup Service"

var fs = require('fs');
var express = require('express');
var passport = require('passport');
var flash = require('connect-flash');
var LocalStrategy = require('passport-local').Strategy;

var app = module.exports = express();

app.metadata = {};
app.metadata.name    = "index";
app.metadata.title   = "Home";
app.metadata.url     = "/";

app.set('views', SCMS.config.views);
app.set('view engine', 'jade');
app.use(express.static(SCMS.config.public));
app.use(require('stylus').middleware(SCMS.config.public));
app.use(require('less-middleware')(SCMS.config.public));
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());

// Navbar Items
SCMS.menu.items[SCMS.menu.items.length] = {
  name: "Account Stats",
  url: "/accountstats",
  title: "Account Stats",
  active: false
}
SCMS.menu.items[SCMS.menu.items.length] = {
  name: "Gear Backups",
  url: "/gearbackups",
  title: "Gear Backups",
  active: false
}
SCMS.menu.items[SCMS.menu.items.length] = {
  name: "Gear List",
  url: "/gearlist",
  title: "Gear List",
  active: false
}
SCMS.menu.items[SCMS.menu.items.length] = {
  name: "Manage Backups",
  url: "/managebackups",
  title: "Manage Backups",
  active: false
}
SCMS.menu.items[SCMS.menu.items.length] = {
  name: "Schedule Backup",
  url: "/schedulebackup",
  title: "Schedule Backup",
  active: false
}

// Temp vars until I can move them and/or get them from external sources
var users = [
  { id: 1, username: 'admin', password: 'admin', email: 'admin@example.com', name: "Admin" }
];
var gearList = [
  {name: "website", first: true},
  {name: "awesomesite", first: false},
  {name: "hackathon", first: false}
]

// Login Helpers
function findById(id, fn) {
  var idx = id - 1;
  if (users[idx]) {
    fn(null, users[idx]);
  } else {
    fn(new Error('User ' + id + ' does not exist'));
  }
}

function findByUsername(username, fn) {
  for (var i = 0, len = users.length; i < len; i++) {
    var user = users[i];
    if (user.username === username) {
      return fn(null, user);
    }
  }
  return fn(null, null);
}

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  findById(id, function (err, user) {
    done(err, user);
  });
});

passport.use(new LocalStrategy(
  function(username, password, done) {
    process.nextTick(function () {
      findByUsername(username, function(err, user) {
        if (err) { return done(err); }
        if (!user) { return done(null, false, { message: 'Unknown user ' + username }); }
        if (user.password != password) { return done(null, false, { message: 'Invalid password' }); }
        return done(null, user);
      })
    });
  }
));

function authenticate (req, res, next) {
  passport.authenticate('local', { failureRedirect: '/admin/login.html', failureFlash: true })
  return next();
}

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.redirect('/login')
}

// Routes
function renderIndex (req, res){
  res.redirect('/accountstats');
};
function renderLogin (req, res){
  SCMS.menu.handleMenu(app.metadata.name);
  var title = base_title + " - Login";
  res.render('login',
    {
      title: title,
      subHeader: 'Please login to manage your backups',
      index: SCMS.menu.items,
      loggedIn: req.isAuthenticated(),
    }
  );
};
function renderLogout (req, res) {
  req.logout();
  res.redirect('/');
}
function RenderAccountStats(req, res) {
  var title = base_title + " - Account Stats";
  SCMS.menu.handleMenu("Account Stats");
  res.render('accountStats',
    {
      title: title,
      subHeader: '',
      index: SCMS.menu.items,
      loggedIn: req.isAuthenticated(),
    }
  );
}
function RenderGearBackups(req, res) {
  var title = base_title + " - Gear Backups";
  SCMS.menu.handleMenu("Gear Backups");
  res.render('gearBackups',
    {
      title: title,
      subHeader: '',
      index: SCMS.menu.items,
      loggedIn: req.isAuthenticated(),
    }
  );
}
function RenderGearInfo(req, res) {
  var title = base_title + " - Gear Info";
  SCMS.menu.handleMenu("Gear Info");
  res.render('gearInfo',
    {
      title: title,
      subHeader: '',
      index: SCMS.menu.items,
      loggedIn: req.isAuthenticated(),
    }
  );
}
function RenderGearList(req, res) {
  var title = base_title + " - Gear List";
  SCMS.menu.handleMenu("Gear List");
  res.render('gearList',
    {
      title: title,
      subHeader: '',
      index: SCMS.menu.items,
      loggedIn: req.isAuthenticated(),
    }
  );
}
function RenderManageBackups(req, res) {
  var title = base_title + " - Manage Backups";
  SCMS.menu.handleMenu("Manage Backups");
  res.render('manageBackups',
    {
      title: title,
      subHeader: '',
      index: SCMS.menu.items,
      loggedIn: req.isAuthenticated(),
    }
  );
}
function RenderScheduleBackup(req, res) {
  var title = base_title + " - Schedule Backup";
  SCMS.menu.handleMenu("Schedule Backup");
  res.render('scheduleBackup',
    {
      title: title,
      subHeader: '',
      index: SCMS.menu.items,
      loggedIn: req.isAuthenticated(),
      gearList: gearList,
    }
  );
}
function PostScheduleBackup(req, res) {
  var dateArray = req.body.date.split("/");
  var cronString;

  if (req.body.repeat == "once")
  {
    cronString = (+req.body.minute + 1) + " ";
    cronString += req.body.hour + " ";
    cronString += dateArray[0] + " " + dateArray[1] + " " + dateArray[2] + " ";
  }
  else if (req.body.repeat == "daily")
    cronString = "@daily ";
  else if (req.body.repeat == "weekly")
    cronString = "@weekly ";
  else
    cronString = "@monthly ";

  cronString += SCMS.config.site.gearHome + "/osbs/bin/rhcsnapshotwrapper " + req.body.gear + "\n";
  fs.appendFile(SCMS.config.site.gearHome + "/test", cronString, null);

  res.redirect('/schedulebackup');
}

app.get('/', ensureAuthenticated, renderIndex);
app.get('/login', renderLogin);
app.get('/logout', renderLogout);
app.get('/accountstats', ensureAuthenticated, RenderAccountStats);
app.get('/gearbackups', ensureAuthenticated, RenderGearBackups);
app.get('/gearinfo', ensureAuthenticated, RenderGearInfo);
app.get('/gearlist', ensureAuthenticated, RenderGearList);
app.get('/managebackups', ensureAuthenticated, RenderManageBackups);
app.get('/schedulebackup', ensureAuthenticated, RenderScheduleBackup);
app.post('/schedulebackup', ensureAuthenticated, PostScheduleBackup);

app.post('/login', passport.authenticate(
  'local',
  {
    failureRedirect: '/login',
    failureFlash: true
  }),
  function (req, res) {
    res.redirect('/');
  }
);