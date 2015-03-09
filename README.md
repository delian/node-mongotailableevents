# Module for creating event bus interface based on MongoDB tailable cursors

The idea behind this module is to create EventEmitter like interface,
which uses MongoDB capped collections and tailable cursors as an internal messaging bus.
This model has a lot of advantages, especially if you already use MongoDB in your project.

The advantages are:

***You don't have to exchange the event emitter object*** between different pages or even different processes (forked, clustered, living on separate machines).
As long as you use the same mongoUrl and capped collection name, you can exchange information.
This way you can even create applications that runs on a different hardware and they may exchanging events and data as if they are the same application!
Also your events are stored in a collection and could be used as a transaction log latley (mongodb's own transaction log is implemented with capped collections).

It simplifies an application development very much.

## Installation

To install the module run the following command:

    npm install node-mongotailableevents

## Short

It is easy to use that module. Look at the following example:

    var ev = require('node-mongotailableevents');
    
    var e = ev( { ...options ... }, callback );
    
    e.on('event',callback);
    
    e.emit('event',data);
    

## Initialization and options

The following options can be used with the module

* *mongoUrl* (default mongodb://127.0.0.1/test) - the URL to the mongo database
* *mongoOptions* (default none) - Specific options to be used for the connection to the mongo database
* *name* (default tailedEvents) - the name of the capped collection that will be created if it does not exists
* *size* (default 1000000) - the maximum size of the capped collection (when reached, the oldest records will be automatically removed)
* *max* (default 1000) - the maximum size in amount of records for the capped collection

You can call and create a new event emitter instance without options:

    var ev = require('node-mongotailableevents');
    var e = ev();

Or you can call and create a event emitter instance with options:

    var ev = require('node-mongotailableevents');
    var e = ev({
       mongoUrl: 'mongodb://127.0.0.1/mydb',
       name: 'myEventCollection'
    });

Or you can call and create a event emitter instance with options and callback, which will be called when the collection is created successfuly:

    var ev = require('node-mongotailableevents');
    ev({
       mongoUrl: 'mongodb://127.0.0.1/mydb',
       name: 'myEventCollection'
    }, function(err, e) {
        console.log('EventEmitter',e);
    });

Or you can call and create event emitter with just callback (and default options):

    ev(function(err, e) {
        console.log('EventEmitter',e);
    });

## Usage

This module inherits EventEmitter, so you can use all of the EventEmitter methods.
Example:

    ev(function(err, e) {
        if (err) throw err;
        
        e.on('myevent',function(data) {
            console.log('We have received',data);
        });
        
        e.emit('myevent','my data');
    });

*The best feature* is that you can exchange events between different pages or processes, without the need of exchange in advance of the eventEmitter object instance or without any complex configuration, as long as both pages processes uses the same mongodb database (but it could be a different replica servers) and the same "name" (the name of the capped collection).
This way you can create massive clusters and messaging bus distributed among multiple machines without a need of any separate messaging system and its configuration.

Do a simple example - start two separate node processes with the following code, and see what the results are:

    var ev = require('node-mongotailableevents');
    ev(function(err, e) {
        if (err) throw err;
        
        e.on('myevent',function(data) {
            console.log('We have received',data);
        });
        
        setInterval(function() {
            e.emit('myevent','my data'+parseInt(Math.random()*1000000));
        },5000);
    });

You shall see on both of the outputs both of the messages received.
