/**
 * Created by delian on 3/8/15.
 */

var debug = require('debug')('mongotailableevents');
var mongoClient = require('mongodb').MongoClient;
var util = require('util');
var events = require('events');

function Tevents(config,callback) {
    if (!(this instanceof  Tevents)) return new Tevents(config,callback);

    var me = this;
    me.event = events.EventEmitter.call(this); // Init the superConstructor

    me.config = {
        name: 'tailedEvents',
        size: 100000000,
        max: 1000,
        mongoUrl: 'mongodb://127.0.0.1/test',
        mongoOptions: {}
    };

    me.col = null;
    var cb = function() {};

    if (typeof config == 'object') util._extend(me.config,config);
    if (typeof config == 'function') cb = config;
    if (typeof callback == 'object') util._extend(me.config,callback);
    if (typeof callback == 'function') cb = callback;

    mongoClient.connect(me.config.mongoUrl,me.config.mongoOptions,function(err,db) {
        if (err) {
            debug('Cannot connect to the mongodb %s',err);
            return cb(err);
        }
        me.db = db;

        debug('We have connected to %s',me.config.mongoUrl);

        db.createCollection(me.config.name,{
            capped: true,
            size: me.config.size,
            max: me.config.max
        },function(err,col) {
            if (err) {
                debug('Cannot create capped collection %s',err);
                return cb(err);
            }
            debug('We have created capped collection %s',me.config.name);
            var id = (new Date()).getTime()+".id."+parseInt(Math.random()*1000000);
            me.col = col;
            col.insert({ start: id },function(err) {
                if (err) throw err;
                var eventOff = true;
                var stream = col.find({},{
                    tailable: true,
                    awaitdata: true,
                    numberOfRetries: me.config.numberOfRetries||-1
                }).stream();
                debug('We have stream %s', stream);
                stream.on('data',function(doc) {
                    if (eventOff) {
                        if (doc.start == id) {
                            eventOff=false;
                            debug('We found our cursor');
                        }
                        return;
                    }
                    // Now we have received an Event Data. What shall we do?
                    if (!(doc.event && doc.data)) {
                        debug('We have received incorrectly formatted document %s, ignore it',doc);
                        return;
                    }
                    debug('We received data from the collection %s:%s, we will emit it',doc.event,doc.data);
                    me.emit2(doc.event,doc.data); // Super method
                });
            });

            cb(null,me);
        });
    });
    return me;
}

util.inherits(Tevents,events.EventEmitter);
Tevents.prototype.emit2 = Tevents.prototype.emit; // Preserve original emit

// Overwrite emit
Tevents.prototype.emit = function(event,data,cb) {
    if (!this.col) return debug('Cannot insert %s:%s because we have no collection yet',event,data);
    this.col.insert({ event: event, data: data },function(err,q) {
        debug('We have inserted for event %s data %s',event,data);
        if (typeof cb == 'function') cb(err,q);
    });
};

module.exports = Tevents;
