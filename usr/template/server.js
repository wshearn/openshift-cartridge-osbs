var OpenShiftBackupService = {};

GLOBAL.OSBS         = OpenShiftBackupService;
OSBS.us             = require("./underscore");
OSBS.config         = require("./config");
OSBS.menu           = require("./menu").menu;
// TODO: move to OPENSHIFT_DATADIR
OSBS.config.system  = {};

try {
  OSBS.gears        = require("./gears.json");
} catch (err) {
  OSBS.gears        = {gears:[]};
}

try {
  OSBS.backups      = require("./backups.json");
} catch (err) {
  OSBS.backups      = {};
}

try {
  OSBS.users        = require("./users.json").web_users;
} catch (err) {
  OSBS.users        = [{id:1, username:"admin",password:"admin"}]
}

try {
  OSBS.api_users    = require("./users.json").api_users;
} catch (err) {
  OSBS.api_users    = [{id:1, username:"admin",password:"admin"}]
}

OSBS.config.system.siteTitle = "OSBS";

var express = require('express'),
    http    = require('http'),
    path    = require('path'),
    osbs    = require('./osbs.js'),
    api     = require('./api.js');

var app    = express(),
    server = http.createServer(app);

app.locals.pretty = true;
app.set('ip'   , OSBS.config.web.host);
app.set('port' , OSBS.config.web.port);
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(express.cookieParser());
app.use(express.logger('dev'));
app.use(express.errorHandler());
app.set('view engine', 'jade');
app.use(express.static(__dirname + "/public"));
app.use(express.session({secret: "W#!1ao1iCAH0$H3oj!m4WiFuCe&Jlc8yo@#V&LwlF$ab%Ov79Lc!H&Io8&AMm78W"}));
app.use(app.router);
osbs.locals.pretty = true;
app.use(osbs);
app.use(api);

server.listen(app.get('port'), app.get('ip'));
server.on('listening', serverListening);

function serverListening () {
  console.log('Openshift Backup Service<%s mode> started on port %s at %s',
    OSBS.config.site.env,
    server.address().port,
    server.address().address
  );
}
