/**
 * Data-Aware Components
 * Components that can display and interact with Parse Server data
 */

const dataComponents = {
  // List and Collection Components
  lists: {
    dataList: {
      name: 'Data List',
      category: 'Data Display',
      config: {
        className: '', // Parse class name
        query: {}, // Parse query options
        template: 'list', // Display template
        pagination: {
          enabled: true,
          itemsPerPage: 10,
        },
        sorting: {
          enabled: true,
          field: 'createdAt',
          order: 'desc',
        },
        filtering: {
          enabled: true,
          fields: [],
        },
      },
      templates: {
        list: '<div class="data-list">{items}</div>',
        grid: '<div class="data-grid">{items}</div>',
        table: '<table class="data-table">{headers}{items}</table>',
      },
    },

    dataGrid: {
      name: 'Data Grid',
      category: 'Data Display',
      config: {
        className: '',
        columns: [], // Grid columns configuration
        features: {
          sorting: true,
          filtering: true,
          grouping: true,
          export: true,
        },
        pageSize: 25,
      },
    },

    dataTable: {
      name: 'Data Table',
      category: 'Data Display',
      config: {
        className: '',
        columns: [],
        features: {
          sorting: true,
          filtering: true,
          export: true,
          columnResize: true,
          columnReorder: true,
        },
      },
    },
  },

  // Single Item Components
  items: {
    dataCard: {
      name: 'Data Card',
      category: 'Data Display',
      config: {
        className: '',
        objectId: '',
        template: 'default',
        fields: [],
      },
      templates: {
        default: '<div class="data-card">{content}</div>',
        compact: '<div class="data-card-compact">{content}</div>',
        detailed: '<div class="data-card-detailed">{content}</div>',
      },
    },

    dataDetail: {
      name: 'Data Detail',
      category: 'Data Display',
      config: {
        className: '',
        objectId: '',
        layout: 'single',
        sections: [],
      },
    },

    dataProfile: {
      name: 'Data Profile',
      category: 'Data Display',
      config: {
        className: '_User',
        objectId: '',
        fields: ['username', 'email', 'avatar'],
        actions: ['edit', 'delete'],
      },
    },
  },

  // Form Components
  forms: {
    dataForm: {
      name: 'Data Form',
      category: 'Data Input',
      config: {
        className: '',
        objectId: '', // For editing existing objects
        fields: [],
        validation: true,
        layout: 'vertical',
      },
    },

    dataSearch: {
      name: 'Data Search',
      category: 'Data Input',
      config: {
        className: '',
        fields: [],
        searchType: 'fulltext',
        instantSearch: true,
      },
    },

    dataFilter: {
      name: 'Data Filter',
      category: 'Data Input',
      config: {
        className: '',
        fields: [],
        filterType: 'advanced',
        saveFilters: true,
      },
    },
  },

  // Chart Components
  charts: {
    dataChart: {
      name: 'Data Chart',
      category: 'Data Visualization',
      config: {
        className: '',
        type: 'bar', // bar, line, pie, etc.
        dataField: '',
        aggregation: 'count',
        groupBy: '',
        options: {},
      },
    },

    dataMetric: {
      name: 'Data Metric',
      category: 'Data Visualization',
      config: {
        className: '',
        metric: 'count',
        field: '',
        format: 'number',
      },
    },

    dataDashboard: {
      name: 'Data Dashboard',
      category: 'Data Visualization',
      config: {
        layout: 'grid',
        widgets: [],
      },
    },
  },

  // Relationship Components
  relationships: {
    dataRelation: {
      name: 'Data Relation',
      category: 'Data Relationships',
      config: {
        className: '',
        relationField: '',
        displayField: '',
        template: 'list',
      },
    },

    dataSelector: {
      name: 'Data Selector',
      category: 'Data Relationships',
      config: {
        className: '',
        multiple: false,
        searchEnabled: true,
        createEnabled: false,
      },
    },

    dataTree: {
      name: 'Data Tree',
      category: 'Data Relationships',
      config: {
        className: '',
        parentField: '',
        childrenField: '',
        displayField: '',
      },
    },
  },

  // System Components
  system: {
    userProfile: {
      name: 'User Profile',
      category: 'System',
      config: {
        fields: ['username', 'email', 'avatar'],
        actions: ['edit', 'delete'],
        roles: true,
      },
    },

    roleManager: {
      name: 'Role Manager',
      category: 'System',
      config: {
        display: 'tree',
        actions: ['create', 'edit', 'delete'],
        users: true,
      },
    },

    fileManager: {
      name: 'File Manager',
      category: 'System',
      config: {
        view: 'grid',
        upload: true,
        preview: true,
        types: ['image', 'document', 'video'],
      },
    },
  },

  // Custom Components
  custom: {
    dataCustom: {
      name: 'Custom Data Component',
      category: 'Custom',
      config: {
        className: '',
        template: '',
        script: '',
        style: '',
      },
    },

    dataWidget: {
      name: 'Data Widget',
      category: 'Custom',
      config: {
        type: 'custom',
        data: {},
        settings: {},
      },
    },
  },

  // Helper Methods
  helpers: {
    /**
     * Register component with GrapesJS
     * @param {Object} editor - GrapesJS editor instance
     * @param {string} type - Component type
     * @param {Object} component - Component configuration
     */
    registerComponent(editor, type, component) {
      editor.DomComponents.addType(type, {
        model: {
          defaults: {
            ...component.config,
            traits: [
              {
                type: 'select',
                name: 'className',
                label: 'Data Class',
                options: [], // Will be populated with available classes
              },
              {
                type: 'select',
                name: 'template',
                label: 'Template',
                options: Object.keys(component.templates || {}),
              },
            ],
          },
        },
        view: {
          async onRender() {
            await this.updateData();
          },
          async updateData() {
            const model = this.model;
            const className = model.get('className');
            const query = new Parse.Query(className);

            try {
              const results = await query.find();
              // Update component with data
              this.el.innerHTML = this.template(results);
            } catch (error) {
              console.error('Error fetching data:', error);
            }
          },
        },
      });
    },

    /**
     * Register all components with GrapesJS
     * @param {Object} editor - GrapesJS editor instance
     */
    registerAll(editor) {
      Object.entries(this).forEach(([category, components]) => {
        if (typeof components === 'object') {
          Object.entries(components).forEach(([type, component]) => {
            this.registerComponent(editor, `data-${type}`, component);
          });
        }
      });
    },
  },
};

module.exports = dataComponents;
