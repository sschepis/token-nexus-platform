// src/controllers/services/ActionEventEmitter.ts
import { ActionEvent, ActionEventListener } from '../types/actionEvents';

/**
 * Service for emitting and managing action-related events.
 */
export class ActionEventEmitter {
  private eventListeners: ActionEventListener[] = [];

  /**
   * Add event listener
   */
  public addEventListener(listener: ActionEventListener): void {
    this.eventListeners.push(listener);
  }

  /**
   * Remove event listener
   */
  public removeEventListener(listener: ActionEventListener): void {
    const index = this.eventListeners.indexOf(listener);
    if (index > -1) {
      this.eventListeners.splice(index, 1);
    }
  }

  /**
   * Emit an action event
   */
  public emitEvent(event: ActionEvent): void {
    this.eventListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error(`Error in event listener for event ${event.type}:`, error);
      }
    });
  }
}

export const actionEventEmitter = new ActionEventEmitter();