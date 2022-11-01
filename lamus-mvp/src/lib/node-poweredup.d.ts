import PoweredUP from "node-poweredup";

declare global {
  interface Window {
    PoweredUP: {
      PoweredUP: new () => PoweredUP;
    };
  }
}
