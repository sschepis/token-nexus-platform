import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { v4 as uuidv4 } from 'uuid';
import { ParseTrigger, TriggerState, CreateTriggerRequest, UpdateTriggerRequest } from '@/types/triggers';

const initialState: TriggerState = {
  triggers: [
    {
      id: uuidv4(),
      name: 'validateUserEmail',
      description: 'Validates user email format before saving',
      className: 'User',
      triggerType: 'beforeSave',
      code: `Parse.Cloud.beforeSave("User", (request) => {
  const user = request.object;
  const email = user.get("email");
  
  if (email && !email.includes("@")) {
    throw new Error("Invalid email format");
  }
  
  // Auto-lowercase email
  if (email) {
    user.set("email", email.toLowerCase());
  }
});`,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
      executionCount: 1250,
      tags: ['validation', 'user']
    },
    {
      id: uuidv4(),
      name: 'logPostCreation',
      description: 'Logs when a new post is created',
      className: 'Post',
      triggerType: 'afterSave',
      code: `Parse.Cloud.afterSave("Post", (request) => {
  const post = request.object;
  const user = request.user;
  
  if (post.existed()) {
    return; // Only log new posts
  }
  
  console.log(\`New post created: \${post.id} by user \${user ? user.id : 'anonymous'}\`);
  
  // Could send notification, update analytics, etc.
});`,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
      executionCount: 890,
      tags: ['logging', 'post']
    }
  ],
  selectedTriggerId: null,
  isLoading: false,
  error: null,
  availableClasses: ['User', 'Post', 'Comment', 'Product', 'Order', 'Category']
};

export const triggerSlice = createSlice({
  name: 'trigger',
  initialState,
  reducers: {
    addTrigger: (state, action: PayloadAction<CreateTriggerRequest>) => {
      const newTrigger: ParseTrigger = {
        id: uuidv4(),
        ...action.payload,
        status: 'draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1,
        executionCount: 0
      };
      state.triggers.push(newTrigger);
    },
    
    updateTrigger: (state, action: PayloadAction<UpdateTriggerRequest>) => {
      const { id, ...updates } = action.payload;
      const triggerIndex = state.triggers.findIndex(trigger => trigger.id === id);
      
      if (triggerIndex >= 0) {
        state.triggers[triggerIndex] = {
          ...state.triggers[triggerIndex],
          ...updates,
          updatedAt: new Date().toISOString(),
          version: (state.triggers[triggerIndex].version || 1) + 1
        };
      }
    },
    
    deleteTrigger: (state, action: PayloadAction<string>) => {
      const triggerId = action.payload;
      state.triggers = state.triggers.filter(trigger => trigger.id !== triggerId);
      
      if (state.selectedTriggerId === triggerId) {
        state.selectedTriggerId = null;
      }
    },
    
    setSelectedTrigger: (state, action: PayloadAction<string | null>) => {
      state.selectedTriggerId = action.payload;
    },
    
    setTriggerStatus: (state, action: PayloadAction<{ id: string; status: ParseTrigger['status'] }>) => {
      const { id, status } = action.payload;
      const triggerIndex = state.triggers.findIndex(trigger => trigger.id === id);
      
      if (triggerIndex >= 0) {
        state.triggers[triggerIndex].status = status;
        state.triggers[triggerIndex].updatedAt = new Date().toISOString();
      }
    },
    
    incrementTriggerExecution: (state, action: PayloadAction<{ id: string; success: boolean }>) => {
      const { id, success } = action.payload;
      const triggerIndex = state.triggers.findIndex(trigger => trigger.id === id);
      
      if (triggerIndex >= 0) {
        state.triggers[triggerIndex].executionCount = (state.triggers[triggerIndex].executionCount || 0) + 1;
        state.triggers[triggerIndex].lastExecuted = new Date().toISOString();
        
        if (!success) {
          state.triggers[triggerIndex].errorCount = (state.triggers[triggerIndex].errorCount || 0) + 1;
        }
      }
    },
    
    setAvailableClasses: (state, action: PayloadAction<string[]>) => {
      state.availableClasses = action.payload;
    },
    
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    }
  },
});

export const { 
  addTrigger, 
  updateTrigger, 
  deleteTrigger, 
  setSelectedTrigger,
  setTriggerStatus,
  incrementTriggerExecution,
  setAvailableClasses,
  setLoading,
  setError
} = triggerSlice.actions;

export default triggerSlice.reducer;