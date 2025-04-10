export const projectsQuery = `
query UserProjectsAndModels {
  activeUser {
    projects(limit: 100) {
      items {
        id
        name
        models {
          items {
            id
            name
            versions {
              totalCount
            }
          }
        }
      }
    }
  }
}`;
