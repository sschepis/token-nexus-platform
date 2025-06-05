module.exports = Parse => {
  Parse.Cloud.define('ensureCoreSchemas', async (request) => {
    if (!request.master) {
      throw new Parse.Error(Parse.Error.SCRIPT_FAILED, 'Master key required');
    }

    try {
      const schemas = [];
      const errors = [];

      const coreSchemas = [
        {
          className: 'PlatformConfig',
          fields: {
            currentState: { type: 'String', required: true, defaultValue: 'PRISTINE' },
            coreContractsImportedForNetwork: { type: 'String' },
            coreFactoryAddresses: { type: 'Object', defaultValue: {} },
            parentOrgId: { type: 'String' },
            lastSetupError: { type: 'String' },
            platformVersion: { type: 'String', defaultValue: '1.0.0' },
            setupCompletedAt: { type: 'Date' }
          },
          classLevelPermissions: {
            find: { requiresAuthentication: false },
            get: { requiresAuthentication: false },
            create: { 'role:SystemAdmin': true },
            update: { 'role:SystemAdmin': true },
            delete: { 'role:SystemAdmin': true },
            addField: { 'role:SystemAdmin': true }
          }
        },
        
        {
          className: 'SmartContract',
          fields: {
            name: { type: 'String', required: true },
            address: { type: 'String', required: true },
            network: { type: 'String', required: true },
            abi: { type: 'Object', required: true },
            contractType: { type: 'String' },
            deploymentTransaction: { type: 'String' },
            deployedBy: { type: 'Pointer', targetClass: '_User' },
            organization: { type: 'Pointer', targetClass: 'Organization' },
            metadata: { type: 'Object' }
          },
          classLevelPermissions: {
            find: { 'requiresAuthentication': true },
            get: { 'requiresAuthentication': true },
            count: { 'requiresAuthentication': true },
            create: { 'role:SystemAdmin': true },
            update: { 'role:SystemAdmin': true },
            delete: { 'role:SystemAdmin': true },
            addField: { 'role:SystemAdmin': true }
          },
          indexes: {
            network_address: { network: 1, address: 1 }
          }
        },
        
        {
          className: 'ABI',
          fields: {
            name: { type: 'String', required: true },
            version: { type: 'String' },
            abi: { type: 'Array', required: true },
            contractType: { type: 'String' },
            metadata: { type: 'Object' }
          }
        },
        
        {
          className: 'DiamondFactory',
          fields: {
            address: { type: 'String', required: true },
            network: { type: 'String', required: true },
            abi: { type: 'Object', required: true },
            deploymentTransaction: { type: 'String' },
            metadata: { type: 'Object' }
          }
        },
        
        {
          className: 'DiamondFacet',
          fields: {
            name: { type: 'String', required: true },
            address: { type: 'String', required: true },
            network: { type: 'String', required: true },
            abi: { type: 'Object', required: true },
            selectors: { type: 'Array' },
            metadata: { type: 'Object' }
          }
        },
        
        {
          className: 'Blockchain',
          fields: {
            name: { type: 'String', required: true },
            chainId: { type: 'Number', required: true },
            networkName: { type: 'String', required: true },
            rpcUrl: { type: 'String' },
            explorerUrl: { type: 'String' },
            isActive: { type: 'Boolean', defaultValue: true },
            metadata: { type: 'Object' }
          },
          indexes: {
            chainId: { chainId: 1 },
            networkName: { networkName: 1 }
          }
        },
        
        {
          className: 'DeploymentArtifact',
          fields: {
            contractName: { type: 'String', required: true },
            network: { type: 'String', required: true },
            address: { type: 'String', required: true },
            artifact: { type: 'Object', required: true },
            importedAt: { type: 'Date' },
            importedBy: { type: 'Pointer', targetClass: '_User' },
            isSystemContract: { type: 'Boolean', defaultValue: false }
          }
        },
        
        {
          className: 'FactoryContract',
          fields: {
            contractName: { type: 'String', required: true },
            address: { type: 'String', required: true },
            network: { type: 'Pointer', targetClass: 'NetworkConfig' },
            abi: { type: 'Object', required: true },
            contractType: { type: 'String' },
            importedAt: { type: 'Date' },
            importedBy: { type: 'Pointer', targetClass: '_User' },
            metadata: { type: 'Object' }
          }
        },
        
        {
          className: 'NetworkConfig',
          fields: {
            networkId: { type: 'String', required: true },
            displayName: { type: 'String', required: true },
            chainId: { type: 'Number', required: true },
            currency: { type: 'String' },
            explorerUrl: { type: 'String' },
            isActive: { type: 'Boolean', defaultValue: true },
            metadata: { type: 'Object' }
          },
          indexes: {
            chainId: { chainId: 1 },
            networkId: { networkId: 1}
          }
        },
        
        {
          className: 'OrgContract',
          fields: {
            organization: { type: 'Pointer', targetClass: 'Organization', required: true },
            network: { type: 'Pointer', targetClass: 'NetworkConfig', required: true },
            factoryContract: { type: 'Pointer', targetClass: 'FactoryContract' },
            contractAddress: { type: 'String', required: true },
            contractName: { type: 'String' },
            deploymentParams: { type: 'Object' },
            deployedAt: { type: 'Date' },
            deployedBy: { type: 'Pointer', targetClass: '_User' },
            metadata: { type: 'Object' }
          }
        },
        
        {
          className: 'ContractInteraction',
          fields: {
            organization: { type: 'Pointer', targetClass: 'Organization' },
            contract: { type: 'Pointer', targetClass: 'OrgContract' },
            user: { type: 'Pointer', targetClass: '_User' },
            method: { type: 'String', required: true },
            params: { type: 'Object' },
            result: { type: 'Object' },
            txHash: { type: 'String' },
            gasUsed: { type: 'Number' },
            error: { type: 'String' },
            executedAt: { type: 'Date' },
            ipAddress: { type: 'String' }
          }
        },
        
        {
          className: 'AlchemyUsage',
          fields: {
            organization: { type: 'Pointer', targetClass: 'Organization' },
            networkId: { type: 'String' },
            requests: { type: 'Number', defaultValue: 0 },
            usageDate: { type: 'Date' },
            breakdown: { type: 'Object' }
          }
        },
        
        {
          className: 'OrgAppInstallation',
          fields: {
            organization: { type: 'Pointer', targetClass: 'Organization', required: true },
            appDefinition: { type: 'Pointer', targetClass: 'AppDefinition', required: true },
            installedVersion: { type: 'Pointer', targetClass: 'AppVersion', required: true },
            status: { type: 'String', required: true },
            installationDate: { type: 'Date', required: true },
            lastUpdated: { type: 'Date' },
            installedBy: { type: 'Pointer', targetClass: '_User', required: true },
            updatedBy: { type: 'Pointer', targetClass: '_User' },
            configUpdatedBy: { type: 'Pointer', targetClass: '_User' },
            configuration: { type: 'Object', defaultValue: {} },
            permissions: { type: 'Array', defaultValue: [] }
          }
        }
      ];

      for (const schemaConfig of coreSchemas) {
        try {
          let schema;
          try {
            schema = await new Parse.Schema(schemaConfig.className).get({ useMasterKey: true });
          } catch (e) {
          }

          if (schema) {
            schemas.push(schemaConfig.className);

            if (schemaConfig.fields) {
              for (const fieldName in schemaConfig.fields) {
                const fieldConfig = schemaConfig.fields[fieldName];
                try {
                  await schema.addField(fieldName, fieldConfig.type, fieldConfig);
                } catch (fieldError) {
                  if (fieldError.code === 103) {
                    console.warn(`Field ${fieldName} in ${schemaConfig.className} already exists or has a conflict. Skipping addField.`);
                  } else {
                    throw fieldError;
                  }
                }
              }
            }

            if (schemaConfig.classLevelPermissions) {
              const clp = new Parse.CLP(schemaConfig.classLevelPermissions);
              schema.setCLP(clp);
            }

            if (schemaConfig.indexes) {
              for (const indexName in schemaConfig.indexes) {
                const indexFields = schemaConfig.indexes[indexName];
                await schema.addIndex(indexName, indexFields);
              }
            }

            await schema.update({ useMasterKey: true });

          } else {
            const newSchema = new Parse.Schema(schemaConfig.className);
            if (schemaConfig.fields) {
              newSchema.setFields(schemaConfig.fields);
            }
            if (schemaConfig.classLevelPermissions) {
              newSchema.setCLP(new Parse.CLP(schemaConfig.classLevelPermissions));
            }
            await newSchema.save({ useMasterKey: true });

            if (schemaConfig.indexes) {
              for (const indexName in schemaConfig.indexes) {
                const indexFields = schemaConfig.indexes[indexName];
                await newSchema.addIndex(indexName, indexFields, { useMasterKey: true });
              }
              await newSchema.update({ useMasterKey: true });
            }
            
            schemas.push(schemaConfig.className);
          }
        } catch (error) {
          errors.push({
            className: schemaConfig.className,
            error: error.message
          });
        }
      }

      try {
        const roleQuery = new Parse.Query(Parse.Role);
        roleQuery.equalTo('name', 'SystemAdmin');
        let systemAdminRole = await roleQuery.first({ useMasterKey: true });
        
        if (!systemAdminRole) {
          const roleACL = new Parse.ACL();
          roleACL.setPublicReadAccess(true);
          roleACL.setPublicWriteAccess(false);
          
          systemAdminRole = new Parse.Role('SystemAdmin', roleACL);
          await systemAdminRole.save(null, { useMasterKey: true });
        }
      } catch (error) {
        errors.push({
          className: 'Role:SystemAdmin',
          error: error.message
        });
      }

      return {
        success: errors.length === 0,
        schemas: schemas,
        errors: errors
      };
    } catch (error) {
      console.error('Error ensuring core schemas:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });
};