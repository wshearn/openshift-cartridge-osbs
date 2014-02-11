/// Begin Globals
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
  OSBS.api_users      = require("./users.json").api_users;
} catch (err) {
  OSBS.api_users      = [{id:1, username:"admin",password:"admin"}]
}

OSBS.config.system.siteTitle = "OSBS";

OSBS.server = {};
/// End Globals

var express       = require('express'),
    http          = require('http'),
    connect       = require('connect'),
    path          = require('path'),
    exec          = require('exec-sync');

var osbs       = require('./osbs.js'),
    api        = require('./api.js'),
    socketio   = require('./socketio.js');

var app               = express(),
    RedisStore        = require('connect-redis')(connect);

var redis             = require('redis').createClient(
        OSBS.config.redis.port,
        OSBS.config.redis.host,
        {
            auth_pass: OSBS.config.redis.pass
        }
    ),
    sessionStore      = new RedisStore({
      client:   redis
    });

OSBS.server.http  = http.createServer(app);

app.configure(expressSettings);

OSBS.server.http.listen(app.get('port'), app.get('ip'));
OSBS.server.http.on('listening', serverListening);

function expressSettings() {
    app.use(function(req, res, next) {
        res.header('Access-Control-Allow-Credentials', true);
        res.header('Access-Control-Allow-Origin', req.headers.origin);
        res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
        res.header('Access-Control-Allow-Headers', 'X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept');
        if ('OPTIONS' == req.method) {
            res.send(200);
        } else {
            next();
        }
    });

    app.locals.pretty = true;
    app.set('ip'   , OSBS.config.web.host);
    app.set('port' , OSBS.config.web.port);
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(express.logger('dev'));
    app.use(express.cookieParser());
    app.use(express.errorHandler());
    app.set('view engine', 'jade');
    app.use(express.static(__dirname + "/public"));
    app.use(express.session(
        {
            store:  sessionStore,
            secret: OSBS.config.site.secretKey
        }
    ));

    osbs.locals.pretty = true;
    app.use(app.router);
    app.use(osbs);
    app.use(api);
}

function serverListening () {
    console.log('Openshift Backup Service<%s mode> started on port %s at %s',
        OSBS.config.site.env,
        OSBS.server.http.address().port,
        OSBS.server.http.address().address
    );
    socketio.setupSockets();
}
