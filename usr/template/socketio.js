/// Module Init
var socket              = require('socket.io'),
    connect             = require('connect'),
    http                = require('http'),
    cookie              = require('cookie'),
    exec                = require('exec-sync'),
    fs                  = require('fs'),
    ssh                 = require('ssh2'),
    mkdirp              = require('mkdirp'),
    passportSocketIo    = require("passport.socketio");

var RedisStore        = require('connect-redis')(connect),
    parseSignedCookie = connect.utils.parseSignedCookie,
    parseCookie       = require('connect').utils.parseCookie;

var redis        = require('redis').createClient(
        OSBS.config.redis.port,
        OSBS.config.redis.host,
        {
            auth_pass: OSBS.config.redis.pass
        }
    ),
    sessionStore = new RedisStore({
      client:   redis
    });

function bytesToSize(bytes) {
    var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes == 0) return 'n/a';
    var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
};

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
    socket.on('takebackup', function takeBackup(data) {
        var uid  = exec("uuidgen -r | md5sum | awk '{ print $1 }'"),
            date = require('moment')().format('YYYY-MM-DD');

        var statusUpdate = {
            status:  "ok",
            message: "Starting backup of " + data.gear
        }
        var backup = {
            uid:  uid,
            size: null,
            date: date
        }
        var gearInfo = {};
        for (var i = OSBS.gears.gears.length - 1; i >= 0; i--) {
            if (OSBS.gears.gears[i].name === data.gear) {
                gearInfo = OSBS.gears.gears[i];
                break;
            }
        };
        var backupPath  = "";
            backupPath += process.env.OPENSHIFT_DATA_DIR + "backups/";
            backupPath += date.replace(/-/g, "/") + "/";
        var backupName  = data.gear + "-" + uid + ".tar.gz";

        try{
            mkdirp.sync(backupPath, '0770');
            socket.emit("scheduleupdate", statusUpdate);

            var sshConnection = new ssh();
            sshConnection.on('ready', function SSHConnected(){
                statusUpdate.message = "Step 1 of 2: SSH Connected";
                socket.emit("scheduleupdate", statusUpdate);

                sshConnection.exec('snapshot', function(err, stream){
                    if (err) {
                        statusUpdate.status = "fail";
                        statusUpdate.message = "Error getting snapshot";
                        socket.emit("scheduleupdate", statusUpdate);
                    }

                    stream.on('data', function getSnapshot(data, extended){
                        statusUpdate.message = "Step 2 of 2: Receiving snapshot";
                        socket.emit("scheduleupdate", statusUpdate);
                        if (extended != 'stderr')
                        {
                            fs.appendFileSync(backupPath + backupName, data, null);
                        }
                    });

                    stream.on('end', function(){
                    });

                    stream.on('close', function(){
                    });

                    stream.on('exit', function(code, signal){
                        backup.size = fs.statSync(backupPath + backupName).size;

                        try {
                            OSBS.backups[data.gear].backups.splice(0, 0, backup);
                        } catch(err) {
                            OSBS.backups[data.gear].backups = [];
                            OSBS.backups[data.gear].backups.splice(0, 0, backup);
                        }

                        statusUpdate.status = "finished";
                        statusUpdate.message = "";
                        statusUpdate.backup = backup;
                        statusUpdate.gear = data.gear;
                        socket.emit("scheduleupdate", statusUpdate);
                    });
               });
            });
            sshConnection.connect({
                host: data.gear + "-" + process.env.OPENSHIFT_NAMESPACE + ".rhcloud.com",
                port: 22,
                username: gearInfo.uuid,
                privateKey: fs.readFileSync(process.env.OPENSHIFT_DATA_DIR + ".ssh/osbs_id_rsa")
            });
        } catch(err) {
            statusUpdate.status = "fail";
            if (typeof(err) === "String") {
                statusUpdate.message = err;
            } else {
                statusUpdate.message = "We made an uh-oh";
            }
            socket.emit("scheduleupdate", statusUpdate);
        }
    });

    socket.on('restorebackup', function restoreBackup(data) {
        var backupName  = "";
            backupName += process.env.OPENSHIFT_DATA_DIR + "backups/";
            backupName += data.date.replace(/-/g, "/") + "/";
            backupName += data.gear + "-" + data.uid + ".tar.gz";

        var statusUpdate = {
            status:  "ok",
            message: "Restoring backup of gear: " + data.gear
        }

        var gearInfo = {};
        for (var i = OSBS.gears.gears.length - 1; i >= 0; i--) {
            if (OSBS.gears.gears[i].name === data.gear) {
                gearInfo = OSBS.gears.gears[i];
                break;
            }
        };

        try {
            var sshConnection = new ssh();

            sshConnection.on('ready', function restoreConnectionReady(){
                statusUpdate.message = "Restore: Connected";
                socket.emit("restoreupdate", statusUpdate);

                sshConnection.exec('restore INCLUDE_GIT', function restoreRemoteCmd(err, stream) {
                    if (err) throw err;
                    stream.allowHalfOpen = true;
                    var recvData = '';
                    stream.on('data', function restoreRecvData(data, extended) {
                        recvData + data.toString();
                        if (recvData.indexOf("Activation") > -1)
                            stream.end();
                        else if (recvData.indexOf("Starting") > -1)
                        {
                            statusUpdate.message = "Starting Gear";
                            socket.emit("restoreupdate", statusUpdate);
                        }
                    });
                    stream.on('exit', function finishedRestore(code, signal) {
                        statusUpdate.status = "finished";
                        statusUpdate.message = "Finished restore of gear: " + data.gear;
                        socket.emit("restoreupdate", statusUpdate);
                        sshConnection.end();
                    })
                    var fileStream = fs.createReadStream(backupName);
                    statusUpdate.message = "Sending Backup";
                    socket.emit("restoreupdate", statusUpdate);
                    fileStream.pipe(stream);
                    fileStream.once('end', function finishedSendingBackup(){
                        statusUpdate.message = "Restoring Backup";
                        socket.emit("restoreupdate", statusUpdate);
                    });
                });
            });

            sshConnection.connect({
                host: data.gear + "-" + process.env.OPENSHIFT_NAMESPACE + ".rhcloud.com",
                port: 22,
                username: gearInfo.uuid,
                privateKey: fs.readFileSync(process.env.OPENSHIFT_DATA_DIR + ".ssh/osbs_id_rsa")
            });
        } catch (err) {
            statusUpdate.status = "fail";
            if (typeof(err) === "String") {
                statusUpdate.message = err;
            } else {
                statusUpdate.message = "We made an uh-oh";
            }
            socket.emit("restoreupdate", statusUpdate);
        }
    });

    socket.on('togglebackup', function toggleBackup(data) {
        console.log(JSON.stringify(data, null, 4));
    });
}
/// End Actual useful functions
