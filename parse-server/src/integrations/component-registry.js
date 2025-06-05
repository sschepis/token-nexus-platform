const { logger } = require('../utils/logger');
const { validateComponent } = require('../utils/validation');
const { ComponentError } = require('../utils/errors');

/**
 * Registry for managing custom components and their dependencies
 */
class ComponentRegistry {
  constructor() {
    this.components = new Map();
    this.dependencies = new Map();
    this.providers = new Map();
  }

  /**
   * Register a new component
   * @param {Object} options Component configuration
   * @param {string} options.name Component identifier
   * @param {string} options.version Component version
   * @param {Object} options.component Component implementation
   * @param {string[]} options.dependencies Component dependencies
   * @param {Object} options.metadata Additional component metadata
   * @return {Promise<void>}
   */
  async registerComponent(options) {
    const { name, version, component, dependencies = [], metadata = {} } = options;

    const componentId = this.buildComponentId(name, version);

    if (this.components.has(componentId)) {
      throw new ComponentError(
        'COMPONENT_EXISTS',
        `Component ${name}@${version} is already registered`
      );
    }

    try {
      // Validate component
      const validationResult = await validateComponent(component);

      if (!validationResult.isValid) {
        throw new Error(`Invalid component: ${validationResult.errors.join(', ')}`);
      }

      // Check dependencies
      await this.validateDependencies(dependencies);

      // Register component
      this.components.set(componentId, {
        id: componentId,
        name,
        version,
        component,
        dependencies,
        metadata: {
          ...metadata,
          registeredAt: new Date().toISOString(),
        },
        status: 'active',
      });

      // Update dependency graph
      this.updateDependencyGraph(componentId, dependencies);

      logger.info('Component registered successfully', {
        component: componentId,
        dependencies,
      });
    } catch (error) {
      logger.error('Component registration failed', {
        component: componentId,
        error: error.message,
      });
      throw new ComponentError('REGISTRATION_FAILED', error.message);
    }
  }

  /**
   * Register a component provider
   * @param {Object} options Provider configuration
   * @param {string} options.name Provider identifier
   * @param {Function} options.factory Component factory function
   * @param {Object} options.config Provider configuration
   * @return {Promise<void>}
   */
  async registerProvider(options) {
    const { name, factory, config = {} } = options;

    if (this.providers.has(name)) {
      throw new ComponentError('PROVIDER_EXISTS', `Provider ${name} is already registered`);
    }

    try {
      // Initialize provider
      const provider = await factory(config);

      this.providers.set(name, {
        name,
        factory,
        config,
        instance: provider,
        registeredAt: new Date().toISOString(),
      });

      logger.info('Provider registered successfully', { provider: name });
    } catch (error) {
      logger.error('Provider registration failed', {
        provider: name,
        error: error.message,
      });
      throw new ComponentError('PROVIDER_REGISTRATION_FAILED', error.message);
    }
  }

  /**
   * Get component instance
   * @param {string} name Component name
   * @param {string} version Component version
   * @return {Object} Component instance
   */
  getComponent(name, version) {
    const componentId = this.buildComponentId(name, version);
    const component = this.components.get(componentId);

    if (!component) {
      throw new ComponentError('COMPONENT_NOT_FOUND', `Component ${name}@${version} not found`);
    }

    return component;
  }

  /**
   * List available components
   * @param {Object} options List options
   * @param {string} options.filter Filter expression
   * @param {Object} options.sort Sort options
   * @return {Object[]} List of components
   */
  listComponents(options = {}) {
    const { filter, sort } = options;
    let components = Array.from(this.components.values());

    // Apply filters
    if (filter) {
      components = this.filterComponents(components, filter);
    }

    // Apply sorting
    if (sort) {
      components = this.sortComponents(components, sort);
    }

    return components.map(component => ({
      id: component.id,
      name: component.name,
      version: component.version,
      dependencies: component.dependencies,
      metadata: component.metadata,
      status: component.status,
    }));
  }

  /**
   * Get component dependencies
   * @param {string} name Component name
   * @param {string} version Component version
   * @return {Object} Dependency graph
   */
  getDependencies(name, version) {
    const componentId = this.buildComponentId(name, version);
    const dependencies = this.dependencies.get(componentId);

    if (!dependencies) {
      throw new ComponentError(
        'DEPENDENCIES_NOT_FOUND',
        `Dependencies for ${name}@${version} not found`
      );
    }

    return {
      direct: dependencies.direct,
      transitive: dependencies.transitive,
      graph: this.buildDependencyGraph(componentId),
    };
  }

  /**
   * Check if component exists
   * @param {string} name Component name
   * @param {string} version Component version
   * @return {boolean} Whether component exists
   */
  hasComponent(name, version) {
    const componentId = this.buildComponentId(name, version);

    return this.components.has(componentId);
  }

  /**
   * Update component
   * @param {Object} options Update options
   * @param {string} options.name Component name
   * @param {string} options.version Component version
   * @param {Object} options.updates Updates to apply
   * @return {Promise<Object>} Updated component
   */
  async updateComponent(options) {
    const { name, version, updates } = options;
    const component = this.getComponent(name, version);

    try {
      // Validate updates
      if (updates.component) {
        const validationResult = await validateComponent(updates.component);

        if (!validationResult.isValid) {
          throw new Error(`Invalid component: ${validationResult.errors.join(', ')}`);
        }
      }

      // Check dependencies if updated
      if (updates.dependencies) {
        await this.validateDependencies(updates.dependencies);
      }

      // Apply updates
      const updatedComponent = {
        ...component,
        ...updates,
        metadata: {
          ...component.metadata,
          ...updates.metadata,
          updatedAt: new Date().toISOString(),
        },
      };

      // Update registry
      this.components.set(component.id, updatedComponent);

      // Update dependency graph if needed
      if (updates.dependencies) {
        this.updateDependencyGraph(component.id, updates.dependencies);
      }

      logger.info('Component updated successfully', {
        component: component.id,
      });

      return updatedComponent;
    } catch (error) {
      logger.error('Component update failed', {
        component: component.id,
        error: error.message,
      });
      throw new ComponentError('UPDATE_FAILED', error.message);
    }
  }

  /**
   * Remove component
   * @param {string} name Component name
   * @param {string} version Component version
   * @return {Promise<void>}
   */
  removeComponent(name, version) {
    const componentId = this.buildComponentId(name, version);

    try {
      // Check for dependent components
      const dependents = this.findDependents(componentId);

      if (dependents.length > 0) {
        throw new Error(`Cannot remove component with dependents: ${dependents.join(', ')}`);
      }

      // Remove from registry
      this.components.delete(componentId);
      this.dependencies.delete(componentId);

      logger.info('Component removed successfully', {
        component: componentId,
      });
    } catch (error) {
      logger.error('Component removal failed', {
        component: componentId,
        error: error.message,
      });
      throw new ComponentError('REMOVAL_FAILED', error.message);
    }
  }

  /**
   * Build component identifier
   * @param {string} name Component name
   * @param {string} version Component version
   * @return {string} Component identifier
   */
  buildComponentId(name, version) {
    return `${name}@${version}`;
  }

  /**
   * Validate component dependencies
   * @param {string[]} dependencies Component dependencies
   * @return {Promise<void>}
   */
  validateDependencies(dependencies) {
    for (const dependency of dependencies) {
      const [name, version] = dependency.split('@');

      if (!this.hasComponent(name, version)) {
        throw new Error(`Dependency not found: ${dependency}`);
      }
    }
  }

  /**
   * Update dependency graph
   * @param {string} componentId Component identifier
   * @param {string[]} dependencies Component dependencies
   */
  updateDependencyGraph(componentId, dependencies) {
    this.dependencies.set(componentId, {
      direct: dependencies,
      transitive: this.findTransitiveDependencies(dependencies),
    });
  }

  /**
   * Find transitive dependencies
   * @param {string[]} directDependencies Direct dependencies
   * @return {string[]} Transitive dependencies
   */
  findTransitiveDependencies(directDependencies) {
    const transitive = new Set();

    const traverse = deps => {
      for (const dep of deps) {
        if (!transitive.has(dep)) {
          transitive.add(dep);
          const component = this.components.get(dep);

          if (component) {
            traverse(component.dependencies);
          }
        }
      }
    };

    traverse(directDependencies);

    return Array.from(transitive);
  }

  /**
   * Find dependent components
   * @param {string} componentId Component identifier
   * @return {string[]} Dependent components
   */
  findDependents(componentId) {
    return Array.from(this.components.values())
      .filter(
        component =>
          component.dependencies.includes(componentId) ||
          this.dependencies.get(component.id)?.transitive.includes(componentId)
      )
      .map(component => component.id);
  }

  /**
   * Build dependency graph
   * @param {string} componentId Root component identifier
   * @return {Object} Dependency graph
   */
  buildDependencyGraph(componentId) {
    const graph = {
      nodes: [],
      edges: [],
    };

    const visited = new Set();

    const addNode = id => {
      if (!visited.has(id)) {
        visited.add(id);
        const component = this.components.get(id);

        graph.nodes.push({
          id,
          label: component.name,
          version: component.version,
        });

        for (const dep of component.dependencies) {
          graph.edges.push({
            source: id,
            target: dep,
          });
          addNode(dep);
        }
      }
    };

    addNode(componentId);

    return graph;
  }

  /**
   * Filter components
   * @param {Object[]} components Component list
   * @param {string} filter Filter expression
   * @return {Object[]} Filtered components
   */
  filterComponents(components, filter) {
    // Parse filter expression
    const [field, operator, value] = filter.split(':');

    return components.filter(component => {
      const fieldValue = component[field];

      switch (operator) {
        case 'eq':
          return fieldValue === value;
        case 'contains':
          return fieldValue.includes(value);
        case 'gt':
          return fieldValue > value;
        case 'lt':
          return fieldValue < value;
        default:
          return true;
      }
    });
  }

  /**
   * Sort components
   * @param {Object[]} components Component list
   * @param {Object} sort Sort options
   * @return {Object[]} Sorted components
   */
  sortComponents(components, sort) {
    const { field, order = 'asc' } = sort;

    return components.sort((a, b) => {
      const aValue = a[field];
      const bValue = b[field];

      return order === 'asc' ? (aValue > bValue ? 1 : -1) : aValue < bValue ? 1 : -1;
    });
  }
}

module.exports = new ComponentRegistry();
