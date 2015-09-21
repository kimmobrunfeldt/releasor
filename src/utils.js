var shell = require('shelljs');

var CONSOLE_PREFIX = '->';

function log(/* arguments */) {
    var args = Array.prototype.slice.call(arguments);
    console.log(CONSOLE_PREFIX, args.join(' '));
}

function run(command, opts) {
    return new Promise(function(resolve, reject) {
        var exec = shell.exec(command, opts);
        var success = exec.code === 0;

        if (success) {
            resolve(exec.output);
        } else {
            var errMsg = 'Error executing: `' + command + '`\nOutput:\n' + exec.output;
            var err = new Error(errMsg);
            reject(err);
        }
    });
}

module.exports = {
    log: log,
    run: run
};
