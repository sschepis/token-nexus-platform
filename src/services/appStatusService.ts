// src/services/appStatusService.ts
import { PlatformState, PlatformStatus } from '../types/app';

/**
 * Function to check platform status
 */
export async function checkPlatformStatus(): Promise<PlatformStatus> {
  try {
    const response = await fetch('/api/app-status');
    const data = await response.json();
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('platformStatus', JSON.stringify(data)); // Cache the status
    }
    return data;
  } catch (error) {
    console.error('Failed to check platform status:', error);
    return {
      status: 'ERROR',
      error: error instanceof Error ? error.message : 'Failed to check platform status'
    };
  }
}

/**
 * Complete initial setup function
 */
export async function completeInitialSetup(setupData: {
  parentOrgName: string;
  adminUserEmail: string;
  adminUserPassword: string;
  adminUserFirstName?: string;
  adminUserLastName?: string;
}): Promise<{ success: boolean; parentOrgId?: string; error?: string }> {
  try {
    const response = await fetch('/api/setup/complete-initial-setup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(setupData),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Complete setup error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Setup failed',
    };
  }
}

/**
 * Bootstrap login function
 */
export async function bootstrapLogin(username: string, password: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('/api/auth/bootstrap-login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Bootstrap login error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Bootstrap login failed',
    };
  }
}