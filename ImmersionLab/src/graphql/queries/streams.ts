export const projectsQuery = `
  query UserProjects {
    activeUser {
      projects {
        items {
          name
          description
          id
          role
          models {
            items {
              name
              id
            }
          }
        }
      }
    }
  }
`;
