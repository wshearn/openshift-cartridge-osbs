/// Module Init
var fs            = require('fs'),
    express       = require('express'),
    passport      = require('passport'),
    LocalStrategy = require('passport-local').Strategy,
    flash         = require('connect-flash'),
    exec          = require('exec-sync');
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
    diskSpace = exec("quota | tail -1 | awk '{print $3 }'");
else
    diskSpace = "1048576";

if (OSBS.config.site.on_openshift)
    usedSpace = exec("quota | tail -1 | awk '{print $1 }'");
else
    usedSpace = "55724";
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

app.post('/login'                            , authenticate        , RenderIndex);
/// End Routes

/// Helper Functions
function reloadBackups () {
    try {
        var backupStats = fs.statSync(OSBS.config.site.gearHome + "/app-root/data/backups_updated");
        if (backupStats.isFile()) {
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
    if (err) throw new Error(err);
    var idx = id - 1;
    if (OSBS.users[idx])
        done(null, OSBS.users[idx]);
    else
        throw new Error('User ' + id + ' does not exist');
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

function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated())
        return next();
    return res.redirect('/login');
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
        namespace : process.env.OPENSHIFT_NAMESPACE
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
    var title = "Login";
    RenderHelper('login', title, 'Please login to manage your backups', req, res);
}

// Logout route is simple, request.logout then goto /
function RenderLogout (req, res) {
    req.logout();
    res.redirect('/');
}
/// End Open Routes

// We want <site url>/ to redirect to /accountstats
function RenderIndex (req, res) {
    RenderAccountStats(req, res);
}

// TODO: Write api docs. yay?
function RenderApiDocs(req, res) {
    OSBS.menu.handleMenu("API Docs");
    var title = "API Docs";
    RenderHelper('apidocs', title, '', req, res);
}

// TODO: Handle restore option
function RenderGearInfo(req, res) {
    reloadBackups();

    var gearId = -1;
    for (var i = OSBS.gears.gears.length - 1; i >= 0; i--) {
        if (OSBS.gears.gears[i].name === req.params.gear) {
            gearId = i;
            break;
        }
    }

    var gearInfo = {
        gear: req.params.gear,
        backups: OSBS.backups[req.params.gear].backups,
        scheduled: OSBS.gears.gears[i].backups
    };

    OSBS.menu.handleMenu("Gear Info");
    var title = "Gear Info";
    RenderHelper('gearInfo', title, '', req, res, gearInfo);
}

// Renders a list of applications you have set up(ie added the client cartridge)
function RenderGearList(req, res) {
    OSBS.menu.handleMenu("Gear List");
    var title = "Gear List";
    RenderHelper('gearList', title, '', req, res, OSBS.gears);
}

// TODO: Add correct link to call delete
function RenderGearDelete (req, res) {
    var title = "Delete Gear Backup";
    var data = {
        gear : req.params.gear,
        date : req.params.date
    };
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
    }

    var data = {
        usedSpace : usedSpace,
        diskSpace : diskSpace,
        graphData : graphData
    };

    OSBS.menu.handleMenu("Account Stats");
    RenderHelper('accountStats', "Account Stats", '', req, res, data);
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
        downloadName += req.params.date.replace(/\//g, "-") + ".tar.gz";

    try {
        res.download(downloadPath, downloadName);
    } catch(err) {
        console.log(err);
        res.status(404).send(err);
    }
}
/// End Get Routes
/// End Routes
