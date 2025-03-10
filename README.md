# Immersion Lab

Immersion Lab is a web application designed to help staff add models and save projects. The application integrates with Speckle for authentication and project management, and provides a viewer for 3D models and a Google Map component.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [License](#license)

## Features

- **Speckle Authentication**: Authenticate users with Speckle.
- **Project Management**: Search, filter, and select projects.
- **Design Options**: Assign models to different design options.
- **3D Model Viewer**: View and interact with 3D models.
- **Google Map Integration**: Display project locations on a map.
- **Project Number Generator**: Generate and copy project numbers.
- **Save Projects**: Save project data to local storage.

## Installation

1. Clone the repository:

   ```sh
   git clone https://github.com/yourusername/immersion-lab.git
   cd immersion-lab
   ```

2. Install dependencies:

   ```sh
   npm install
   ```

3. Create a `.env` file in the `ImmersionLab` directory and add your environment variables:
   ```env
   VITE_SPECKLE_AUTH_URL=<your-speckle-auth-url>
   VITE_SPECKLE_API_URL=<your-speckle-api-url>
   ```

## Usage

1. Start the development server:

   ```sh
   npm run dev
   ```

2. Open your browser and navigate to `http://localhost:3000`.

3. Authenticate with Speckle to access projects.

4. Use the search bar to filter projects and select a project to view its details.

5. Assign models to design options and view them in the 3D viewer.

6. Save the project with a generated project number.

## Project Structure

```
ImmersionLab/
├── .env
├── .gitignore
├── env.d.ts
├── index.html
├── package.json
├── README.md
├── tsconfig.app.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── .vscode/
│   ├── extensions.json
│   └── settings.json
├── public/
│   ├── favicon.ico
├── src/
│   ├── App.vue
│   ├── main.ts
│   ├── shims-vue.d.ts
│   ├── assets/
│   │   ├── base.css
│   │   ├── Density.gif
│   │   ├── Innovation-Inncubator-Update.gif
│   │   ├── Logo_IL.svg
│   │   ├── logo.svg
│   │   ├── main.css
│   │   ├── draco/
│   │   └── Oxford Tile/
│   ├── components/
│   ├── graphql/
│   ├── router/
│   ├── scripts/
│   ├── stores/
│   ├── types/
│   ├── utils/
│   └── views/
│       └── ImmersionLabSetup.vue
```

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any improvements or bug fixes.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
