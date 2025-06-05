import { IResolvers } from '@graphql-tools/utils';
import { GraphQLScalarType, Kind } from 'graphql';
import { mfaService } from '../services/MFAService';
import { Logger } from '../utils/logger';
import Parse from 'parse/node';

const logger = new Logger('graphql-resolvers');

interface Context {
  user?: Parse.User;
  auth?: {
    sessionToken?: string;
  };
  pubsub?: any;
}

// Custom scalar types
const DateScalar = new GraphQLScalarType({
  name: 'Date',
  description: 'Date custom scalar type',
  parseValue(value: any): Date {
    return new Date(value);
  },
  serialize(value: any): string {
    return new Date(value).toISOString();
  },
  parseLiteral(ast): Date | null {
    if (ast.kind === Kind.STRING || ast.kind === Kind.INT) {
      return new Date(ast.value);
    }
    return null;
  },
});

const ObjectScalar = new GraphQLScalarType({
  name: 'Object',
  description: 'Object custom scalar type',
  parseValue(value: any): Record<string, any> {
    return typeof value === 'object' ? value : {};
  },
  serialize(value: any): Record<string, any> {
    return value;
  },
  parseLiteral(ast): Record<string, any> {
    if (ast.kind === Kind.OBJECT) {
      const value = {};
      ast.fields.forEach(field => {
        if (field.value.kind === Kind.STRING || field.value.kind === Kind.INT) {
          value[field.name.value] = field.value.value;
        }
      });
      return value;
    }
    return {};
  },
});

const resolvers: IResolvers = {
  Date: DateScalar,
  Object: ObjectScalar,

  Query: {
    // User queries
    me: async (_: any, __: any, { user }: Context) => {
      if (!user) return null;
      return user;
    },

    user: async (_: any, { id }: { id: string }, { auth }: Context) => {
      try {
        const query = new Parse.Query('_User');
        return await query.get(id, { useMasterKey: true });
      } catch (error) {
        logger.error('Failed to fetch user', { error, userId: id });
        throw error;
      }
    },

    users: async (_: any, { limit = 100, skip = 0, where }: { limit?: number; skip?: number; where?: any }, { auth }: Context) => {
      try {
        const query = new Parse.Query('_User');
        if (where) query.withJSON(where);
        query.limit(limit);
        query.skip(skip);
        return await query.find({ useMasterKey: true });
      } catch (error) {
        logger.error('Failed to fetch users', { error, where });
        throw error;
      }
    },

    // Organization queries
    organization: async (_: any, { id }: { id: string }, { auth }: Context) => {
      try {
        const query = new Parse.Query('Organization');
        return await query.get(id, { sessionToken: auth?.sessionToken });
      } catch (error) {
        logger.error('Failed to fetch organization', { error, orgId: id });
        throw error;
      }
    },

    organizations: async (_: any, { limit = 100, skip = 0, where }: { limit?: number; skip?: number; where?: any }, { auth }: Context) => {
      try {
        const query = new Parse.Query('Organization');
        if (where) query.withJSON(where);
        query.limit(limit);
        query.skip(skip);
        return await query.find({ sessionToken: auth?.sessionToken });
      } catch (error) {
        logger.error('Failed to fetch organizations', { error, where });
        throw error;
      }
    },

    myOrganizations: async (_: any, __: any, { user, auth }: Context) => {
      if (!user) return [];
      try {
        const query = new Parse.Query('Organization');
        query.equalTo('members', user);
        return await query.find({ sessionToken: auth?.sessionToken });
      } catch (error) {
        logger.error('Failed to fetch user organizations', { error, userId: user.id });
        throw error;
      }
    },

    // Application queries
    application: async (_: any, { id }: { id: string }, { auth }: Context) => {
      try {
        const query = new Parse.Query('Application');
        return await query.get(id, { sessionToken: auth?.sessionToken });
      } catch (error) {
        logger.error('Failed to fetch application', { error, appId: id });
        throw error;
      }
    },

    applications: async (_: any, { limit = 100, skip = 0, where }: { limit?: number; skip?: number; where?: any }, { auth }: Context) => {
      try {
        const query = new Parse.Query('Application');
        if (where) query.withJSON(where);
        query.limit(limit);
        query.skip(skip);
        return await query.find({ sessionToken: auth?.sessionToken });
      } catch (error) {
        logger.error('Failed to fetch applications', { error, where });
        throw error;
      }
    },
  },

  Mutation: {
    // User mutations
    createUser: async (_: any, { input }: { input: any }) => {
      try {
        const user = new Parse.User();
        user.set(input);
        await user.signUp();
        return user;
      } catch (error) {
        logger.error('Failed to create user', { error, input });
        throw error;
      }
    },

    updateUser: async (_: any, { id, input }: { id: string; input: any }, { auth }: Context) => {
      try {
        const query = new Parse.Query('_User');
        const user = await query.get(id);
        Object.keys(input).forEach(key => user.set(key, input[key]));
        return await user.save({}, { sessionToken: auth?.sessionToken });
      } catch (error) {
        logger.error('Failed to update user', { error, userId: id, input });
        throw error;
      }
    },

    // MFA mutations
    setupMFA: async (_: any, __: any, { user }: Context) => {
      if (!user) throw new Error('Authentication required');
      try {
        return await mfaService.generateSetup(user);
      } catch (error) {
        logger.error('Failed to setup MFA', { error, userId: user.id });
        throw error;
      }
    },

    verifyAndEnableMFA: async (_: any, { token }: { token: string }, { user }: Context) => {
      if (!user) throw new Error('Authentication required');
      try {
        await mfaService.verifyAndEnable(user, token);
        return true;
      } catch (error) {
        logger.error('Failed to verify and enable MFA', { error, userId: user.id });
        throw error;
      }
    },

    // Organization mutations
    createOrganization: async (_: any, { input }: { input: any }, { user, auth }: Context) => {
      if (!user) throw new Error('Authentication required');
      try {
        const Organization = Parse.Object.extend('Organization');
        const org = new Organization();
        org.set({ ...input, members: [user] });
        return await org.save({}, { sessionToken: auth?.sessionToken });
      } catch (error) {
        logger.error('Failed to create organization', { error, input });
        throw error;
      }
    },

    updateOrganization: async (_: any, { id, input }: { id: string; input: any }, { auth }: Context) => {
      try {
        const query = new Parse.Query('Organization');
        const org = await query.get(id, { sessionToken: auth?.sessionToken });
        Object.keys(input).forEach(key => org.set(key, input[key]));
        return await org.save({}, { sessionToken: auth?.sessionToken });
      } catch (error) {
        logger.error('Failed to update organization', { error, orgId: id, input });
        throw error;
      }
    },
  },

  Subscription: {
    userUpdated: {
      subscribe: (_: any, { id }: { id: string }, { pubsub }: Context) => 
        pubsub.asyncIterator(`user_${id}_updated`),
    },
    organizationUpdated: {
      subscribe: (_: any, { id }: { id: string }, { pubsub }: Context) => 
        pubsub.asyncIterator(`organization_${id}_updated`),
    },
    applicationUpdated: {
      subscribe: (_: any, { id }: { id: string }, { pubsub }: Context) => 
        pubsub.asyncIterator(`application_${id}_updated`),
    },
    pageUpdated: {
      subscribe: (_: any, { id }: { id: string }, { pubsub }: Context) => 
        pubsub.asyncIterator(`page_${id}_updated`),
    },
  },

  // Type resolvers
  User: {
    roles: async (user: Parse.User, _: any, { auth }: Context) => {
      try {
        const query = new Parse.Query('_Role');
        query.equalTo('users', user);
        return await query.find({ sessionToken: auth?.sessionToken });
      } catch (error) {
        logger.error('Failed to fetch user roles', { error, userId: user.id });
        return [];
      }
    },
    organizations: async (user: Parse.User, _: any, { auth }: Context) => {
      try {
        const query = new Parse.Query('Organization');
        query.equalTo('members', user);
        return await query.find({ sessionToken: auth?.sessionToken });
      } catch (error) {
        logger.error('Failed to fetch user organizations', { error, userId: user.id });
        return [];
      }
    },
  },

  Organization: {
    members: async (org: Parse.Object, _: any, { auth }: Context) => {
      try {
        const members = org.get('members');
        if (members && members.query) {
          return await members.query().find({ sessionToken: auth?.sessionToken });
        }
        return [];
      } catch (error) {
        logger.error('Failed to fetch organization members', { error, orgId: org.id });
        return [];
      }
    },
    applications: async (org: Parse.Object, _: any, { auth }: Context) => {
      try {
        const query = new Parse.Query('Application');
        query.equalTo('organization', org);
        return await query.find({ sessionToken: auth?.sessionToken });
      } catch (error) {
        logger.error('Failed to fetch organization applications', { error, orgId: org.id });
        return [];
      }
    },
  },
};

export default resolvers;
