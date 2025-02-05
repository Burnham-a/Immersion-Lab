<script setup>
import WelcomeItem from "./WelcomeItem.vue";
import DocumentationIcon from "./icons/IconDocumentation.vue";
import ToolingIcon from "./icons/IconTooling.vue";
import EcosystemIcon from "./icons/IconEcosystem.vue";
import CommunityIcon from "./icons/IconCommunity.vue";
import SupportIcon from "./icons/IconSupport.vue";
</script>

<template>
  <WelcomeItem>
    <template #icon>
      <DocumentationIcon />
    </template>
    <template #heading>Innovation Incubator</template>

    Step by Step guid to our Incubator Submission.
  </WelcomeItem>

  <WelcomeItem>
    <template #icon>
      <ToolingIcon />
    </template>
    <template #heading>Step 1</template>

    • Add Google Tile to Blender <br />
    • Use Speckle convert Revit/Rhino to Blender <br />
    • Use After Effects to create design option animation <br />

    <br />
    <router-link to="/Step1"><code>Click Here</code></router-link>
  </WelcomeItem>

  <WelcomeItem>
    <template #icon>
      <EcosystemIcon />
    </template>
    <template #heading>Step 2</template>

    • Use Visual Studio Code (VSC) to automate the conversion process <br />
    • Import Blender objects into 3.js <br />
    • Create animation/ interaction in the web <br />

    <br />
    <router-link to="/Step2"><code>Click Here</code></router-link>
  </WelcomeItem>

  <WelcomeItem>
    <template #icon>
      <CommunityIcon />
    </template>
    <template #heading>Step 3</template>

    • Allow users to upload rvt models directly into web <br />
    • Using VSC should convert rvt to blender automatically and push to web
    <br />
    • Should be able to update design option animations directly in web without
    the need of software <br />

    <br />
    <router-link to="/Step3"><code>Click Here</code></router-link>
    >.
  </WelcomeItem>

  <WelcomeItem>
    <template #icon>
      <SupportIcon />
    </template>
    <template #heading>Limitations and Next Steps</template>

    • This workplan is more than acheivable in 6 months, we already have the
    google tile workflow that PW have been working on this year <br />
    • We have already have prior experience with converting geometry using
    speckle based on previous hackathon experience<br />
    • The hours will be spent on researching how to combine the tools mentioned,
    designing a sleek workflow to try and automate a process that can be used on
    multiple projects going forward
  </WelcomeItem>

  <WelcomeItem>
    <template #heading>Special Thanks</template>

    • Will Franklin and Preston Pape, on initial discussions and their original
    work on 3JS framework
    <br />
    • Daniel Boba and Victor Wanderley Barbosa for their expertise and
    troubleshooting.
  </WelcomeItem>
</template>
