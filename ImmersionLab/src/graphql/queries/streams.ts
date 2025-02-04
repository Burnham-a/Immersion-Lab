export const projectsQuery = `
query UserProjectsAndModels {
  activeUser {
    projects {
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
