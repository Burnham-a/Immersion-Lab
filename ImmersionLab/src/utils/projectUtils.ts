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

export function saveDetailedProjectToLocalStorage(
  project: any,
  designOptions: any,
  selectedOption: string,
  backgroundColor: string
) {
  // Validate project data
  if (!project || !project.id || typeof project.id !== "string") {
    console.error("Invalid project data:", project);
    throw new Error("Invalid project data or project number.");
  }

  try {
    // Create a simplified project object to store
    const projectToSave = {
      id: project.id,
      name: project.name || "Unnamed Project",
      designOptions: {
        Option1: (designOptions?.Option1 || []).map((opt: any) => ({
          id: opt.id,
          name: opt.name,
        })),
        Option2: (designOptions?.Option2 || []).map((opt: any) => ({
          id: opt.id,
          name: opt.name,
        })),
      },
      selectedOption: selectedOption || "Option1",
      backgroundColor: backgroundColor || "#ffffff",
      savedAt: new Date().toISOString(),
    };

    // Use project ID as key for storage
    const storageKey = `immersion-lab-project-${project.id}`;
    localStorage.setItem(storageKey, JSON.stringify(projectToSave));
    console.log(`Project saved to local storage with key: ${storageKey}`);
    return storageKey;
  } catch (error) {
    console.error("Error saving project to local storage:", error);
    throw new Error(
      `Failed to save project: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

export function getProjectFromLocalStorage(projectId: string) {
  if (!projectId) {
    console.error("Invalid project ID provided");
    return null;
  }

  try {
    const storageKey = `immersion-lab-project-${projectId}`;
    const projectData = localStorage.getItem(storageKey);

    if (!projectData) {
      console.log(`No saved data found for project ID: ${projectId}`);
      return null;
    }

    return JSON.parse(projectData);
  } catch (error) {
    console.error("Error retrieving project from local storage:", error);
    return null;
  }
}
