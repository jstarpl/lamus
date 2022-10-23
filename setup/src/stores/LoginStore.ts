import React from "react";
import { TypeCheckingRule, Rules } from "validatorjs";
import { makeAutoObservable } from "mobx";
import Validator from "validatorjs";
import { NotificationStore } from "./NotificationStore";
import { AppStore } from "./AppStore";

type LoginMode = "qrcode" | "text";

type TypeRule = string | Array<string | TypeCheckingRule> | Rules;

interface IFormInput {
  value: string;
  default: "";
  error: string | false;
  rule: TypeRule;
}

interface IForm {
  fields: {
    token: IFormInput;
    [key: string]: IFormInput;
  };
  meta: {
    isValid: boolean;
    error: string | false;
  };
}

class LoginStoreClass {
  loginMode: LoginMode = "text";
  pending: boolean = false;
  notification: string | null = null;

  form: IForm = {
    fields: {
      token: {
        value: "",
        default: "",
        error: false,
        rule: "required",
      },
    },
    meta: {
      isValid: true,
      error: false,
    },
  };

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  setLoginMode(mode: LoginMode) {
    this.loginMode = mode;
  }

  async login(deviceId: string): Promise<boolean> {
    if (AppStore.loggedIn) return false;
    let result = false;
    try {
      this.setPending(true);
      result = await AppStore.login(deviceId);
      this.setPending(false);
    } catch (e) {
      console.error(e);
    }

    return result;
  }

  setPending(value: boolean = true) {
    if (value) {
      this.pending = true;
      this.notification = NotificationStore.push({ message: "Logging in..." });
    } else {
      this.pending = false;
      if (this.notification) NotificationStore.remove(this.notification);
    }
  }

  onFieldChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) {
    const fieldName = e.target.name;
    const value = e.target.value;

    // ensure that this is indeed keyof IForm["fields"]
    if (!Object.keys(this.form.fields).includes(fieldName)) return;

    this.form.fields[fieldName].value = value;

    let { token } = this.form.fields;
    var validation = new Validator(
      { token: token.value },
      { token: token.rule }
    );
    this.form.meta.isValid = !!validation.passes();

    this.form.fields[fieldName].error = validation.errors.first(fieldName);

    console.log(this.form.fields.token.value);
  }

  onFormReset() {
    Object.keys(this.form.fields).forEach((fieldName) => {
      this.form.fields[fieldName].value = this.form.fields[fieldName].default;
    });
  }
}

export const LoginStore = new LoginStoreClass();
