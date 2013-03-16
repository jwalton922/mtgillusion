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
new mongodb.Db('mtg', server, {}).open(function(error, client) {
    if (error)
        throw error;
    deckCollection = new mongodb.Collection(client, 'decks');
    client.authenticate("mtg", "mtg");
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

        // Routes for /health, /asciimo and /
        self.routes['/health'] = function(req, res) {
            res.send('1');
        };

        self.routes['/asciimo'] = function(req, res) {
            var link = "http://i.imgur.com/kmbjB.png";
            res.send("<html><body><img src='" + link + "'></body></html>");
        };

        self.routes['/decks/all'] = function(req, res) {
            deckCollection.find({}).toArray(function(err, docs) {
                res.send(docs);
            });
        }

        self.routes['/decks'] = function(req, res) {
            res.setHeader('Content-Type', 'text/html');
            res.send(self.cache_get('decks.html'));
        }

        self.routes["/deck/create"] = function(req, res) {
            console.log("get /deck/create called");
        }

        self.routes["/search"] = function(req, res) {
            var url = "http://gatherer.wizards.com/Handlers/InlineCardSearch.ashx";
            console.log("search called with params: " + JSON.stringify(req.query));
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


//            console.log("Making request: " + JSON.stringify(options));
//            console.log("made a change");
//            http.request(options, httpCallback).end();
            //console.log("searching for: "+req.params["nameFragment"]);
//            $.get(url + "?nameFragment=" + req.params.nameFragment).success(function(xhr) {
//                res.send(xhr);
//            });
        }

        self.routes["/card/:name"] = function(req, res) {
            console.log("Looking for this card: " + req.params.name);

//            db.getIndexedNodes("name","name", req.params.name, function(err, node) {
//                if (err) {
//                    console.err('Error saving new node to database:', err);
//                } else {
//                    console.log('Node saved to database with id:', JSON.stringify(node));
//                    res.render('card.jade', {title: 'Card'});
//                }
//            });
            console.log("Before query");
            var nodeQuery = [
                'START n=node(*)',
                'WHERE has(n.name) and n.name = "' + req.params.name + '"',
                'return n'
            ].join('\n');
            try {
                db.query(nodeQuery, {}, function(err, cardResults) {
                    if (err) {
                        throw err;
                    } else {
                        if(cardResults.length <= 0){
                            res.send("Could not find card");
                        }
                        console.log("card query results: " + JSON.stringify(cardResults));
                        var cardInfo = cardResults[0].n.data
                        console.log("card info: " + JSON.stringify(cardInfo));
                        var query = [
                            'START n=node(*)',
                            'MATCH n-[r]-x',
                            'WHERE has(n.name) AND n.name = "' + req.params.name + '"',
                            'RETURN r.count,x.name'
                        ].join('\n');

                        try {
                            db.query(query, {}, function(err, results) {
                                if (err)
                                    throw err;
                                console.log("Results: " + results.length);

                                var done = false;
                                var imageName = "/mtgImages/" + req.params.name + ".jpg";
                                while (!done) {
                                    if (imageName.indexOf(" ") >= 0) {
                                        imageName = imageName.replace(" ", "_");
                                    } else {
                                        done = true;
                                    }
                                }
                                console.log("Image name: " + imageName)
                                try {
                                    res.render('card.jade', {"nodes": results, "name": req.params.name, "cardInfo": cardInfo, "imageName": imageName});
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


    };


    /**
     *  Initialize the server (express) and create the routes and register
     *  the handlers.
     */
    self.initializeServer = function() {

        self.createRoutes();
        self.createPostRoutes();
        self.app = express.createServer();
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

