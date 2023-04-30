import { GeneralIORouter } from "@lamus/qbasic-vm";
import {
  PoweredUP,
  BasicMotor,
  DuploTrainBaseSpeaker,
  Hub,
  HubLED,
  isWebBluetooth,
} from "node-poweredup";

export enum DeviceType {
  HUB_LED = 23,
  DUPLO_TRAIN_BASE_MOTOR = 41,
  DUPLO_TRAIN_BASE_SPEAKER = 42,
  DUPLO_TRAIN_BASE_COLOR_SENSOR = 43,
  DUPLO_TRAIN_BASE_SPEEDOMETER = 44,
}

export default function setup(generalIORouter: GeneralIORouter) {
  void typeof isWebBluetooth;
  const poweredUp = new PoweredUP();

  poweredUp.on("discover", (hub: Hub) => {
    console.log("discover", poweredUp, hub);
    if (hub.connected) {
      console.log("already connected");
      return;
    }

    console.log("connecting");
    hub
      .connect()
      .then(() => {
        console.log("connected");
      })
      .catch((e) => {
        console.error(e);
      });
  });
  generalIORouter.insertRoute("/poweredUp/scan", async (req) => {
    if (req.method !== "in") return;
    try {
      const result = await poweredUp.scan();
      if (result === true) return "1";
      return "0";
    } catch (e) {
      console.error(e);
      return "0";
    }
  });
  generalIORouter.insertRoute("/poweredUp/list", async (req) => {
    if (req.method !== "in") return;
    const result = poweredUp.getHubs().map((hub) => ({
      uuid: hub.uuid,
      name: hub.name,
      type: hub.type,
      connected: hub.connected,
      hardwareVersion: hub.hardwareVersion,
      firmwareVersion: hub.firmwareVersion,
      batteryLevel: hub.batteryLevel,
      rssi: hub.rssi,
      mac: hub.primaryMACAddress,
      ports: hub.ports,
    }));
    return JSON.stringify(result);
  });
  generalIORouter.insertRoute(
    "/poweredUp/:uuid/:port/setPower",
    async (req) => {
      if (req.method !== "out" || !req.params || !req.data) return;
      const device = await getDeviceInHubByPort<BasicMotor>(
        poweredUp,
        req.params["uuid"],
        req.params["port"]
      );
      await device.setPower(Number(req.data));
      return;
    }
  );
  generalIORouter.insertRoute("/poweredUp/:uuid/:port/brake", async (req) => {
    if (req.method !== "out" || !req.params) return;
    const device = await getDeviceInHubByPort<BasicMotor>(
      poweredUp,
      req.params["uuid"],
      req.params["port"]
    );
    await device.brake();
    return;
  });
  generalIORouter.insertRoute(
    "/poweredUp/:uuid/:port/rampPower",
    async (req) => {
      if (req.method !== "out" || !req.params || !req.data) return;
      const device = await getDeviceInHubByPort<BasicMotor>(
        poweredUp,
        req.params["uuid"],
        req.params["port"]
      );
      const [from, to, time] = req.data.split(",");
      await device.rampPower(Number(from), Number(to), Number(time));
      return;
    }
  );
  /**
   * BRAKE = 3,
    STATION_DEPARTURE = 5,
    WATER_REFILL = 7,
    HORN = 9,
    STEAM = 10
   */
  generalIORouter.insertRoute("/poweredUp/:uuid/playSound", async (req) => {
    if (req.method !== "out" || !req.params || !req.data) return;
    const device = await getDeviceInHubByType<DuploTrainBaseSpeaker>(
      poweredUp,
      req.params["uuid"],
      DeviceType.DUPLO_TRAIN_BASE_SPEAKER
    );
    await device.playSound(Number(req.data));
    console.log(req.data, device);
    return;
  });
  generalIORouter.insertRoute("/poweredUp/:uuid/playTone", async (req) => {
    if (req.method !== "out" || !req.params || !req.data) return;
    const device = await getDeviceInHubByType<DuploTrainBaseSpeaker>(
      poweredUp,
      req.params["uuid"],
      DeviceType.DUPLO_TRAIN_BASE_SPEAKER
    );
    device.playTone(Number(req.data));
    console.log(req.data, device);
    return;
  });
  /**
   *
    BLACK = 0,
    PINK = 1,
    PURPLE = 2,
    BLUE = 3,
    LIGHT_BLUE = 4,
    CYAN = 5,
    GREEN = 6,
    YELLOW = 7,
    ORANGE = 8,
    RED = 9,
    WHITE = 10,
    NONE = 255
   */
  generalIORouter.insertRoute("/poweredUp/:uuid/setLight", async (req) => {
    if (req.method !== "out" || !req.params || !req.data) return;
    const device = await getDeviceInHubByType<HubLED>(
      poweredUp,
      req.params["uuid"],
      DeviceType.HUB_LED
    );
    console.log(req.data, device);
    await device.setColor(Number(req.data));
    return;
  });

  return () => {
    poweredUp.getHubs().forEach((hub) => {
      if (!hub.connected) return;
      hub.disconnect();
    });
  };
}

async function getDeviceInHubByPort<T = unknown>(
  poweredUp: PoweredUP,
  uuid: string,
  port: string
): Promise<T> {
  const hub = poweredUp.getHubByUUID(uuid);
  const device = await hub.waitForDeviceAtPort(port);
  if (!device || typeof device !== "object")
    throw new Error("Device not found");

  return device as T;
}

async function getDeviceInHubByType<T = unknown>(
  poweredUp: PoweredUP,
  uuid: string,
  type: number
): Promise<T> {
  const hub = poweredUp.getHubByUUID(uuid);
  const device = await hub.waitForDeviceByType(type);
  if (!device || typeof device !== "object")
    throw new Error("Device not found");

  return device as T;
}
