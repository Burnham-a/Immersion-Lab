# Immersion Lab

<p align="center">
  <img src="./src/assets/Logo_IL.svg" alt="Immersion Lab Logo" width="300"/>
</p>

A web application built by Perkins and Will for interactive exploration of 3D models and design options. Integrates with Speckle for a seamless workflow between design tools and the visualization environment. This app is part of the Innovation Incubator Research

## Features

- **Speckle Integration**: Seamless authentication and data exchange with Speckle
- **Interactive 3D Viewer**: Explore and interact with architectural models
- **Project Management**: Search, filter, and organize projects
- **Design Option Comparison**: Visualize and compare different design options
- **Geolocation**: Visualize projects in their geographic context with Google Maps
- **Project Sharing**: Generate shareable project numbers

## Getting Started

### Prerequisites

- Node.js (v16 or later)
- NPM or Yarn
- Speckle account on app.speckle.systems

### Installation

1. Clone the repository

   ```sh
   git clone https://github.com/Burnham-a/Immersion-Lab.git
   cd Immersion-Lab
   ```

2. Install dependencies

   ```sh
   npm install
   ```

3. Configure environment variables
   Create a `.env` file in the project root:

   ```
   VITE_SPECKLE_AUTH_URL=<your-speckle-auth-url>
   VITE_SPECKLE_API_URL=<your-speckle-api-url>
   ```

4. Start the development server

   ```sh
   npm run dev
   ```

5. Open http://localhost in your browser

## Usage

1. **Login with Speckle**: Access your projects and models
2. **Browse Projects**: Filter and select from your available projects
3. **Explore Models**: Navigate through 3D models using the built-in viewer
4. **Compare Design Options**: Switch between different design iterations
5. **Save & Share**: Generate project numbers to save and share your work

## Screenshots

## Project Structure

```
ImmersionLab/
├── src/
│   ├── assets/       # Images, styles, and static resources
│   ├── components/   # Vue components
│   ├── graphql/      # GraphQL queries and mutations
│   ├── router/       # Vue Router configuration
│   ├── scripts/      # Helper scripts
│   ├── stores/       # Pinia/Vuex stores
│   ├── types/        # TypeScript type definitions
│   ├── utils/        # Utility functions
│   ├── views/        # Vue page components
│   ├── App.vue       # Root component
│   └── main.ts       # Application entry point
├── public/           # Public static assets
├── index.html        # HTML entry point
└── package.json      # Project dependencies and scripts
```

## License

This project is licensed under the MIT License.

## Acknowledgments

- [Speckle](https://speckle.systems/) for providing the interoperability platform
- Perkins and Will Design Technology team for development support
- Will Franklin and Preston Pepe for there initial work here: https://github.com/PW-SEA-CoDe/InteractiveDesignModels
- Victor Wanderley Barbosa for helping to implement npm Speckle-Auth and troubleshooting
- Daniel Boba for troubelshooting and teaching.

## Disclaimers

Unfortunately we were not able to implement all the features we intended as other deadlines took over.

- Adding all animation elements from Step2 into the final App.
- Client App not being able to visualise the model.
