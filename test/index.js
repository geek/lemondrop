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

            expect(command).to.equal('gcore ' + process.pid);
            dropCount++;
            callback();
        };

        server.pack.register({ plugin: LemonDrop }, function (err) {

            expect(err).to.not.exist();

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
});