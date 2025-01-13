import {
  Viewer,
  DefaultViewerParams,
  SpeckleLoader,
  UrlHelper,
} from "@speckle/viewer";
import { CameraController, SelectionExtension } from "@speckle/viewer";

export async function initializeViewer(
  container: HTMLElement,
  projectUrl: "https://app.speckle.systems/projects/7b434814e7/models/af0b69d890",
  token: "b562555b6d"
) {
  try {
    const params = { ...DefaultViewerParams };
    params.showStats = true;
    params.verbose = true;

    const viewer = new Viewer(container, params);
    await viewer.init();

    const urls = await UrlHelper.getResourceUrls(projectUrl, token);
    console.log("Resolved Speckle URLs:", urls);

    for (const url of urls) {
      const loader = new SpeckleLoader(viewer.getWorldTree(), url, token);
      await viewer.loadObject(loader, true);
    }

    console.log("Viewer initialized successfully");
  } catch (error) {
    console.error("Failed to initialize viewer:", error);
    throw error;
  }
}
