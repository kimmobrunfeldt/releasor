#!/usr/bin/env node

var path = require('path');
var fs = require('fs');
var _ = require('lodash');
var Promise = require('bluebird');
Promise.longStackTraces();
var Mustache = require('mustache');
var utils = require('./utils');
var log = utils.log;
var cli = require('./cli');
var getTasks = require('./tasks');

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

    if (opts.npmUserConfig) {
        // Modify path to absolute path
        opts.npmUserConfig = path.resolve(opts.npmUserConfig);
    }

    if (opts.directory) {
        try {
            process.chdir(opts.directory);
            opts.directory = path.basename(opts.directory);
        } catch (e) {
            console.error('Could not find directory', opts.directory);
            process.exit(1);
        }
    } else {
        opts.directory = path.basename(process.cwd());
    }

    var privateModule = JSON.parse(fs.readFileSync('./package.json')).private;
    if (privateModule) {
        console.error('Not releasing module which defines "private": true in package.json.');
        console.error('Release stopped.');
        process.exit(2);
    }

    // Will be set later
    var newVersion;

    tasks.gitBranchName()
    .then(function(stdout) {
        if (!opts.dryRun && opts.verifyBranch && stdout.trim().toLowerCase() !== 'master') {
            throw new Error('You should be in master branch before running the script!');
        }

        return printCommitMessagesSinceLastTag(tasks);
    })
    .then(function() {
        return tasks.bumpVersion(opts.bump);
    })
    .then(function(version) {
        newVersion = version;

        return tasks.gitAdd(['package.json']);
    })
    .then(function() {
        var message = Mustache.render(opts.message, {
            version: newVersion,
            directory: opts.directory
        });
        return tasks.gitCommit(message);
    })
    .then(function() {
        var tag = Mustache.render(opts.tag, {
            version: newVersion,
            directory: opts.directory
        });
        return tasks.gitTag(tag);
    })
    .then(tasks.gitPushTag)  // Takes tag as a parameter
    .then(tasks.npmPublish.bind(this, opts.npmUserConfig))
    .then(tasks.gitPush)
    .then(function() {
        console.log('');
        log('Release successfully done!');
    })
    .catch(function(err) {
        console.error('\nReleasing failed!');
        console.error(err);
        console.error(err.stack);
        process.exit(2);
    });
}

function printCommitMessagesSinceLastTag(tasks) {
    return tasks.gitLatestTag()
    .then(function(latestTag) {
        log('Commits since latest tag', latestTag + ':\n');

        return latestTag;
    })
    .then(tasks.gitCommitMessagesSinceTag)
    .then(function(messagesList) {
        if (!_.isEmpty(messagesList)) {
            console.log(prefixList(messagesList, '* '));
        } else {
            console.log('No commits found');
        }

        console.log('');
    });
}

// prefixList(['a', 'b'], '* ') ->
// * a
// * b
function prefixList(list, prefix) {
    return prefix + list.join('\n' + prefix);
}

main();
