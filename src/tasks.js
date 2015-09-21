var fs = require('fs');
var _ = require('lodash');
var utils = require('./utils.js');
var log = utils.log;

var tasks = {
    bumpVersion: bumpVersion,
    gitAdd: gitAdd,
    gitCommit: gitCommit,
    gitTag: gitTag,
    gitPush: gitPush,
    gitPushTag: gitPushTag,
    npmPublish: npmPublish,
    gitBranchName: gitBranchName
};

// Tasks which only change the local environment, use a whitelist instead of
// black list to be sure that the no-release switch won't outdate.
var localTasks = [
    'bumpVersion',
    'gitAdd',
    'gitCommit',
    'gitBranchName'
];

// Make sure that run is not exeuted when dry-run switch is set.
var run;
function getTasks(opts) {
    var safeTasks = {};

    _.each(tasks, function(taskFunc, funcName) {
        var isLocalTask = _.contains(localTasks, funcName);
        if (opts.noRelease && !isLocalTask) {
            safeTasks[funcName] = function() {
                log('Skip', funcName, 'task');
            };
        } else {
            safeTasks[funcName] = taskFunc;
        }
    });

    if (opts.dryRun) {
        run = function noOp() {};
    } else {
        run = utils.run;
    }

    return safeTasks;
}

// Task functions

// Returns the new version
function bumpVersion(bump) {
    log('Bump version number');
    return run('npm --no-git-tag-version version ' + bump)
    .then(function getNewVersion() {
        var newVersion = JSON.parse(fs.readFileSync('./package.json')).version;
        if (!newVersion) {
            throw new Error('Error when detecting new version.');
        }

        return newVersion;
    });
}

function gitAdd(files) {
    log('Staged ' + files.length + ' files');
    return run('git add ' + files.join(' '));
}

function gitCommit(message) {
    log('Commit files')
    return run('git commit -m "' + message + '"');
}

function gitTag(name) {
    log('Created a new git tag: ' + name);
    return run('git tag ' + name)
    .then(function() {
        return name;
    });
}

function gitPush() {
    log('Push to remote');
    return run('git push');
}

function gitPushTag(tagName) {
    log('Push created git tag to remote');
    return run('git push origin ' + tagName);
}

function npmPublish() {
    log('Publish to npm');
    return run('npm publish');
}

function gitBranchName() {
    return run('git rev-parse --abbrev-ref HEAD');
}

module.exports = getTasks;
