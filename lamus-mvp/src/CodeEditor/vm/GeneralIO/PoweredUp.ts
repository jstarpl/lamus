import { GeneralIORouter } from "@lamus/qbasic-vm";
import {
  PoweredUP,
  BasicMotor,
  DuploTrainBaseSpeaker,
  Hub,
} from "node-poweredup";

export default function setup(generalIORouter: GeneralIORouter) {
  const poweredUp = new window.PoweredUP.PoweredUP();

  poweredUp.on("discover", (hub: Hub) => {
    console.log("discover", hub);
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
    const result = poweredUp.getHubs();
    return JSON.stringify(
      result.map((hub) => ({
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
      }))
    );
  });
  generalIORouter.insertRoute(
    "/poweredUp/:uuid/:port/setPower",
    async (req) => {
      if (req.method !== "out" || !req.params || !req.data) return;
      const device = await getDeviceInHub<BasicMotor>(
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
    const device = await getDeviceInHub<BasicMotor>(
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
      const device = await getDeviceInHub<BasicMotor>(
        poweredUp,
        req.params["uuid"],
        req.params["port"]
      );
      const [from, to, time] = req.data.split(",");
      await device.rampPower(Number(from), Number(to), Number(time));
      return;
    }
  );
  generalIORouter.insertRoute(
    "/poweredUp/:uuid/:port/playSound",
    async (req) => {
      if (req.method !== "out" || !req.params || !req.data) return;
      const device = await getDeviceInHub<DuploTrainBaseSpeaker>(
        poweredUp,
        req.params["uuid"],
        req.params["port"]
      );
      await device.playSound(Number(req.data));
      return;
    }
  );
  generalIORouter.insertRoute(
    "/poweredUp/:uuid/:port/playTone",
    async (req) => {
      if (req.method !== "out" || !req.params || !req.data) return;
      const device = await getDeviceInHub<DuploTrainBaseSpeaker>(
        poweredUp,
        req.params["uuid"],
        req.params["port"]
      );
      if (!(device instanceof DuploTrainBaseSpeaker)) return;
      device.playTone(Number(req.data));
      return;
    }
  );

  return () => {
    poweredUp.getHubs().forEach((hub) => {
      if (!hub.connected) return;
      hub.disconnect();
    });
  };
}

async function getDeviceInHub<T = unknown>(
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
