#!/usr/bin/env node

var _ = require('lodash');
var yargs = require('yargs');

// Message templates use https://github.com/janl/mustache.js
var defaultOpts = {
    message: 'Release {{ version }}',
    tag: '{{ version }}',
    bump: 'patch',

    // If true, don't execute anything, just tell what would have been done
    dryRun: false,

    // If true, don't push commits/tags or release to npm
    release: true,

    // If true, don't verify that branch is master
    verifyBranch: true
};

function getOpts() {
    var userOpts = getUserOpts();
    var opts = _.merge(defaultOpts, userOpts);
    validateOpts(opts);
    return opts;
}

function getUserOpts() {
    yargs
    .usage('Usage: releasor [options]')
    .example('releasor')
    .example('releasor --bump minor')
    .example('releasor --dry-run')
    .example('releasor --no-release --bump major')
    .example('releasor --verify-branch false')
    .example('releasor --no-verify-branch')
    .option('bump', {
        describe: 'Bump type. Valid values patch, minor, major',
        default: defaultOpts.bump,
        type: 'string'
    })
    .option('dry-run', {
        describe: 'When set, dry run is done. No state changing commands are' +
                  ' executed. Some commands, such as git log, are executed.',
        default: defaultOpts.dryRun,
        type: 'boolean'
    })
    .option('release', {
        describe: 'When set to false, only commands which modify local environment will be' +
                  ' run. Nothing will be sent to remote environments' +
                  ' such as git or NPM. This can be used to test what the' +
                  ' script does. "--release false" is same as "--no-release"',
        default: defaultOpts.release,
        type: 'boolean'
    })
    .option('verify-branch', {
        describe: 'When set to false, branch will be not verified to be master' +
                  ' "--verify-branch false" is same as "--no-verify-branch"',
        default: defaultOpts.verifyBranch,
        type: 'boolean'
    })
    .option('m', {
        alias: 'message',
        describe: 'Message for the new release. Used in git commit.' +
                  'Default: "Release {{ version }}".' +
                  ' {{ version }} will be replaced with the new version.' +
                  ' {{ directory }} is also available.',
        default: defaultOpts.message,
        type: 'string'
    })
    .option('t', {
        alias: 'tag',
        describe: 'Format for the new git tag. Default: "{{ version }}"' +
                  ' {{ version }} will be replaced with the new version.',
        default: defaultOpts.tag,
        type: 'string'
    })
    .option('npm-user-config', {
        describe: 'Specify custom .npmrc to be used with npm commands. Optional.',
        type: 'string'
    })
    .option('directory', {
        describe: 'Specify a directory where the node module to be released is' +
                  ' located. Default: current directory',
        type: 'string'
    })
    .option('tag', {
        describe: 'Tag format. Default: "{{ version }}".' +
                  ' {{ directory }} is also available.',
        type: 'string',
        default: defaultOpts.tag,
    })
    .help('h')
    .alias('h', 'help')
    .alias('v', 'version')
    .version(require('../package.json').version)
    .argv;

    return yargs.argv;
}

function validateOpts(opts) {
    if (!_.contains(['major', 'minor', 'patch'], opts.bump)) {
        console.error('Error:', opts.bump, 'is not a valid bump type');
        process.exit(1);
    }
}

module.exports = {
    defaultOpts: defaultOpts,
    getOpts: getOpts
};
