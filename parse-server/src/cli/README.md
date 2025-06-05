# GemCMS CLI

A command-line interface for managing GemCMS projects, plugins, templates, and organizations.

## Installation

```bash
npm install -g @gemcms/cli
```

## Configuration

Before using the CLI, you need to configure it with your API key:

```bash
gemcms configure
```

This will prompt you for:
- Your GemCMS API key
- API base URL (optional)

## Commands

### Project Management

Create a new project:
```bash
gemcms create my-project
gemcms create my-project --template custom-template
```

Start development server:
```bash
gemcms dev
```

Deploy project:
```bash
gemcms deploy
gemcms deploy --env staging
```

### Plugin Management

Install a plugin:
```bash
gemcms plugin install my-plugin
```

Uninstall a plugin:
```bash
gemcms plugin uninstall my-plugin
```

List installed plugins:
```bash
gemcms plugin list
```

### Template Management

Create a new template:
```bash
gemcms template create my-template
gemcms template create my-template --description "My custom template"
```

List available templates:
```bash
gemcms template list
```

### Organization Management

Create a new organization:
```bash
gemcms org create my-org
gemcms org create my-org --description "My organization"
```

List organizations:
```bash
gemcms org list
```

Invite user to organization:
```bash
gemcms org invite org-id user@example.com
gemcms org invite org-id user@example.com --role admin
```

### Component Generation

Generate a new React component:
```bash
gemcms generate component MyComponent
gemcms generate component MyComponent --type class
```

## Error Handling

The CLI provides detailed error messages for common issues:

- Authentication errors (401)
- Permission errors (403)
- Resource not found errors (404)
- Rate limiting errors (429)
- Network errors
- API errors

## Environment Variables

The CLI supports the following environment variables:

- `GEMCMS_API_KEY`: Your GemCMS API key
- `GEMCMS_API_URL`: Custom API base URL

## Configuration File

The CLI stores configuration in `~/.gemcmsrc`. This file contains:

```json
{
  "apiKey": "your-api-key",
  "baseURL": "https://api.gemcms.com/v1"
}
```

## Project Structure

When creating a new project, the CLI sets up the following structure:

```
my-project/
├── src/
│   ├── components/
│   └── pages/
├── package.json
└── gemcms.config.json
```

## Development

The development server (`gemcms dev`) provides:

- Hot module replacement
- Error overlay
- Console output
- File watching
- Auto-reloading

## Deployment

The deployment command (`gemcms deploy`) supports:

- Multiple environments (production, staging, etc.)
- Automatic builds
- Asset optimization
- Environment-specific configuration

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT
