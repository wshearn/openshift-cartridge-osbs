/*
 * AboutMe: Back end code for the about me page
 * Right now it only handles import jobs from json
 * TODO: Move to MongoDB
 *
 */
var jobCounter = 1;

AboutMe = function(){};

AboutMe.prototype.jobHistory = [];

AboutMe.prototype.findAll = function(callback) {
  callback( null, this.jobHistory )
};

AboutMe.prototype.parseJobs = function(jobs, callback) {
  var job = null;

  if( typeof(jobs.jobs.length)=="undefined")
    jobs.jobs = [jobs.jobs];

  for( var i =0;i< jobs.jobs.length;i++ ) {
    job = jobs.jobs[i];
    job._id = jobCounter++;

    if( job.responsibilities === undefined )
      job.responsibilities = [];

    this.jobHistory[this.jobHistory.length]= job;
  }
  callback(null, jobs);
};

var jobsJSON = require ('../database/about')
new AboutMe().parseJobs(jobsJSON, function(error, jobs){});

exports.AboutMe = AboutMe;