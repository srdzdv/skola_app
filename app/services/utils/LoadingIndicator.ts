import { EventEmitter } from 'events'

/**
 * Event emitter for managing loading indicator state
 */
class LoadingIndicatorManager extends EventEmitter {
  private isVisible: boolean = false
  private message: string = "Cargando..."

  show(message?: string) {
    this.isVisible = true
    if (message) this.message = message
    this.emit('show', { visible: true, message: this.message })
  }

  hide() {
    this.isVisible = false
    this.emit('hide', { visible: false, message: this.message })
  }

  getState() {
    return { visible: this.isVisible, message: this.message }
  }
}

// Singleton instance
export const loadingIndicatorManager = new LoadingIndicatorManager()

/**
 * Show the loading indicator with optional message
 */
export const showLoadingIndicator = (message?: string) => {
  loadingIndicatorManager.show(message)
}

/**
 * Hide the loading indicator
 */
export const hideLoadingIndicator = () => {
  loadingIndicatorManager.hide()
}
