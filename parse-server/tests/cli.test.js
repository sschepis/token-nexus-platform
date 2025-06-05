const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');
const axios = require('axios');

// Mock modules
jest.mock('axios');
jest.mock('fs').promises;
jest.mock('child_process');

describe('GemCMS CLI', () => {
  const CLI_PATH = path.join(__dirname, '../src/cli/gemcms-cli.js');
  const TEST_API_KEY = 'test-api-key';
  const TEST_BASE_URL = 'https://api.test.com/v1';

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock environment variables
    process.env.GEMCMS_API_KEY = TEST_API_KEY;
    process.env.GEMCMS_API_URL = TEST_BASE_URL;

    // Mock fs.promises
    fs.promises = {
      readFile: jest.fn(),
      writeFile: jest.fn(),
      mkdir: jest.fn(),
    };

    // Mock axios
    axios.create.mockReturnValue(axios);
    axios.get.mockResolvedValue({ data: [] });
    axios.post.mockResolvedValue({ data: {} });
  });

  describe('Configuration', () => {
    it('should save configuration correctly', async () => {
      const config = {
        apiKey: TEST_API_KEY,
        baseURL: TEST_BASE_URL,
      };

      fs.writeFile.mockResolvedValue();

      await require(CLI_PATH).saveConfig(config);

      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('.gemcmsrc'),
        JSON.stringify(config, null, 2)
      );
    });

    it('should load configuration correctly', async () => {
      const config = {
        apiKey: TEST_API_KEY,
        baseURL: TEST_BASE_URL,
      };

      fs.readFile.mockResolvedValue(JSON.stringify(config));

      await require(CLI_PATH).loadConfig();

      expect(fs.readFile).toHaveBeenCalledWith(expect.stringContaining('.gemcmsrc'), 'utf8');
    });
  });

  describe('Project Management', () => {
    it('should create project with correct structure', async () => {
      const projectName = 'test-project';

      // Mock API call
      axios.post.mockResolvedValue({ data: { name: projectName } });

      // Mock file system operations
      fs.mkdir.mockResolvedValue();
      fs.writeFile.mockResolvedValue();

      await require(CLI_PATH).create(projectName);

      // Verify project structure creation
      expect(fs.mkdir).toHaveBeenCalledWith(projectName);
      expect(fs.mkdir).toHaveBeenCalledWith(path.join(projectName, 'src'));
      expect(fs.mkdir).toHaveBeenCalledWith(path.join(projectName, 'src', 'components'));
      expect(fs.mkdir).toHaveBeenCalledWith(path.join(projectName, 'src', 'pages'));

      // Verify package.json creation
      expect(fs.writeFile).toHaveBeenCalledWith(
        path.join(projectName, 'package.json'),
        expect.stringContaining('@gemcms/sdk')
      );

      // Verify config file creation
      expect(fs.writeFile).toHaveBeenCalledWith(
        path.join(projectName, 'gemcms.config.json'),
        expect.stringContaining('development')
      );
    });
  });

  describe('Plugin Management', () => {
    it('should install plugin correctly', async () => {
      const pluginName = 'test-plugin';

      axios.post.mockResolvedValue({ data: { name: pluginName } });

      await require(CLI_PATH).plugin.install(pluginName);

      expect(axios.post).toHaveBeenCalledWith('/plugins/install', { name: pluginName });
    });

    it('should list plugins correctly', async () => {
      const plugins = [
        { name: 'plugin1', version: '1.0.0' },
        { name: 'plugin2', version: '2.0.0' },
      ];

      axios.get.mockResolvedValue({ data: plugins });

      await require(CLI_PATH).plugin.list();

      expect(axios.get).toHaveBeenCalledWith('/plugins');
    });
  });

  describe('Template Management', () => {
    it('should create template correctly', async () => {
      const templateName = 'test-template';
      const description = 'Test description';

      axios.post.mockResolvedValue({ data: { name: templateName } });

      await require(CLI_PATH).template.create(templateName, { description });

      expect(axios.post).toHaveBeenCalledWith('/templates', {
        name: templateName,
        description,
      });
    });
  });

  describe('Organization Management', () => {
    it('should create organization correctly', async () => {
      const orgName = 'test-org';
      const description = 'Test description';

      axios.post.mockResolvedValue({ data: { name: orgName } });

      await require(CLI_PATH).org.create(orgName, { description });

      expect(axios.post).toHaveBeenCalledWith('/organizations', {
        name: orgName,
        description,
      });
    });

    it('should invite user to organization correctly', async () => {
      const orgId = 'org123';
      const email = 'test@example.com';
      const role = 'admin';

      axios.post.mockResolvedValue({ data: { email } });

      await require(CLI_PATH).org.invite(orgId, email, { role });

      expect(axios.post).toHaveBeenCalledWith(`/organizations/${orgId}/invite`, {
        email,
        role,
      });
    });
  });

  describe('Component Generation', () => {
    it('should generate functional component correctly', async () => {
      const componentName = 'TestComponent';

      fs.writeFile.mockResolvedValue();

      await require(CLI_PATH).generate.component(componentName, { type: 'functional' });

      expect(fs.writeFile).toHaveBeenCalledWith(
        path.join('src', 'components', `${componentName}.tsx`),
        expect.stringContaining('React.FC')
      );
    });

    it('should generate class component correctly', async () => {
      const componentName = 'TestComponent';

      fs.writeFile.mockResolvedValue();

      await require(CLI_PATH).generate.component(componentName, { type: 'class' });

      expect(fs.writeFile).toHaveBeenCalledWith(
        path.join('src', 'components', `${componentName}.tsx`),
        expect.stringContaining('extends Component')
      );
    });
  });

  describe('Development Server', () => {
    it('should start development server correctly', async () => {
      const mockServer = {
        on: jest.fn(),
        kill: jest.fn(),
      };

      spawn.mockReturnValue(mockServer);

      await require(CLI_PATH).dev();

      expect(spawn).toHaveBeenCalledWith('npx', ['vite'], {
        stdio: 'inherit',
        shell: true,
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle authentication errors correctly', async () => {
      const error = new Error('Unauthorized');

      error.response = { status: 401 };
      axios.post.mockRejectedValue(error);

      await require(CLI_PATH).create('test-project');

      // Verify error handling
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Authentication failed'));
    });

    it('should handle rate limiting errors correctly', async () => {
      const error = new Error('Too Many Requests');

      error.response = { status: 429 };
      axios.post.mockRejectedValue(error);

      await require(CLI_PATH).create('test-project');

      // Verify error handling
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Rate limit exceeded'));
    });
  });
});
