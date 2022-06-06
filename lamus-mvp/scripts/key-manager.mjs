import { program } from "commander";
import { generateKeyPair, exportJWK } from "jose";
import fs from "fs";
import crypto from "crypto";

const algorithm = "aes-256-cbc";

// TODO: Generate an AES secret key, then generate two key pairs, save them in
// api/keys.enc.json and then set up the KEY and IV using `vercel env add`.

program
  .name("key-manager")
  .description("Generate, decrypt and encrypt JSON Web Keys");

program.command("generate-secret").action(async () => {
  console.log("IV= " + crypto.randomBytes(16).toString("base64"));
  console.log("KEY= " + crypto.randomBytes(32).toString("base64"));
});

program
  .command("generate-pair")
  .description(
    "Generate a key pair object and encrypt it using provided AES key and encode as base64"
  )
  .argument("<key>")
  .option("--iv <string>")
  .action(async (keyStr, options) => {
    const { privateKey, publicKey } = await generateKeyPair("PS256", {
      extractable: true,
    });
    const [privateJWK, publicJWK] = await Promise.all([
      exportJWK(privateKey),
      exportJWK(publicKey),
    ]);

    const iv = Buffer.from(options.iv, "base64");
    const key = Buffer.from(keyStr, "base64");

    const keyPair = {
      private: privateJWK,
      public: publicJWK,
    };

    console.error(JSON.stringify(keyPair, undefined, 2));

    const keyPairJSON = JSON.stringify(keyPair);
    const cipher = crypto.createCipheriv(algorithm, key, iv);

    const buffer = Buffer.concat([
      cipher.update(keyPairJSON, "utf-8"),
      cipher.final(),
    ]);
    console.log(buffer.toString("base64"));
  });

program
  .command("decrypt")
  .argument("<file>")
  .option("--key <string>")
  .option("--iv <string>")
  .action(async (file, options) => {
    const iv = Buffer.from(options.iv, "base64");
    const key = Buffer.from(options.key, "base64");

    const cipher = crypto.createDecipheriv(algorithm, key, iv);

    const data = fs.readFileSync(file, { encoding: "utf-8" });
    const dataToDecrypt = Buffer.from(data, "base64");

    console.log(
      Buffer.concat([
        cipher.update(dataToDecrypt, "base64"),
        cipher.final(),
      ]).toString("utf-8")
    );
  });

program.parse();
