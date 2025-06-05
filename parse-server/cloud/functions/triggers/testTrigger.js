/* global Parse */

const { testTrigger } = require('./shared');

// Register the testTrigger function
Parse.Cloud.define('testTrigger', testTrigger);