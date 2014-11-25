// Include modules

var ChildProcess = require('child_process');


// Declare internals

var internals = {
    isDropped: false
};

exports.register = function (pack, options, next) {

    pack.events.on('response', internals.response(pack));
	next();
};


exports.register.attributes = {
   pkg: require('../package.json')
};


internals.response = function (pack) {

    var responseHandler = function (request) {

        if (internals.isDropped) {
            pack.events.removeListener('response', responseHandler);
            return;
        }

        if (request.response.statusCode !== 503) {
            return;
        }

        internals.dropCore();
    };

    return responseHandler;
};


internals.dropCore = function () {

    internals.isDropped = true;
    var gcore = ChildProcess.exec('gcore ' + process.pid, {
        cwd: process.cwd()
    }, function (err, stdout, stderr) {

        if (err) {
            console.error(err);
        }
        else if (stderr) {
            console.error(stderr.toString());
        }
        else if (stdout) {
            console.log(stdout.toString());
        }
    });
};
