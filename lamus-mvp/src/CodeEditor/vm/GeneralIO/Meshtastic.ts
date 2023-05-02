import { GeneralIORouter } from "@lamus/qbasic-vm";
import {
  Client,
  IBLEConnection,
  IHTTPConnection,
  ISerialConnection,
  Types,
} from "@meshtastic/meshtasticjs/dist/index";
import { MyNodeInfo, NodeInfo } from "@meshtastic/meshtasticjs/dist/generated";

const HTTP_FETCH_INTERVAL = 3000;

type ISomeMeshtasticConnection =
  | IBLEConnection
  | IHTTPConnection
  | ISerialConnection;

type TextMessage = Types.PacketMetadata<string>;

export default function setup(router: GeneralIORouter) {
  let currentConnection: ISomeMeshtasticConnection | null = null;
  let messageInbox: TextMessage[] = [];
  let knownNodes: NodeInfo[] = [];
  let myNode: MyNodeInfo | null = null;
  let myNodeStatus: Types.DeviceStatusEnum =
    Types.DeviceStatusEnum.DEVICE_DISCONNECTED;

  const client = new Client();

  function initConnection(connection: ISomeMeshtasticConnection) {
    messageInbox.length = 0;
    knownNodes.length = 0;
    myNode = null;
    myNodeStatus = Types.DeviceStatusEnum.DEVICE_DISCONNECTED;

    connection.events.onMessagePacket.subscribe((pkt) => {
      console.log(pkt);
      messageInbox.push(pkt);
      router.emit("/meshtastic/packet/message", JSON.stringify(pkt));
    });
    connection.events.onNodeInfoPacket.subscribe((pkt) => {
      console.log(pkt);
      knownNodes = knownNodes.filter((oldNode) => oldNode.num !== pkt.num);
      knownNodes.push(pkt);
      router.emit("/meshtastic/packet/nodeInfo", JSON.stringify(pkt));
    });
    connection.events.onMyNodeInfo.subscribe((pkt) => {
      console.log(pkt);
      myNode = pkt;
      router.emit("/meshtastic/packet/myNodeInfo", JSON.stringify(pkt));
    });
    connection.events.onDeviceStatus.subscribe((status) => {
      console.log(status);
      myNodeStatus = status;
      router.emit("/meshtastic/packet/deviceStatus", `${status}`);
    });
  }

  router.insertRoute("/meshtastic/connection", async (req) => {
    if (req.method !== "in") return;

    if (!currentConnection) return "";
    return currentConnection.connType;
  });
  router.insertRoute("/meshtastic/connection/http", async (req) => {
    if (req.method !== "out" || !req.data) return;
    if (currentConnection) {
      await currentConnection.disconnect();
      client.removeConnection(currentConnection);
    }

    const connection = client.createHTTPConnection();
    currentConnection = connection;
    initConnection(connection);
    await connection.connect({
      address: req.data,
      fetchInterval: HTTP_FETCH_INTERVAL,
      receiveBatchRequests: false,
    });
  });
  router.insertRoute("/meshtastic/connection/bt", async (req) => {
    if (req.method !== "out") return;
    if (currentConnection) {
      await currentConnection.disconnect();
      client.removeConnection(currentConnection);
    }

    const connection = client.createBLEConnection();
    currentConnection = connection;
    initConnection(connection);
    await connection.connect({});
  });
  router.insertRoute("/meshtastic/connection/serial", async (req) => {
    if (req.method !== "out") return;
    if (currentConnection) {
      await currentConnection.disconnect();
      client.removeConnection(currentConnection);
    }

    const connection = client.createSerialConnection();
    currentConnection = connection;
    initConnection(connection);
    await connection.connect({
      concurrentLogOutput: false,
    });
  });
  router.insertRoute("/meshtastic/inbox", async (req) => {
    if (req.method === "in") {
      const data = JSON.stringify(messageInbox);
      messageInbox.length = 0;
      return data;
    }

    if (!req.data) return;
    if (!currentConnection) throw new Error("No Meshtastic connection");
  });
  router.insertRoute("/meshtastic/outbox", async (req) => {
    if (req.method !== "out" || !req.data) return;

    if (!currentConnection) throw new Error("No Meshtastic connection");
    currentConnection.sendText({
      text: req.data,
    });
  });
  router.insertRoute("/meshtastic/outbox/:nodeNum", async (req) => {
    if (req.method !== "out" || !req.data || !req.params) return;

    const dstNum = parseInt(req.params["nodeNum"], 10);

    if (!currentConnection) throw new Error("No Meshtastic connection");
    await currentConnection.sendText({
      text: req.data,
      destination: dstNum,
      wantAck: true,
    });
  });
  router.insertRoute("/meshtastic/knownNodes", async (req) => {
    if (req.method !== "in") return;
    const data = JSON.stringify(knownNodes);
    return data;
  });
  router.insertRoute("/meshtastic/knownNodes/:nodeNum", async (req) => {
    if (req.method !== "in" || !req.params || !req.params.nodeNum) return;
    const nodeNum = Number(req.params.nodeNum);
    const node = knownNodes.find((node) => node.num === nodeNum) ?? {};
    const data = JSON.stringify(node);
    return data;
  });
  router.insertRoute("/meshtastic/myNode", async (req) => {
    if (req.method !== "in") return;
    const data = JSON.stringify(myNode);
    return data;
  });
  router.insertRoute("/meshtastic/deviceStatus", async (req) => {
    if (req.method !== "in") return;
    const data = `${myNodeStatus}`;
    return data;
  });

  return async () => {
    if (!currentConnection) return;
    await currentConnection.disconnect();
  };
}
