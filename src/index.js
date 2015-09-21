#!/usr/bin/env node

var fs = require('fs');
var Mustache = require('mustache');
var utils = require('./utils');
var log = utils.log;
var cli = require('./cli');
var getTasks = require('./tasks').getTasks;

function main() {
    // Ensure that we are the directory is a valid npm project
    var stats = fs.statSync('./package.json');
    if (!stats.isFile()) {
        throw new Error('Unable to locate ./package.json!');
    }

    var opts = cli.getOpts();
    var tasks = getTasks(opts);

    if (opts.dryRun) {
        log('Dry run\n');
    }

    // Will be set later
    var newVersion;

    tasks.gitBranchName()
    .then(function(stdout) {
        var verifyBranch = !opts.noBranchVerify;
        if (verifyBranch && stdout.trim().toLowerCase() !== 'master') {
            throw new Error('You should be in master branch before running the script!');
        }

        return tasks.bumpVersion(opts.bump);
    })
    .then(function(version) {
        newVersion = version;

        return tasks.gitAdd(['package.json']);
    })
    .then(function() {
        var message = Mustache.render(opts.message, {version: newVersion});
        return tasks.gitCommit(message);
    })
    .then(function() {
        var tag = Mustache.render(opts.tag, {version: newVersion});
        return tasks.gitTag(tag);
    })
    .then(tasks.gitPushTag)  // Takes tag as a parameter
    .then(tasks.npmPublish)
    .then(tasks.gitPush)
    .then(tasks.gitLatestTag)
    .then(function(latestTag) {
        log('Commits since tag', latestTag + ':');
        return latestTag;
    })
    .then(tasks.commitMessagesSinceTag)  // Takes tag as a parameter
    .then(function(messagesList) {
        console.log(formatList(messagesList, '*'));

        console.log('');
        log('Release successfully done!');
    })
    .catch(function(err) {
        console.error('\nReleasing failed!');
        console.trace(err);
        process.exit(2);
    });
}

// formatList(['a', 'b'], '* ') ->
// * a
// * b
function formatList(list, prefix) {
    return prefix + list.join('\n' + prefix);
}

main();
