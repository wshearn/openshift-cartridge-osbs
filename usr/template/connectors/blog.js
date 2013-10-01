/*
 * Blog: Back end code for the about me page
 * Right now it only handles import posts from json
 * TODO: Move to MongoDB
 *
 */
var postCounter = 1;

var MongoClient = require('mongodb').MongoClient;
var ObjectID = require('mongodb').ObjectID;
var mongoUrl = "mongodb://" + SCMS.config.db.host + ":" +
                SCMS.config.db.port + "/" + SCMS.config.db.dbname;
var collectionName = "modules.blog.posts";

Blog = function()
{
  
  MongoClient.connect
  (
    mongoUrl,
    function(err, db) {
      if(err) return console.dir(err);
      db.createCollection(collectionName, {w:1}, function(err, collection) {});
    }
  );

};

Blog.prototype.getCollection = function(callback) {
  MongoClient.connect
  (
    mongoUrl,
    function(err, db) {
      if(err) return console.dir(err);

      var collection = db.collection(collectionName);
      callback( collection );
    }
  );
};

Blog.prototype.postHistory = [];

Blog.prototype.getTags = function() {
  var tags = [];
  for (var i = Blog.prototype.postHistory.length - 1; i >= 0; i--) {
    tags = SCMS.us.union(tags, Blog.prototype.postHistory[i]["tags"]);
  };

  return tags = SCMS.us.uniq(tags.sort(), false);
};

Blog.prototype.getLatest = function() {
  return this.postHistory[this.postHistory.length-1];
};

Blog.prototype.findByTag = function(tag) {
  tag = tag.split(".")[0];
  var posts = [];
  var tags = [];

  for (var i = Blog.prototype.postHistory.length - 1; i >= 0; i--) {
    tags = SCMS.us.union(tags, Blog.prototype.postHistory[i]["tags"]);
    if (SCMS.us.contains(Blog.prototype.postHistory[i]["tags"], tag))
      posts = SCMS.us.union(posts, Blog.prototype.postHistory[i])
  }

  tags = SCMS.us.uniq(tags.sort(), false);

  return [posts, tags];
};

Blog.prototype.getOldPosts = function(callback) {
  this.findAll( function getPosts (postArray) {
    console.log(postArray[0]);
    var posts = postArray.splice(postArray.length, 1);
    console.log(posts);
    callback( postArray );
    
  });

  
};

Blog.prototype.findAll = function(callback) {
  this.getCollection( function searchMongo(collection) {
    collection.find({}).toArray(function(err, results){
      callback( results );
    });
  });
};

Blog.prototype.findOne = function (keyValue, callback) {
  this.getCollection( function searchMongo(collection) {
      collection.findOne(keyValue, function (err, item) {
        callback( item );
      });
    }
  );
}

Blog.prototype.parsePosts = function(posts, callback) {
  var post = null;

  if( typeof(posts.posts.length)=="undefined")
    posts.posts = [posts.posts];

  for( var i=0; i < posts.posts.length; i++ ) {
    post = posts.posts[i];
    post._id = postCounter++;

    this.postHistory[this.postHistory.length] = post;
  }
  callback(null, posts);
};

Blog.prototype.save = function(posts, callback) {
  var sanePosts = []; SCMS.us.union(sanePosts, posts[0]);
  this.getCollection( function prepopulateDatabase (collection) {
    if( typeof(posts.length)=="undefined")
      posts = [posts];

    for (var i = posts[0].posts.length - 1; i >= 0; i--) {
      var stream = collection.find({_id: posts[0].posts[i]._id}).stream();
      var found = false;
      stream.on("data", function(item)
      {
        found = true;
      });
      if (!found)
      {
        collection.insert(posts[0].posts[i], {w:1}, function(err, result){});
      }
    };
  });
};

var postsJSON = require ('../database/blog')
new Blog().save(postsJSON, function(error, posts){});
new Blog().parsePosts(postsJSON, function(error, posts){});

exports.Blog = Blog;