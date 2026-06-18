import { defaultBackend, defineSandbox } from "eve/sandbox";

export default defineSandbox({
  backend: defaultBackend({
    docker: {
      env: {
        CI: "true",
        NEXT_TELEMETRY_DISABLED: "1",
      },
      networkPolicy: "allow-all",
    },
    microsandbox: {
      env: {
        CI: "true",
        NEXT_TELEMETRY_DISABLED: "1",
      },
      networkPolicy: "allow-all",
    },
    vercel: {
      networkPolicy: "allow-all",
    },
  }),
  async onSession({ use }) {
    await use();
  },
});
