/// Module Init
var socket              = require('socket.io'),
    connect             = require('connect'),
    http                = require('http'),
    cookie              = require('cookie'),
    passportSocketIo    = require("passport.socketio");

var redis             = require('redis').createClient(),
    RedisStore        = require('connect-redis')(connect),
    parseSignedCookie = connect.utils.parseSignedCookie,
    parseCookie       = require('connect').utils.parseCookie,
    sessionStore      = new RedisStore({
      client:   redis,
      host:     OSBS.config.redis.host,
      port:     OSBS.config.redis.port
    });

// We have todo it like this so we can control when Socket.IO inits.
// It was starting up before we could setup express causing a ENOACC error
exports.setupSockets = function(){
    io  = socket.listen(OSBS.server.http);
    io.set('log level', 1);

    var message = null;
    var authd   = false;
    io.set('authorization', function(data, callback) {
        if(data.headers.cookie) {
            data.cookie = cookie.parse(data.headers.cookie);
            data.sessionId = parseSignedCookie(data.cookie['connect.sid'], OSBS.config.site.secretKey);
            if (data.sessionId == data.cookie['connect.sid']) {
                message = "Invalid Cookie";
                authd   = false;
            } else {
                sessionStore.get(data.sessionId, function(err, session){
                    if (err || !session.passport.user) {
                        message = "Not Logged In";
                        authd   = false;
                    } else {
                        authd = true;
                    }
                });
            }
        }
        else
            return callback("No cookie passed", false);

        return callback(message, authd);
    });

    io.sockets.on('connection', socketConnection);
}
/// End Module Init

/// Actual useful functions
function socketConnection(socket) {
    socket.on('takebackup', takeBackup);
    socket.on('togglebackup', toggleBackup);
    socket.on('restorebackup', restoreBackup);
}

function restoreBackup(data) {
    console.log(JSON.stringify(data, null, 4));
}

function takeBackup(data) {
    console.log(JSON.stringify(data, null, 4));
}

function toggleBackup(data) {
    console.log(JSON.stringify(data, null, 4));
}
/// End Actual useful functions
