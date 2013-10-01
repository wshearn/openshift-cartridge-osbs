var SHITTY_CMS      = {};
GLOBAL.SCMS         = SHITTY_CMS;
SCMS.config         = require("./config");
SCMS.us             = require('./helpers/underscore');
SCMS.menu           = require("./helpers/menu").menu;
SCMS.config.system  = {};

SCMS.config.system.siteTitle = "OSBS";

/**
 * Module dependencies.
 */
var express = require('express');
var http = require('http');
var path = require('path');
var modules = require('./modules');

var app = express();
var server = http.createServer(app);

// all environments
app.locals.pretty = true;
app.set('ip', SCMS.config.web.host);
app.set('port', SCMS.config.web.port);
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(express.cookieParser());
app.set('view engine', 'jade');
app.use(express.session({secret: "W#!1ao1iCAH0$H3oj!m4WiFuCe&Jlc8yo@#V&LwlF$ab%Ov79Lc!H&Io8&AMm78W"}));
app.use(app.router);

 // development only
if (SCMS.config.site.env == 'development') {
  app.use(express.logger('dev'));
  app.use(express.errorHandler());
} else if (SCMS.config.site.env == 'production') {
  app.use(express.logger());
}

// Always load the index module.
var modules;
if (SCMS.config.modules.indexOf("index") == -1){
  modules = SCMS.us.union(["index"], SCMS.config.modules);
} else {
  modules = SCMS.config.modules;
}

SCMS.modules = modules;

// Load modules
for (var i = 0; i < modules.length; i++) {
  modules[i] = require("./modules/" + modules[i]);
  app.use(modules[i]);
};

server.listen(app.get('port'), app.get('ip'));
server.on('listening', function() {
    console.log('Shitty CMS<%s mode> started on port %s at %s',
      SCMS.config.site.env, server.address().port, server.address().address);
});
