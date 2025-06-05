const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const ParseDashboard = require('parse-dashboard');
const express = require('express');
const path = require('path');
const config = require('../config');
const logger = require('../utils/logger');
const ParseServerTenantContext = require('./parseServerTenantContext');

function setupMiddleware(app, parseServer, databaseManager, tenantContext) {
  const timer = logger.time('Middleware setup');

  // Security middleware with CSP configuration
  logger.init('middleware', 'Setting up security middleware (helmet)');
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'unpkg.com', 'localhost:*'],
          styleSrc: ["'self'", "'unsafe-inline'", 'fonts.googleapis.com', 'unpkg.com'],
          imgSrc: ["'self'", 'data:', 'blob:', 'unpkg.com'],
          connectSrc: ["'self'", 'ws:', 'wss:', 'unpkg.com', 'localhost:*'],
          fontSrc: ["'self'", 'fonts.gstatic.com', 'data:', 'unpkg.com'],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'self'"]
        }
      },
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: false
    })
  );

  // Rate limiting
  if (config.security.rateLimit.enabled) {
    logger.init('middleware', 'Setting up rate limiting', config.security.rateLimit);
    app.use(
      rateLimit({
        windowMs: config.security.rateLimit.windowMs,
        max: config.security.rateLimit.max
      })
    );
  }

  // CORS configuration
  if (config.security.cors.enabled) {
    logger.init('middleware', 'Setting up CORS', config.security.cors);
    app.use((req, res, next) => {
      const origin = req.headers.origin;

      if (!origin || origin === config.security.cors.origin) {
        res.header('Access-Control-Allow-Origin', origin || '*');
        res.header('Access-Control-Allow-Methods', config.security.cors.methods.join(', '));
        res.header('Access-Control-Allow-Headers', config.security.cors.allowHeaders.join(', '));
        res.header('Access-Control-Expose-Headers', config.security.cors.exposeHeaders.join(', '));
        res.header('Access-Control-Allow-Credentials', 'true');
      }

      if (req.method === 'OPTIONS') {
        res.sendStatus(200);
      } else {
        next();
      }
    });
  }

  // Request logging middleware
  logger.init('middleware', 'Setting up request logging');
  app.use(logger.requestLogger);

  // Error logging middleware
  logger.init('middleware', 'Setting up error logging');
  app.use(logger.errorLogger);

  // Setup tenant context middleware for Parse Server
  if (databaseManager && tenantContext) {
    logger.init('middleware', 'Setting up Parse Server tenant context middleware');
    const tenantContextMiddleware = new ParseServerTenantContext(databaseManager, tenantContext);
    app.use('/parse', tenantContextMiddleware.middleware());
  }

  // Mount Parse Server at /parse
  logger.init('middleware', 'Mounting Parse Server at /parse');
  app.use('/parse', parseServer);

  // Serve static files for dashboard extensions
  logger.init('middleware', 'Setting up static file serving for dashboard extensions');
  app.use(
    '/dashboard/static',
    express.static(path.join(__dirname, '../dashboard/extensions'), {
      index: false,
      fallthrough: true
    })
  );

  // Mount Parse Dashboard at /dashboard
  if (config.dashboard.enabled) {
    logger.init('middleware', 'Setting up Parse Dashboard', {
      mountPath: config.dashboard.mountPath
    });

    const dashboard = new ParseDashboard(
      {
        apps: config.dashboard.apps,
        users: config.dashboard.users,
        useEncryptedPasswords: config.dashboard.useEncryptedPasswords,
        trustProxy: config.dashboard.trustProxy
      },
      {
        allowInsecureHTTP: config.dashboard.allowInsecureHTTP,
        cookieSessionSecret: config.dashboard.cookieSessionSecret
      }
    );

    app.use(config.dashboard.mountPath, dashboard);
    logger.init('middleware', `Parse Dashboard mounted at ${config.dashboard.mountPath}`);
  }

  // Health check endpoint
  logger.init('middleware', 'Setting up health check endpoint');
  app.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      version: require('../../package.json').version,
      parseServer: config.parseServer.serverURL,
      dashboard: config.dashboard.enabled ? config.dashboard.mountPath : null
    });
  });

  const duration = timer.end();

  logger.init('middleware', `Middleware setup completed in ${duration}ms`);

  return app;
}

module.exports = setupMiddleware;
