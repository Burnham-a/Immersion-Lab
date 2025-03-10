// src/utils/projectUtils.ts

/**
 * Saves the project to localStorage.
 * @param projectNumber - The project number or ID used as a key.
 * @param projectData - The data representing the project (e.g., models, viewer state).
 */
export const saveProjectToLocalStorage = (
  projectNumber: string,
  projectData: any
) => {
  if (!projectNumber || !projectData) {
    console.error("Invalid project data or project number.");
    return;
  }

  try {
    // Save project data in localStorage
    localStorage.setItem(projectNumber, JSON.stringify(projectData));
    console.log("Project saved successfully!");
  } catch (error) {
    console.error("Error saving project:", error);
  }
};

/**
 * Loads the project data from localStorage using the project number.
 * @param projectNumber - The project number or ID used as a key.
 * @returns The project data or null if not found.
 */
export const loadProjectFromLocalStorage = (projectNumber: string) => {
  if (!projectNumber) {
    console.error("Project number is required.");
    return null;
  }

  try {
    // Get project data from localStorage
    const projectData = localStorage.getItem(projectNumber);
    if (projectData) {
      console.log("Project loaded successfully!");
      return JSON.parse(projectData);
    } else {
      console.log("No project found for the provided number.");
      return null;
    }
  } catch (error) {
    console.error("Error loading project:", error);
    return null;
  }
};

/**
 * Deletes the project from localStorage.
 * @param projectNumber - The project number or ID used as a key.
 */
export const deleteProjectFromLocalStorage = (projectNumber: string) => {
  if (!projectNumber) {
    console.error("Project number is required.");
    return;
  }

  try {
    localStorage.removeItem(projectNumber);
    console.log("Project deleted successfully!");
  } catch (error) {
    console.error("Error deleting project:", error);
  }
};
