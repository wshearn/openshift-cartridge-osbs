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
/// End Globals

var express          = require('express'),
    http             = require('http'),
    connect          = require('connect'),
    cookie           = require('cookie'),
    path             = require('path'),
    socket           = require('socket.io'),
    passportSocketIo = require("passport.socketio");
    exec             = require('exec-sync'),
    osbs             = require('./osbs.js'),
    api              = require('./api.js');

var app               = express(),
    server            = http.createServer(app),
    MemoryStore       = express.session.MemoryStore,
    sessionStore      = new MemoryStore(),
    io                = socket.listen(server),
    secretKey         = exec("strings /dev/urandom | grep -o '[[:alnum:]]' | head -n 64 | tr -d '\n'; echo"),
    parseSignedCookie = connect.utils.parseSignedCookie;

app.locals.pretty = true;
app.set('ip'   , OSBS.config.web.host);
app.set('port' , OSBS.config.web.port);
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(express.cookieParser());
app.use(express.logger('dev'));
app.use(express.cookieParser());
app.use(express.errorHandler());
app.set('view engine', 'jade');
app.use(express.static(__dirname + "/public"));
app.use(express.session(
    {
        store: sessionStore,
        secret: secretKey
    }
));
app.use(app.router);
osbs.locals.pretty = true;
app.use(osbs);
app.use(api);

server.listen(app.get('port'), app.get('ip'));
server.on('listening', serverListening);

io.configure(socketConfigure);

io.sockets.on('connection', socketConnection);

function serverListening () {
    console.log('Openshift Backup Service<%s mode> started on port %s at %s',
        OSBS.config.site.env,
        server.address().port,
        server.address().address
    );
};

function socketConfigure() {
  io.set('authorization', socketAuth);
}

function socketAuth(data, callback) {
    if(data.headers.cookie) {
        // save parsedSessionId to handshakeData
        data.cookie = cookie.parse(data.headers.cookie);
        data.sessionId = parseSignedCookie(data.cookie['connect.sid'], secretKey);
    }
    callback(null, true);
}

function socketConnection(socket) {
  var sessionId    = socket.handshake.sessionId;

  sessionStore.get(sessionId, function(err, session) {
      if( ! err) {
          if(session.passport.user) {
            socket.on('restorebackup', function(data){
              console.log(JSON.stringify(data, null, 4));
            });
          }
      }
  });
}
