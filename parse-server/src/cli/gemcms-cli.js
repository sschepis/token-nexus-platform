#!/usr/bin/env node
/* eslint-disable no-console */
const { program } = require('commander');
const axios = require('axios');
const inquirer = require('inquirer');
const chalk = require('chalk');
const ora = require('ora');
const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');

// CLI version
program.version('1.0.0');

// Configuration management
let config = {
  apiKey: process.env.GEMCMS_API_KEY,
  baseURL: process.env.GEMCMS_API_URL || 'https://api.gemcms.com/v1',
};

const saveConfig = async newConfig => {
  const configPath = path.join(process.env.HOME, '.gemcmsrc');

  await fs.writeFile(configPath, JSON.stringify(newConfig, null, 2));
};

const loadConfig = async () => {
  try {
    const configPath = path.join(process.env.HOME, '.gemcmsrc');
    const content = await fs.readFile(configPath, 'utf8');

    config = { ...config, ...JSON.parse(content) };
  } catch (err) {
    // Config file doesn't exist yet
  }
};

// API client setup
const createClient = () => {
  if (!config.apiKey) {
    console.error(chalk.red('API key not configured. Run "gemcms configure" first.'));
    process.exit(1);
  }

  return axios.create({
    baseURL: config.baseURL,
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
  });
};

// Error handling
const handleError = (err, customMessage) => {
  if (axios.isAxiosError(err)) {
    const status = err.response?.status;
    const message = err.response?.data?.message || err.message;

    switch (status) {
      case 401:
        console.error(chalk.red('Authentication failed. Please check your API key.'));
        break;
      case 403:
        console.error(chalk.red('Permission denied. Please check your access rights.'));
        break;
      case 404:
        console.error(chalk.red('Resource not found.'));
        break;
      case 429:
        console.error(chalk.red('Rate limit exceeded. Please try again later.'));
        break;
      default:
        console.error(chalk.red(customMessage || 'Operation failed:'), message);
    }
  } else {
    console.error(chalk.red(customMessage || 'Operation failed:'), err.message);
  }
};

// Configure command
program
  .command('configure')
  .description('Configure CLI settings')
  .action(async () => {
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'apiKey',
        message: 'Enter your GemCMS API key:',
        validate: input => input.length > 0,
      },
      {
        type: 'input',
        name: 'baseURL',
        message: 'Enter API base URL (optional):',
        default: 'https://api.gemcms.com/v1',
      },
    ]);

    config = { ...config, ...answers };
    await saveConfig(config);
    console.log(chalk.green('Configuration saved successfully!'));
  });

// Project commands
program
  .command('create <name>')
  .description('Create a new GemCMS project')
  .option('-t, --template <template>', 'Template to use', 'default')
  .action(async (name, options) => {
    const spinner = ora('Creating project...').start();

    try {
      const client = createClient();

      await client.post('/projects', {
        name,
        template: options.template,
      });

      spinner.succeed(chalk.green(`Project ${name} created successfully!`));

      // Create project structure
      await fs.mkdir(name);
      await fs.mkdir(path.join(name, 'src'));
      await fs.mkdir(path.join(name, 'src', 'components'));
      await fs.mkdir(path.join(name, 'src', 'pages'));

      // Create package.json
      const packageJson = {
        name,
        version: '1.0.0',
        dependencies: {
          '@gemcms/sdk': 'latest',
        },
      };

      await fs.writeFile(path.join(name, 'package.json'), JSON.stringify(packageJson, null, 2));

      // Create config file
      const configFile = {
        apiKey: config.apiKey,
        environment: 'development',
      };

      await fs.writeFile(
        path.join(name, 'gemcms.config.json'),
        JSON.stringify(configFile, null, 2)
      );

      console.log(chalk.blue('\nNext steps:'));
      console.log(`  cd ${name}`);
      console.log('  npm install');
      console.log('  gemcms dev');
    } catch (err) {
      spinner.fail(chalk.red('Failed to create project'));
      handleError(err);
    }
  });

// Plugin commands
program
  .command('plugin')
  .description('Plugin management commands')
  .addCommand(
    program
      .command('install <name>')
      .description('Install a plugin')
      .action(async name => {
        const spinner = ora(`Installing plugin ${name}...`).start();

        try {
          const client = createClient();

          await client.post('/plugins/install', { name });
          spinner.succeed(chalk.green(`Plugin ${name} installed successfully!`));
        } catch (err) {
          spinner.fail();
          handleError(err, 'Failed to install plugin');
        }
      })
  )
  .addCommand(
    program
      .command('uninstall <name>')
      .description('Uninstall a plugin')
      .action(async name => {
        const spinner = ora(`Uninstalling plugin ${name}...`).start();

        try {
          const client = createClient();

          await client.post('/plugins/uninstall', { name });
          spinner.succeed(chalk.green(`Plugin ${name} uninstalled successfully!`));
        } catch (err) {
          spinner.fail();
          handleError(err, 'Failed to uninstall plugin');
        }
      })
  )
  .addCommand(
    program
      .command('list')
      .description('List installed plugins')
      .action(async () => {
        const spinner = ora('Fetching plugins...').start();

        try {
          const client = createClient();
          const response = await client.get('/plugins');

          spinner.stop();

          if (response.data.length === 0) {
            console.log(chalk.yellow('No plugins installed.'));

            return;
          }

          console.log(chalk.blue('\nInstalled plugins:'));
          response.data.forEach(plugin => {
            console.log(`  ${plugin.name} v${plugin.version}`);
            if (plugin.description) {
              console.log(`    ${chalk.gray(plugin.description)}`);
            }
          });
        } catch (err) {
          spinner.fail();
          handleError(err, 'Failed to list plugins');
        }
      })
  );

// Template commands
program
  .command('template')
  .description('Template management commands')
  .addCommand(
    program
      .command('create <name>')
      .description('Create a new template')
      .option('-d, --description <description>', 'Template description')
      .action(async (name, options) => {
        const spinner = ora(`Creating template ${name}...`).start();

        try {
          const client = createClient();

          await client.post('/templates', {
            name,
            description: options.description,
          });
          spinner.succeed(chalk.green(`Template ${name} created successfully!`));
        } catch (err) {
          spinner.fail();
          handleError(err, 'Failed to create template');
        }
      })
  )
  .addCommand(
    program
      .command('list')
      .description('List available templates')
      .action(async () => {
        const spinner = ora('Fetching templates...').start();

        try {
          const client = createClient();
          const response = await client.get('/templates');

          spinner.stop();

          if (response.data.length === 0) {
            console.log(chalk.yellow('No templates available.'));

            return;
          }

          console.log(chalk.blue('\nAvailable templates:'));
          response.data.forEach(template => {
            console.log(`  ${template.name}`);
            if (template.description) {
              console.log(`    ${chalk.gray(template.description)}`);
            }
          });
        } catch (err) {
          spinner.fail();
          handleError(err, 'Failed to list templates');
        }
      })
  );

// Organization commands
program
  .command('org')
  .description('Organization management commands')
  .addCommand(
    program
      .command('create <name>')
      .description('Create a new organization')
      .option('-d, --description <description>', 'Organization description')
      .action(async (name, options) => {
        const spinner = ora(`Creating organization ${name}...`).start();

        try {
          const client = createClient();

          await client.post('/organizations', {
            name,
            description: options.description,
          });
          spinner.succeed(chalk.green(`Organization ${name} created successfully!`));
        } catch (err) {
          spinner.fail();
          handleError(err, 'Failed to create organization');
        }
      })
  )
  .addCommand(
    program
      .command('list')
      .description('List organizations')
      .action(async () => {
        const spinner = ora('Fetching organizations...').start();

        try {
          const client = createClient();
          const response = await client.get('/organizations');

          spinner.stop();

          if (response.data.length === 0) {
            console.log(chalk.yellow('No organizations found.'));

            return;
          }

          console.log(chalk.blue('\nOrganizations:'));
          response.data.forEach(org => {
            console.log(`  ${org.name}`);
            if (org.description) {
              console.log(`    ${chalk.gray(org.description)}`);
            }
            console.log(`    ID: ${chalk.cyan(org.id)}`);
            console.log(`    Members: ${chalk.cyan(org.members.length)}`);
            console.log(`    Applications: ${chalk.cyan(org.stats.applications)}`);
            console.log();
          });
        } catch (err) {
          spinner.fail();
          handleError(err, 'Failed to list organizations');
        }
      })
  )
  .addCommand(
    program
      .command('invite <orgId> <email>')
      .description('Invite a user to an organization')
      .option('-r, --role <role>', 'User role (admin/member)', 'member')
      .action(async (orgId, email, options) => {
        const spinner = ora(`Inviting ${email} to organization...`).start();

        try {
          const client = createClient();

          await client.post(`/organizations/${orgId}/invite`, {
            email,
            role: options.role,
          });
          spinner.succeed(chalk.green(`Invitation sent to ${email} successfully!`));
        } catch (err) {
          spinner.fail();
          handleError(err, 'Failed to send invitation');
        }
      })
  );

// Generate component
program
  .command('generate component <name>')
  .description('Generate a new component')
  .option('-t, --type <type>', 'Component type (functional/class)', 'functional')
  .action(async (name, options) => {
    const spinner = ora('Generating component...').start();

    try {
      const template =
        options.type === 'functional'
          ? `import React from 'react';

interface ${name}Props {
  // Add props here
}

const ${name}: React.FC<${name}Props> = (props) => {
  return (
    <div className="${name.toLowerCase()}">
      {/* Add your JSX here */}
    </div>
  );
};

export default ${name};`
          : `import React, { Component } from 'react';

interface ${name}Props {
  // Add props here
}

interface ${name}State {
  // Add state here
}

class ${name} extends Component<${name}Props, ${name}State> {
  render() {
    return (
      <div className="${name.toLowerCase()}">
        {/* Add your JSX here */}
      </div>
    );
  }
}

export default ${name};`;

      await fs.writeFile(path.join('src', 'components', `${name}.tsx`), template);

      spinner.succeed(chalk.green(`Component ${name} generated successfully!`));
    } catch (err) {
      spinner.fail();
      handleError(err, 'Failed to generate component');
    }
  });

// Deploy command
program
  .command('deploy')
  .description('Deploy your GemCMS project')
  .option('-e, --env <environment>', 'Deployment environment', 'production')
  .action(async options => {
    const spinner = ora('Deploying project...').start();

    try {
      const client = createClient();

      await client.post('/deployments', {
        environment: options.env,
      });

      spinner.succeed(chalk.green('Deployment successful!'));
    } catch (err) {
      spinner.fail();
      handleError(err, 'Failed to deploy');
    }
  });

// Development server
program
  .command('dev')
  .description('Start development server')
  .action(async () => {
    const spinner = ora('Starting development server...').start();

    try {
      // Start local development server using vite
      const devServer = spawn('npx', ['vite'], {
        stdio: 'inherit',
        shell: true,
      });

      // Handle server startup
      await new Promise((resolve, reject) => {
        devServer.on('error', err => {
          reject(err);
        });

        // Give the server a moment to start
        setTimeout(() => {
          spinner.succeed(chalk.green('Development server started at http://localhost:3000'));
          console.log(chalk.blue('\nWatching for file changes...'));
          resolve();
        }, 2000);
      });

      // Handle server shutdown
      process.on('SIGINT', () => {
        devServer.kill('SIGINT');
        process.exit(0);
      });
    } catch (err) {
      spinner.fail();
      handleError(err, 'Failed to start development server');
    }
  });

// Initialize CLI
async function init() {
  await loadConfig();
  program.parse(process.argv);
}

init().catch(err => {
  console.error(chalk.red('Error:'), err.message);
  process.exit(1);
});
