const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL;
const vercelProductionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL;
const vercelDeploymentUrl = process.env.VERCEL_URL;

export const siteUrl = new URL(
  configuredUrl ||
    (vercelProductionUrl && `https://${vercelProductionUrl}`) ||
    (vercelDeploymentUrl && `https://${vercelDeploymentUrl}`) ||
    "http://localhost:3000",
);
