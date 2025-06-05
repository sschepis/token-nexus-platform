/* eslint-disable no-console */
const { execSync } = require('child_process');
const path = require('path');

// Install required dependencies
const dependencies = ['puppeteer', 'pixelmatch', 'pngjs', 'express'];

console.log('Installing visual testing dependencies...');
try {
  execSync(`npm install ${dependencies.join(' ')}`, {
    cwd: path.resolve(__dirname, '..'),
    stdio: 'inherit',
  });
} catch (error) {
  console.error('Failed to install dependencies:', error);
  process.exit(1);
}

// Create required directories
const directories = ['test/visual/baselines', 'test/visual/diffs'];

console.log('Creating required directories...');
const fs = require('fs');

directories.forEach(dir => {
  const dirPath = path.resolve(__dirname, '..', dir);

  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
});

// Update Parse Server schema
console.log('Updating Parse Server schema...');
const Parse = require('parse/node');
const {
  VisualBaseline,
  VisualDiff,
  VisualTestRun,
  OrganizationFields,
} = require('../cloud/schema/visualTesting');

async function updateSchema() {
  try {
    const schema = new Parse.Schema('VisualBaseline');

    await schema.save(VisualBaseline);

    const diffSchema = new Parse.Schema('VisualDiff');

    await diffSchema.save(VisualDiff);

    const testRunSchema = new Parse.Schema('VisualTestRun');

    await testRunSchema.save(VisualTestRun);

    // Update Organization class
    const orgSchema = new Parse.Schema('Organization');

    await orgSchema.updateFields(OrganizationFields);

    console.log('Schema updated successfully');
  } catch (error) {
    console.error('Failed to update schema:', error);
    process.exit(1);
  }
}

// Register cloud functions and API routes
console.log('Registering cloud functions and API routes...');
try {
  // Copy visual testing functions to cloud directory
  const functionsDir = path.resolve(__dirname, '..', 'cloud', 'functions');

  fs.copyFileSync(
    path.resolve(functionsDir, 'visualTesting.js'),
    path.resolve(functionsDir, 'visualTestingApi.js')
  );

  // Update main cloud file
  const mainCloudPath = path.resolve(__dirname, '..', 'cloud', 'main.js');
  let mainCloud = fs.readFileSync(mainCloudPath, 'utf8');

  // Add visual testing imports if they don't exist
  if (!mainCloud.includes('visualTesting')) {
    mainCloud = `require('./functions/visualTesting');\nrequire('./functions/visualTestingApi');\n${mainCloud}`;
    fs.writeFileSync(mainCloudPath, mainCloud);
  }

  console.log('Cloud functions registered successfully');
} catch (error) {
  console.error('Failed to register cloud functions:', error);
  process.exit(1);
}

// Run schema update
updateSchema()
  .then(() => {
    console.log('Visual testing setup completed successfully');
  })
  .catch(error => {
    console.error('Setup failed:', error);
    process.exit(1);
  });
