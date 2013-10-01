var MongoClient = require('mongodb').MongoClient;
var mongoUrl = "mongodb://" + SCMS.config.db.host + ":" +
                SCMS.config.db.port + "/" + SCMS.config.db.dbname;
var fs = require('fs');

var collectionName;

Mongo = function(name, createDatabase){
  collectionName = name;
  if (createDatabase == true)
  {
    MongoClient.connect
    (
      mongoUrl,
      function(err, db) {
        if(err) return console.dir(err);
        db.createCollection(collectionName, {w:1}, function(err, collection) {});
      }
    );
  }
}

Mongo.prototype.getCollection = function(callback) {
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

Mongo.prototype.findAll = function(callback) {
  this.getCollection( function searchMongo(collection) {
    collection.find({}).toArray(function(err, results){
      callback( results );
    });
  });
};

Mongo.prototype.findOne = function (keyValue, callback) {
  this.getCollection( function searchMongo(collection) {
      collection.findOne(keyValue, function (err, item) {
        callback( item );
      });
    }
  );
}

Mongo.prototype.count = function(callback) {
  this.getCollection( function getCollectionLength(collection)
  {
    collection.find({}).count(function (e, count)
    {
      callback ( count );
    });
  });
};

exports.Mongo = Mongo;
