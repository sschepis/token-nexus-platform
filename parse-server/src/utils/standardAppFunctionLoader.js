/**
 * Standard App Function Loader
 * Loads cloud functions from standard applications in src/cloud-functions/
 */

const fs = require('fs');
const path = require('path');

class StandardAppFunctionLoader {
  constructor(parseServer) {
    this.Parse = parseServer;
    this.loadedApps = new Set();
  }

  /**
   * Load cloud functions for all installed standard apps
   */
  async loadAllStandardAppFunctions() {
    const standardAppsPath = path.join(__dirname, '../../../src/cloud-functions');
    
    if (!fs.existsSync(standardAppsPath)) {
      console.log('No standard app cloud functions directory found');
      return;
    }

    const appDirs = fs.readdirSync(standardAppsPath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    console.log(`Loading cloud functions for ${appDirs.length} standard apps...`);

    for (const appDir of appDirs) {
      try {
        await this.loadStandardAppFunctions(appDir);
        console.log(`✅ Loaded cloud functions for: ${appDir}`);
      } catch (error) {
        console.error(`❌ Failed to load cloud functions for ${appDir}:`, error.message);
      }
    }

    console.log(`📦 Standard app cloud functions loaded. ${this.loadedApps.size} apps processed.`);
  }

  /**
   * Load cloud functions for a specific standard app
   */
  async loadStandardAppFunctions(appName) {
    if (this.loadedApps.has(appName)) {
      console.log(`Cloud functions for ${appName} already loaded`);
      return;
    }

    const appPath = path.join(__dirname, '../../../src/cloud-functions', appName);
    
    if (!fs.existsSync(appPath)) {
      throw new Error(`Standard app directory not found: ${appPath}`);
    }

    // Look for function files in the app directory
    const functionFiles = fs.readdirSync(appPath)
      .filter(file => file.endsWith('.js'))
      .map(file => path.join(appPath, file));

    if (functionFiles.length === 0) {
      console.log(`No cloud function files found for ${appName}`);
      return;
    }

    // Load each function file
    for (const functionFile of functionFiles) {
      try {
        await this.loadFunctionFile(functionFile, appName);
      } catch (error) {
        console.error(`Error loading function file ${functionFile}:`, error.message);
      }
    }

    this.loadedApps.add(appName);
  }

  /**
   * Load a specific function file
   */
  async loadFunctionFile(filePath, appName) {
    try {
      // Clear require cache to allow reloading
      delete require.cache[require.resolve(filePath)];
      
      // Create a sandboxed context for the function file
      const functionContext = {
        Parse: this.Parse,
        console: {
          log: (...args) => console.log(`[${appName}]`, ...args),
          error: (...args) => console.error(`[${appName}]`, ...args),
          warn: (...args) => console.warn(`[${appName}]`, ...args),
          info: (...args) => console.info(`[${appName}]`, ...args)
        },
        require: require,
        module: { exports: {} },
        exports: {},
        __filename: filePath,
        __dirname: path.dirname(filePath),
        global: global,
        process: process
      };

      // Read and execute the function file
      const functionCode = fs.readFileSync(filePath, 'utf8');
      
      // Wrap the code to provide the context
      const wrappedCode = `
        (function(Parse, console, require, module, exports, __filename, __dirname, global, process) {
          ${functionCode}
        })
      `;

      const executeFunction = eval(wrappedCode);
      executeFunction(
        functionContext.Parse,
        functionContext.console,
        functionContext.require,
        functionContext.module,
        functionContext.exports,
        functionContext.__filename,
        functionContext.__dirname,
        functionContext.global,
        functionContext.process
      );

      console.log(`Loaded function file: ${path.basename(filePath)} for ${appName}`);

    } catch (error) {
      throw new Error(`Failed to load function file ${filePath}: ${error.message}`);
    }
  }

  /**
   * Unload cloud functions for a standard app
   */
  async unloadStandardAppFunctions(appName) {
    // Note: Parse Server doesn't provide a way to undefine cloud functions
    // This would require tracking function names and implementing custom unloading
    console.log(`Unloading functions for ${appName} (not fully implemented)`);
    this.loadedApps.delete(appName);
  }

  /**
   * Reload cloud functions for a standard app
   */
  async reloadStandardAppFunctions(appName) {
    await this.unloadStandardAppFunctions(appName);
    await this.loadStandardAppFunctions(appName);
  }

  /**
   * Get list of loaded standard apps
   */
  getLoadedApps() {
    return Array.from(this.loadedApps);
  }

  /**
   * Check if a standard app's functions are loaded
   */
  isAppLoaded(appName) {
    return this.loadedApps.has(appName);
  }

  /**
   * Get available standard apps (directories in src/cloud-functions)
   */
  getAvailableStandardApps() {
    const standardAppsPath = path.join(__dirname, '../../../src/cloud-functions');
    
    if (!fs.existsSync(standardAppsPath)) {
      return [];
    }

    return fs.readdirSync(standardAppsPath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
  }

  /**
   * Load functions for specific apps based on installation status
   */
  async loadInstalledAppFunctions(installedApps = []) {
    console.log(`Loading cloud functions for installed apps: ${installedApps.join(', ')}`);
    
    for (const appName of installedApps) {
      try {
        await this.loadStandardAppFunctions(appName);
      } catch (error) {
        console.error(`Failed to load functions for installed app ${appName}:`, error.message);
      }
    }
  }
}

module.exports = StandardAppFunctionLoader;