# Automated Install Mode

The Parse Server now supports automated installation mode, which allows you to configure the platform automatically on server startup using environment variables.

## How It Works

When the Parse Server starts up, it checks for the `AUTO_INSTALL_CONFIG` environment variable. If this variable contains valid JSON configuration, the server will automatically:

1. Create the core infrastructure (roles, schemas, etc.)
2. Create the system admin user
3. Create the parent organization
4. Set the platform state to OPERATIONAL

## Configuration

Set the `AUTO_INSTALL_CONFIG` environment variable with a JSON object containing the following fields:

### Required Fields

- `parentOrgName` (string): Name of the parent organization
- `adminUserEmail` (string): Email address for the system admin user
- `adminUserPassword` (string): Password for the system admin user
- `adminUserFirstName` (string): First name of the system admin user
- `adminUserLastName` (string): Last name of the system admin user

### Optional Fields

- `defaultPlanType` (string): Plan type for the organization (default: "enterprise")

## Example Configuration

### Environment Variable

```bash
export AUTO_INSTALL_CONFIG='{"parentOrgName":"Nomyx, Inc","adminUserEmail":"admin@nomyx.io","adminUserPassword":"password123","adminUserFirstName":"Sebastian","adminUserLastName":"Schepis","defaultPlanType":"enterprise"}'
```

### Docker Compose

```yaml
services:
  parse-server:
    environment:
      - AUTO_INSTALL_CONFIG={"parentOrgName":"Nomyx, Inc","adminUserEmail":"admin@nomyx.io","adminUserPassword":"password123","adminUserFirstName":"Sebastian","adminUserLastName":"Schepis","defaultPlanType":"enterprise"}
```

### .env File

```env
AUTO_INSTALL_CONFIG={"parentOrgName":"Nomyx, Inc","adminUserEmail":"admin@nomyx.io","adminUserPassword":"password123","adminUserFirstName":"Sebastian","adminUserLastName":"Schepis","defaultPlanType":"enterprise"}
```

## Behavior

- **First Run**: If the platform is not yet configured, the automated install will run and set up the platform
- **Already Configured**: If the platform is already in OPERATIONAL state, the automated install will be skipped
- **Error Handling**: If the automated install fails, the platform state will be set to SETUP_ERROR with the error message
- **Server Startup**: The automated install runs after services are initialized but does not block server startup if it fails

## Security Considerations

- The `AUTO_INSTALL_CONFIG` environment variable contains sensitive information (passwords)
- Ensure this environment variable is properly secured in your deployment environment
- Consider using secrets management systems in production environments
- The automated install only runs once when the platform is not yet configured

## Logging

The automated install process logs its progress:

- `Checking for automated install configuration...`
- `Found automated install configuration, validating...`
- `Running automated platform setup...`
- `Automated platform setup completed successfully`

## Troubleshooting

### Common Issues

1. **Invalid JSON**: Ensure the `AUTO_INSTALL_CONFIG` contains valid JSON
2. **Missing Fields**: All required fields must be present in the configuration
3. **Already Configured**: The install will be skipped if the platform is already set up
4. **Database Connection**: Ensure the database is accessible and properly configured

### Error Messages

- `Missing required fields in AUTO_INSTALL_CONFIG: [field1, field2]`
- `Platform already configured`
- `Automated install failed: [error message]`

## Manual Override

If you need to reset the platform and run the automated install again:

1. Reset the platform state in the database
2. Restart the Parse Server with the `AUTO_INSTALL_CONFIG` environment variable

## Integration with CI/CD

The automated install mode is particularly useful for:

- Docker deployments
- CI/CD pipelines
- Development environment setup
- Testing environments
- Production deployments with infrastructure as code