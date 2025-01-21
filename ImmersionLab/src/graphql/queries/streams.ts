export const projectsQuery = `
  query UserProject($projectId: String!){
    project(id: $projectId) {
          name
          description
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
