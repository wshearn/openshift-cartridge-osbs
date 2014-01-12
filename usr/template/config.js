var config = {}

config.web  = {};
config.site = {};

// IP:Port to listen on
config.web.host      = "localhost";
config.web.port      = 3000;
config.site.gearHome = process.env.HOME + "/osbsTest";

config.site.env   = "development";
config.site.theme = "default";

config.site.on_openshift = false;

// OpenShift settings.
if (typeof(process.env.OPENSHIFT_OSBS_IP) != "undefined")
{
  config.web.host          = process.env.OPENSHIFT_OSBS_IP;
  config.web.port          = process.env.OPENSHIFT_OSBS_PORT;
  config.site.gearHome     = process.env.OPENSHIFT_HOMEDIR;
  config.site.on_openshift = true;
}

module.exports = config;
