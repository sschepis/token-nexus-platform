/* eslint-disable @typescript-eslint/no-explicit-any */
import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';
import { store } from '../../store/store';
import { logout } from '../../store/slices/authSlice';
import { handleApiError, handleNetworkError } from './errorHandler';

import { API_BASE_URL } from '@/config/apiConfig';

const axiosConfig: AxiosRequestConfig = {
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
};

const api: AxiosInstance = axios.create(axiosConfig);

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const state = store.getState();
    const { token, orgId } = state.auth;
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add orgId to all requests for multi-tenancy
    if (orgId && config.method !== 'get') {
      const data = config.data || {};
      config.data = { ...data, orgId };
    } else if (orgId && config.method === 'get') {
      config.params = { ...config.params, orgId };
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response) {
      const { status } = error.response;
      
      if (status === 401) {
        store.dispatch(logout());
        handleApiError(status);
      } else if (status === 403) {
        handleApiError(status);
      } else if (status === 500) {
        handleApiError(status);
      } else {
        handleApiError(status, (error.response?.data as any)?.message || error.message);
      }
    } else if (error.request) {
      handleNetworkError();
    }
    
    return Promise.reject(error);
  }
);

// Utility for mock API responses
export const mockResponse = (data: any, delay = 500): Promise<any> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ data });
      }, delay);
    });
};

export const apiService: Record<string, any> = {}; // This will be populated from other modules