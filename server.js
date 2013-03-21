#!/bin/env node
//  OpenShift sample Node application
var express = require('express');
var fs = require('fs');
var http = require('http');
var mongodb = require('mongodb');
var mongoHost = "dbh74.mongolab.com";
var mongoPort = 27747;
var server = new mongodb.Server(mongoHost, mongoPort, {});
var deckCollection = null;
var cardCollection = null;
new mongodb.Db('mtg', server, {}).open(function(error, client) {
    if (error)
        throw error;

    client.authenticate("mtg", "mtg");
    deckCollection = new mongodb.Collection(client, 'decks');
    cardCollection = new mongodb.Collection(client, 'cardInfo');
    deckCollection.find({}, {limit: 10}).toArray(function(err, docs) {
        console.dir(docs);
    });
});

var neo4j = require('neo4j');
var db = new neo4j.GraphDatabase('http://5c7d14ae5:579e8cded@2645f4a7d.hosted.neo4j.org:7343');

var httpCallback = function(res) {
    //console.log("response = "+JSON.stringify(response));
    var str = '';

    //another chunk of data has been recieved, so append it to `str`
    response.on('data', function(chunk) {
        str += chunk;
    });

    //the whole response has been recieved, so we just print it out here
    response.on('end', function(res) {
        console.log("httpCallback end: " + str);
//        var data = JSON.parse(str);
//        res.send("SOME DATA");
    });
}

/**
 *  Define the sample application.
 */
var SampleApp = function() {

    //  Scope.
    var self = this;


    /*  ================================================================  */
    /*  Helper functions.                                                 */
    /*  ================================================================  */

    /**
     *  Set up server IP address and port # using env variables/defaults.
     */
    self.setupVariables = function() {
        //  Set the environment variables we need.
        self.ipaddress = process.env.OPENSHIFT_INTERNAL_IP;
        self.port = process.env.OPENSHIFT_INTERNAL_PORT || 8080;

        if (typeof self.ipaddress === "undefined") {
            //  Log errors on OpenShift but continue w/ 127.0.0.1 - this
            //  allows us to run/test the app locally.
            console.warn('No OPENSHIFT_INTERNAL_IP var, using 127.0.0.1');
            self.ipaddress = "127.0.0.1";
        }
        ;
    };


    /**
     *  Populate the cache.
     */
    self.populateCache = function() {
        if (typeof self.zcache === "undefined") {
            self.zcache = {'index.html': ''};
        }

        //  Local cache for static content.
        self.zcache['index.html'] = fs.readFileSync('./index.html');
        self.zcache['decks.html'] = fs.readFileSync('./decks.html');
    };


    /**
     *  Retrieve entry (content) from cache.
     *  @param {string} key  Key identifying content to retrieve from cache.
     */
    self.cache_get = function(key) {
        return self.zcache[key];
    };


    /**
     *  terminator === the termination handler
     *  Terminate server on receipt of the specified signal.
     *  @param {string} sig  Signal to terminate on.
     */
    self.terminator = function(sig) {
        if (typeof sig === "string") {
            console.log('%s: Received %s - terminating sample app ...',
                    Date(Date.now()), sig);
            process.exit(1);
        }
        console.log('%s: Node server stopped.', Date(Date.now()));
    };


    /**
     *  Setup termination handlers (for exit and a list of signals).
     */
    self.setupTerminationHandlers = function() {
        //  Process on exit and signals.
        process.on('exit', function() {
            self.terminator();
        });

        // Removed 'SIGPIPE' from the list - bugz 852598.
        ['SIGHUP', 'SIGINT', 'SIGQUIT', 'SIGILL', 'SIGTRAP', 'SIGABRT',
            'SIGBUS', 'SIGFPE', 'SIGUSR1', 'SIGSEGV', 'SIGUSR2', 'SIGTERM'
        ].forEach(function(element, index, array) {
            process.on(element, function() {
                self.terminator(element);
            });
        });
    };


    self.createPostRoutes = function() {
        self.postRoutes = {};

        self.postRoutes['/deck/create'] = function(req, res) {
            console.log("saving deck: " + JSON.stringify(req.body));
            var data = req.body.data;
            deckCollection.insert(data, {}, function(input1) {
                res.send("Success creating deck");
            })

        };
    }

    /*  ================================================================  */
    /*  App server functions (main app logic here).                       */
    /*  ================================================================  */

    /**
     *  Create the routing table entries + handlers for the application.
     */
    self.createRoutes = function() {
        self.routes = {};

        self.routes['/decks/all'] = function(req, res) {
            deckCollection.find({}).toArray(function(err, docs) {
                res.send(docs);
            });
        };

        self.routes['/decks'] = function(req, res) {
            res.setHeader('Content-Type', 'text/html');
            res.send(self.cache_get('decks.html'));
        };

        self.routes["/deck/create"] = function(req, res) {
            console.log("get /deck/create called");
        };

        self.routes["/search"] = function(req, res) {
            var url = "http://gatherer.wizards.com/Handlers/InlineCardSearch.ashx";
            console.log("search called with params: " + encodeURIComponent(JSON.stringify(req.query)));
            var options = {
                host: 'gatherer.wizards.com',
                path: "/Handlers/InlineCardSearch.ashx?nameFragment=" + req.query.nameFragment
            };

            var proxy_request = http.request(options);
            proxy_request.addListener('response', function(proxy_response) {
                proxy_response.addListener('data', function(chunk) {
                    res.write(chunk, 'binary');
                });
                proxy_response.addListener('end', function() {
                    res.end();
                });
                res.writeHead(proxy_response.statusCode, proxy_response.headers);
            });
            req.addListener('data', function(chunk) {
                proxy_request.write(chunk, 'binary');
            });
            req.addListener('end', function() {
                proxy_request.end();
            });

        };

        self.routes["/card/:name/related"] = function(req, res) {
            var name = req.params.name.toUpperCase();
            console.log("Looking for cards related to " + name);
            var query = [
                'START n=node(*)',
                'MATCH n-[r]-x',
                'WHERE has(n.name) AND n.name = "' + name + '" AND r.count > 2',
                'RETURN r.count,x.name'
            ].join('\n');

            try {
                db.query(query, {}, function(err, results) {
                    if (err) {
                        throw err;
                        res.send("Error");
                        return;
                    } else {
                        console.log("Results: " + results.length);
                        res.send(results);
                    }
                });
            } catch (err) {
                console.log("Error querying: err");
                res.send("Error");
            }
        };

        self.routes["/deck/:name"] = function(req, res) {
            var name = req.params.name;
            deckCollection.find({"name": name}).toArray(function(err, docs) {
                res.render('deck.jade', {deck: docs[0], name: name});
            });
        };

        self.routes["/deck/:name/print"] = function(req, res) {
            var name = req.params.name;
            deckCollection.find({"name": name}).toArray(function(err, docs) {
                res.render('printdeck.jade', {deck: docs[0], name: name});
            });
        };

        self.routes["/card/:name"] = function(req, res) {
            var name = req.params.name.toUpperCase();
            console.log("Looking for this card: " + name);

//            console.log("Before query");
            var nodeQuery = [
                'START n=node(*)',
                'WHERE has(n.name) and n.name = "' + name + '"',
                'return n'
            ].join('\n');
            try {
                db.query(nodeQuery, {}, function(err, cardResults) {
                    if (err) {
                        throw err;
                    } else {
                        if (cardResults.length <= 0) {
                            res.send("Could not find card");
                            return;
                        }
                        //console.log("card query results: " + JSON.stringify(cardResults));
                        var cardInfo = cardResults[0].n.data
//                        console.log("card info: " + JSON.stringify(cardInfo));
                        var query = [
                            'START n=node(*)',
                            'MATCH n-[r]-x',
                            'WHERE has(n.name) AND n.name = "' + name + '"',
                            'RETURN r.count,x.name',
                            'ORDER BY r.count DESC'
                        ].join('\n');

                        try {
                            db.query(query, {}, function(err, results) {
                                if (err)
                                    throw err;
                                //console.log("Results: " + results.length);


                                var imageName = "/mtgImages/" + name.replace(/ /g, '_') + ".jpg";

                                //console.log("Image name: " + imageName)
                                try {
                                    res.render('card.jade', {"nodes": results, "name": name, "cardInfo": cardInfo, "imageName": imageName});
                                } catch (err) {
                                    console.log("Error: " + err);
                                    res.send("Card info not uploaded");

                                }

                                //res.send(results);
                            });
                        } catch (err) {
                            console.log("Error querying: err");
                        }
                    }
                });
            } catch (err) {
                console.log("Node query error");
            }


        };
        self.routes['/'] = function(req, res) {
            res.setHeader('Content-Type', 'text/html');
            res.send(self.cache_get('index.html'));
        };

        self.routes['/deckbuilder'] = function(req, res) {
            res.setHeader('Content-Type', 'text/html');
            deckCollection.find({}).toArray(function(err, docs) {
                if (err) {
                    console.log("Error find decks: " + err);
                } else {
                    try {
                        res.render('deckbuilder.jade', {decks: docs});
                    } catch (err) {
                        console.log("Error rendering set page: " + err);
                    }
                }


            });

        };

        self.routes['/set/:name'] = function(req, res) {
            res.setHeader('Content-Type', 'text/html');
            console.log("Searching for cards in set: "+req.params.name);
            var searchObj = {"sets": {"$regex": req.params.name, "$options": "i"}}
            //var reg = new RegExp("'"+req.params.name+"'", "i");
//            var reg = /^ravnica/i
//            console.log("REGEX = "+JSON.stringify(reg));
//            var searchObj = {"sets": {"$regex" : reg}};
            console.log("Search object: "+JSON.stringify(searchObj));
            cardCollection.find(searchObj).toArray(function(err, docs) {
                if (err) {
                    console.log("Error finding cards in set: " + req.params.name);
                } else {
                    try {
                        console.log("Found "+docs.length+" cards");
                        res.render('set.jade', {name : req.params.name, cards: docs});
                    } catch (err) {
                        console.log("Error rendering set page: " + err);
                    }
                }
            });
            ;
        }
    };


    /**
     *  Initialize the server (express) and create the routes and register
     *  the handlers.
     */
    self.initializeServer = function() {

        self.createRoutes();
        self.createPostRoutes();

        //self.app = express.createServer(); remove depercated api
        self.app = express();
        self.app.use("/lib", express.static(__dirname + '/lib'));
        self.app.use("/js", express.static(__dirname + '/js'));
        self.app.use("/mtgImages", express.static(__dirname + '/mtgImages'));
        self.app.use("/css", express.static(__dirname + '/css'));
        self.app.use("/img", express.static(__dirname + '/img'));
        self.app.use(express.bodyParser());
        self.app.set('views', __dirname + '/views');
        //self.app.use(self.app.router);
        //  Add handlers for the app (from the routes).
        for (var p in self.postRoutes) {
            console.log("creating post route: " + p);
            self.app.post(p, self.postRoutes[p]);
        }
        for (var r in self.routes) {
            self.app.get(r, self.routes[r]);
        }

    };


    /**
     *  Initializes the sample application.
     */
    self.initialize = function() {
        self.setupVariables();
        self.populateCache();
        self.setupTerminationHandlers();

        // Create the express server and routes.
        self.initializeServer();
    };


    /**
     *  Start the server (starts up the sample application).
     */
    self.start = function() {
        //  Start the app on the specific interface (and port).
        self.app.listen(self.port, self.ipaddress, function() {
            console.log('%s: Node server started on %s:%d ...',
                    Date(Date.now()), self.ipaddress, self.port);
        });
    };

};   /*  Sample Application.  */



/**
 *  main():  Main code.
 */
var zapp = new SampleApp();
zapp.initialize();
zapp.start();

