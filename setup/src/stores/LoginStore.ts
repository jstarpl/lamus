import { makeAutoObservable } from "mobx";

type LoginMode = "qrcode" | "text";

class LoginStoreClass {
  loginMode: LoginMode = "text";

  constructor() {
    makeAutoObservable(this);
  }

  setLoginMode(mode: LoginMode) {
    this.loginMode = mode;
  }
}

export const LoginStore = new LoginStoreClass();
