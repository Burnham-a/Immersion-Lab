/**
 * Utility functions for project data management
 */

/**
 * Save project data to localStorage
 * @param {string} projectId - The project ID
 * @param {Object} projectData - The project data to save
 */
export const saveProjectToLocalStorage = (projectId, projectData) => {
  try {
    // Make sure the project data includes a timestamp
    const dataToSave = {
      ...projectData,
      savedAt: projectData.savedAt || new Date().toISOString(),
    };

    // Save by project ID
    localStorage.setItem(projectId, JSON.stringify(dataToSave));

    // If there's a project code, also save by project code
    if (projectData.projectCode) {
      localStorage.setItem(projectData.projectCode, JSON.stringify(dataToSave));
    }

    return true;
  } catch (error) {
    console.error("Error saving project to localStorage:", error);
    throw error;
  }
};

/**
 * Get project data from localStorage
 * @param {string} projectId - The project ID or project code
 * @returns {Object|null} The project data or null if not found
 */
export const getProjectFromLocalStorage = (projectId) => {
  try {
    const data = localStorage.getItem(projectId);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error("Error retrieving project from localStorage:", error);
    throw error;
  }
};

/**
 * Generate a unique project code
 * @returns {string} A unique alphanumeric code
 */
export const generateProjectCode = () => {
  // Create a random 8-character alphanumeric code
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Get all saved projects
 * @returns {Array} Array of saved projects
 */
export const getAllSavedProjects = () => {
  try {
    const projects = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      try {
        const data = JSON.parse(localStorage.getItem(key));
        // Check if it's a project (has projectId property)
        if (data && data.projectId) {
          projects.push({
            ...data,
            storageKey: key,
          });
        }
      } catch (e) {
        // Skip items that aren't valid JSON (not our projects)
        continue;
      }
    }
    return projects;
  } catch (error) {
    console.error("Error retrieving all projects:", error);
    return [];
  }
};
