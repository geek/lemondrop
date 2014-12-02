// Load modules

var ChildProcess = require('child_process');
var Code = require('code');
var Hapi = require('hapi');
var Lab = require('lab');
var LemonDrop = require('../');


// Test shortcuts

var lab = exports.lab = Lab.script();
var describe = lab.describe;
var it = lab.it;
var expect = Code.expect;


describe('Lemon Drop', function () {

    it('can be registered with hapi', function (done) {

        var server = new Hapi.Server();
        server.pack.register({ plugin: LemonDrop }, function (err) {

            expect(err).to.not.exist();
            done();
        });
    });

    it('runs gcore only once when hapi responds with a 503 multiple times', function (done) {

        var currentExec = ChildProcess.exec;
        var dropCount = 0;
        var server = new Hapi.Server();

        server.route({ method: 'get', path: '/', handler: function (request, reply) {

            reply(Hapi.Boom.serverTimeout());
        }});

        ChildProcess.exec = function (command, options, callback) {

            expect(command).to.equal('ulimit -c unlimited; gcore ' + process.pid);
            dropCount++;
            callback();
        };

        server.pack.register({ plugin: LemonDrop }, function (err) {

            expect(err).to.not.exist();
            LemonDrop.isDropped = false;

            server.inject({ method: 'get', url: '/' }, function (res) {

                expect(res.statusCode).to.equal(503);
                server.inject({ method: 'get', url: '/' }, function (res) {

                    ChildProcess.exec = currentExec;
                    expect(res.statusCode).to.equal(503);
                    expect(dropCount).to.equal(1);
                    done();
                });
            });
        });
    });

    it('runs gcore in location of options.path', function (done) {

        var currentExec = ChildProcess.exec;
        var dropCount = 0;
        var server = new Hapi.Server();

        server.route({ method: 'get', path: '/', handler: function (request, reply) {

            reply(Hapi.Boom.serverTimeout());
        }});

        ChildProcess.exec = function (command, options, callback) {

            expect(command).to.equal('ulimit -c unlimited; gcore ' + process.pid);
            dropCount++;
            callback();
        };

        server.pack.register({ plugin: LemonDrop, options: { path: '/tmp/test' } }, function (err) {

            expect(err).to.not.exist();
            LemonDrop.isDropped = false;
            var currentConsole = console.log;
            console.log = function (message) {

                if (message.indexOf('Dropping core') !== -1) {
                    expect(message.indexOf('/tmp/test')).not.to.equal(-1);
                    console.log = currentConsole;
                }
            };

            server.inject({ method: 'get', url: '/' }, function (res) {

                expect(res.statusCode).to.equal(503);
                server.inject({ method: 'get', url: '/' }, function (res) {

                    ChildProcess.exec = currentExec;
                    expect(res.statusCode).to.equal(503);
                    expect(dropCount).to.equal(1);
                    done();
                });
            });
        });
    });

    it('won\'t run gcore when the response status isn\'t 503', function (done) {

        var currentExec = ChildProcess.exec;
        var dropCount = 0;
        var server = new Hapi.Server();

        server.route({ method: 'get', path: '/', handler: function (request, reply) {

            reply(Hapi.Boom.serverTimeout());
        }});

        server.route({ method: 'get', path: '/ok', handler: function (request, reply) {

            reply('ok');
        }});

        ChildProcess.exec = function (command, options, callback) {

            expect(command).to.equal('ulimit -c unlimited; gcore ' + process.pid);
            dropCount++;
            callback();
        };

        server.pack.register({ plugin: LemonDrop }, function (err) {

            expect(err).to.not.exist();
            LemonDrop.isDropped = false;

            server.inject({ method: 'get', url: '/ok' }, function (res) {

                expect(res.statusCode).to.equal(200);

                server.inject({ method: 'get', url: '/' }, function (res) {

                    expect(res.statusCode).to.equal(503);

                    server.inject({ method: 'get', url: '/ok' }, function (res) {

                        ChildProcess.exec = currentExec;
                        expect(res.statusCode).to.equal(200);
                        expect(dropCount).to.equal(1);
                        done();
                    });
                });
            });
        });
    });

    it('logs errors trying to exec gcore', function (done) {

        var currentExec = ChildProcess.exec;
        var currentErr = console.error;
        var server = new Hapi.Server();

        server.route({ method: 'get', path: '/', handler: function (request, reply) {

            reply(Hapi.Boom.serverTimeout());
        }});

        ChildProcess.exec = function (command, options, callback) {

            expect(command).to.equal('ulimit -c unlimited; gcore ' + process.pid);
            callback(new Error('my error'));
        };

        server.pack.register({ plugin: LemonDrop }, function (err) {

            expect(err).to.not.exist();
            LemonDrop.isDropped = false;

            server.inject({ method: 'get', url: '/' }, function (res) {

                expect(res.statusCode).to.equal(503);
            });
        });

        console.error = function (err) {

            expect(err.message).to.equal('my error');
            console.error = currentErr;
            ChildProcess.exec = currentExec;
            done();
        };
    });

    it('logs errors gcore passes to stderr', function (done) {

        var currentExec = ChildProcess.exec;
        var currentErr = console.error;
        var server = new Hapi.Server();

        server.route({ method: 'get', path: '/', handler: function (request, reply) {

            reply(Hapi.Boom.serverTimeout());
        }});

        ChildProcess.exec = function (command, options, callback) {

            expect(command).to.equal('ulimit -c unlimited; gcore ' + process.pid);
            callback(null, null, new Buffer('my error'));
        };

        server.pack.register({ plugin: LemonDrop }, function (err) {

            expect(err).to.not.exist();
            LemonDrop.isDropped = false;

            server.inject({ method: 'get', url: '/' }, function (res) {

                expect(res.statusCode).to.equal(503);
            });
        });

        console.error = function (err) {

            expect(err.toString()).to.equal('my error');
            console.error = currentErr;
            ChildProcess.exec = currentExec;
            done();
        };
    });

    it('logs response from executing gcore', function (done) {

        var currentExec = ChildProcess.exec;
        var currentLog = console.log;
        var server = new Hapi.Server();

        server.route({ method: 'get', path: '/', handler: function (request, reply) {

            reply(Hapi.Boom.serverTimeout());
        }});

        ChildProcess.exec = function (command, options, callback) {

            expect(command).to.equal('ulimit -c unlimited; gcore ' + process.pid);
            callback(null, new Buffer('my result'), null);
        };

        server.pack.register({ plugin: LemonDrop }, function (err) {

            expect(err).to.not.exist();
            LemonDrop.isDropped = false;

            server.inject({ method: 'get', url: '/' }, function (res) {

                expect(res.statusCode).to.equal(503);
            });
        });

        console.log = function (msg) {

            //expect(msg.toString()).to.equal('my result');
            console.log = currentLog;
            ChildProcess.exec = currentExec;
            done();
        };
    });
});