<script setup>
import WelcomeItem from "./WelcomeItem.vue";
import DocumentationIcon from "./icons/IconDocumentation.vue";
import ToolingIcon from "./icons/IconTooling.vue";
import EcosystemIcon from "./icons/IconEcosystem.vue";
import CommunityIcon from "./icons/IconCommunity.vue";
import SupportIcon from "./icons/IconSupport.vue";
</script>

<template>
  <div class="welcome-container">
    <WelcomeItem class="main-welcome">
      <template #icon>
        <DocumentationIcon />
      </template>
      <template #heading>Innovation Incubator</template>

      <p class="welcome-intro">
        Step by Step guide to our Incubator Submission.
      </p>
    </WelcomeItem>

    <WelcomeItem>
      <template #icon>
        <ToolingIcon />
      </template>
      <template #heading>Step 1</template>

      <ul class="feature-list">
        <li>Add Google Tile to Blender</li>
        <li>Use Speckle convert Revit/Rhino to Blender</li>
        <li>Render the view in Blender</li>
      </ul>

      <div class="action-button">
        <router-link to="/Step1" class="btn">Explore Step 1</router-link>
      </div>
    </WelcomeItem>

    <WelcomeItem>
      <template #icon>
        <EcosystemIcon />
      </template>
      <template #heading>Step 2</template>

      <ul class="feature-list">
        <li>Use Visual Studio Code (VSC) to automate the conversion process</li>
        <li>Import Blender objects into 3.js</li>
        <li>Create animation/interaction in the web</li>
        <li>Create Sun Animation in the viewer</li>
      </ul>

      <div class="action-button">
        <router-link to="/Step2" class="btn">Explore Step 2</router-link>
      </div>
    </WelcomeItem>

    <WelcomeItem>
      <template #icon>
        <CommunityIcon />
      </template>
      <template #heading>Step 3</template>

      <ul class="feature-list">
        <li>Allow users to upload rvt/rhino models directly into web</li>
        <li>
          Sign into Speckle using Speckle Authentication developed by Victor
          Barbosa
        </li>
        <li>
          Embedding the Speckle Viewer into the website with full functionality
        </li>
      </ul>

      <div class="action-button">
        <router-link to="/Step3" class="btn">Explore Step 3</router-link>
      </div>
    </WelcomeItem>

    <WelcomeItem>
      <template #icon>
        <CommunityIcon />
      </template>
      <template #heading>Immersion Lab App</template>

      <ul class="feature-list">
        <li>
          Allow staff to go to login portal and authenticate through Speckle
        </li>
        <li>
          Allow staff to select project/models and assign models to design
          options
        </li>
        <li>Load the chosen design option into the interactive viewer</li>
        <li>
          Interact with the viewer by changing the background color and moving
          the objects
        </li>
        <li>
          Select the GoogleMaps area you wish to import into the viewer (in
          development)
        </li>
        <li>Save design options to a project code</li>
        <li>Share Project code with client</li>
        <li>
          Client input that number in the ClientApp to see the chosen options in
          the viewer
        </li>
      </ul>

      <div class="action-button">
        <router-link to="/ImmersionLab" class="btn"
          >Launch Immersion Lab</router-link
        >
      </div>
    </WelcomeItem>

    <WelcomeItem>
      <template #icon>
        <SupportIcon />
      </template>
      <template #heading>Limitations and Next Steps</template>

      <ul class="feature-list">
        <li>
          This workplan is more than achievable in 6 months, we already have the
          google tile workflow that PW have been working on this year
        </li>
        <li>
          We have already have prior experience with converting geometry using
          speckle based on previous hackathon experience
        </li>
        <li>
          The hours will be spent on researching how to combine the tools
          mentioned, designing a sleek workflow to try and automate a process
          that can be used on multiple projects going forward
        </li>
      </ul>
    </WelcomeItem>

    <WelcomeItem>
      <template #heading>Special Thanks</template>

      <p class="acknowledgements">
        • Will Franklin and Preston Pape, on initial discussions and their
        original work on 3JS framework
        <br />
        • Daniel Boba and Victor Wanderley Barbosa for their expertise and
        troubleshooting.
      </p>
    </WelcomeItem>
  </div>
</template>

<style scoped>
.welcome-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.main-welcome {
  margin-bottom: 2rem;
}

.welcome-intro {
  font-size: 1.1rem;
  margin-bottom: 1rem;
  color: #333;
}

.feature-list {
  padding-left: 1.5rem;
  margin: 1rem 0;
  line-height: 1.6;
}

.feature-list li {
  margin-bottom: 0.5rem;
}

.action-button {
  margin: 1.5rem 0 0.5rem;
}

.btn {
  display: inline-block;
  background-color: #4169e1;
  color: white;
  text-decoration: none;
  padding: 0.6rem 1.2rem;
  border-radius: 6px;
  font-weight: 500;
  transition: background-color 0.3s;
}

.btn:hover {
  background-color: #3050c7;
}

.acknowledgements {
  line-height: 1.6;
  margin-top: 1rem;
}
</style>
