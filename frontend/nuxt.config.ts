// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2024-04-03",
  devtools: { enabled: true },
  modules: ["nuxt-quasar-ui"],
  runtimeConfig: {
    public: {
      apiBase: "",
    },
  },
  quasar: {
    plugins: ["Notify", "Dialog"],
    config: {
      notify: {
        position: "bottom-right",
      },
    },
  },
  ssr: false, //For simiplcity, we are not using SSR
  typescript: {
    typeCheck: true,
  },
});
