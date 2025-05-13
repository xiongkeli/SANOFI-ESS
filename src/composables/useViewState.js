import { ref, computed } from 'vue'

/**
 * Manages view state for the application, controlling which view is currently displayed.
 * Provides functionality to switch between file upload view and data view.
 *
 * @returns {Object} An object containing state and methods to manage views
 */
export function useViewState() {
  // Define possible view states
  const VIEW_STATES = {
    FILE_UPLOAD: 'file_upload',
    DATA_VIEW: 'data_view'
  }

  // Current view state, defaulting to file upload
  const currentView = ref(VIEW_STATES.FILE_UPLOAD)

  // Computed properties to easily check current view state
  const isFileUploadView = computed(() => currentView.value === VIEW_STATES.FILE_UPLOAD)
  const isDataView = computed(() => currentView.value === VIEW_STATES.DATA_VIEW)

  /**
   * Switch to file upload view
   */
  function switchToFileUploadView() {
    currentView.value = VIEW_STATES.FILE_UPLOAD
  }

  /**
   * Switch to data view
   */
  function switchToDataView() {
    currentView.value = VIEW_STATES.DATA_VIEW
  }

  return {
    // Computed properties for view state
    isFileUploadView,
    isDataView,

    // Methods to change view state
    switchToFileUploadView,
    switchToDataView
  }
}
