window.process ||= {
  //@ts-expect-error This is to fake an environment
  env: {},
  arch: "unknown",
  //@ts-expect-error This is to fake an environment
  platform: "browser",
};
window.global ||= window;
