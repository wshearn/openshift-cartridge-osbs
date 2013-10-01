var config = {}

config.web  = {};
config.site = {};

config.modules = ["index"];

// IP:Port to listen on
config.web.host   = "localhost";
config.web.port   = 3000;
config.site.gearHome = process.env.HOME;

config.site.env   = "development";
config.site.theme = "default";

// OpenShift settings.
if (typeof(process.env.OPENSHIFT_INTERNAL_IP) != "undefined")
{
  config.web.ip   = process.env.OPENSHIFT_INTERNAL_IP;
  config.web.port = process.env.OPENSHIFT_INTERNAL_PORT;
  config.site.gearHome = process.env.OPENSHIFT_HOMEDIR;
}

config.views  = __dirname + '/themes/' + config.site.theme + "/views";
config.public = __dirname + '/themes/' + config.site.theme + "/public";

module.exports = config;
