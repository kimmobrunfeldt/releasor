var Promise = require('bluebird');
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
    gitBranchName: gitBranchName,
    gitCommitMessagesSinceTag: gitCommitMessagesSinceTag,
    gitLatestTag: gitLatestTag
};

// Tasks which only change the local environment, use a whitelist instead of
// black list to be sure that the no-release switch won't outdate.
var localTasks = [
    'bumpVersion',
    'gitAdd',
    'gitCommit',
    'gitTag',
    'gitBranchName',
    'gitCommitMessagesSinceTag',
    'gitLatestTag'
];

// Make sure that run is not exeuted when dry-run switch is set.
var run;
function getTasks(opts) {
    var safeTasks = {};

    _.each(tasks, function(taskFunc, funcName) {
        var isLocalTask = _.contains(localTasks, funcName);
        if (!opts.release && !isLocalTask) {
            safeTasks[funcName] = function() {
                log('Skip', funcName, 'task');
            };
        } else {
            safeTasks[funcName] = taskFunc;
        }
    });

    if (opts.dryRun) {
        run = function noOp() { return Promise.resolve() };
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

function npmPublish(npmUserConfig) {
    log('Publish to npm');
    var command = 'npm';

    if (npmUserConfig) {
        command += ' --userconfig=' + npmUserConfig;
    }
    command += ' publish';

    return run(command);
}

// WARNING: This task does not care of dry-run switch
function gitBranchName() {
    return utils.run('git rev-parse --abbrev-ref HEAD', {silent: true});
}

// WARNING: This task does not care of dry-run switch
function gitCommitMessagesSinceTag(tag) {
    var command = 'git log --pretty="format:%h %s" ' + tag + '..HEAD';
    return utils.run(command, {silent: true})
    .then(function(stdout) {
        var trimmed = stdout.trim();
        if (!trimmed) {
            return [];
        }

        var lines = trimmed.split('\n').map(function(line) {
            return line.trim();
        });

        return lines;
    });
}

// Returns latest tag. If no tags are created, returns one of root commits
// WARNING: This task does not care of dry-run switch
function gitLatestTag() {
    var command = 'git describe --tags --abbrev=0';
    return utils.run(command, {silent: true})
    .then(function(stdout) {
        if (!stdout) {
            var err = new Error('Unexpected tag returned: ' + stdout);
            err.recoverable = false;
            throw err;
        }

        return stdout.trim();
    })
    .catch(function(err) {
        // Needs to be explicitly checked against false, because by default
        // this field is undefined
        if (!err.recoverable === false) {
            throw err;
        }

        log('No tags found, trying to get one of root commits');
        return _gitOneOfRootCommits();
    });
}

// WARNING: This task does not care of dry-run switch
function _gitOneOfRootCommits() {
    return utils.run('git rev-list HEAD', {silent: true})
    .then(function(stdout) {
        if (!stdout) {
            throw new Error('No commit history found.');
        }

        return _.last(stdout.trim().split('\n')).trim();
    });
}

module.exports = getTasks;
