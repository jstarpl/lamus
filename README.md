```
 __         ______     __    __     __  __     ______    
/\ \       /\  __ \   /\ "-./  \   /\ \/\ \   /\  ___\   
\ \ \____  \ \  __ \  \ \ \-./\ \  \ \ \_\ \  \ \___  \  
 \ \_____\  \ \_\ \_\  \ \_\ \ \_\  \ \_____\  \/\_____\ 
  \/_____/   \/_/\/_/   \/_/  \/_/   \/_____/   \/_____/ 
                                                         
```

Installing
===

Make sure you have NodeJS version 18 or later and `corepack` enabled.

Install all dependencies using:

```
yarn
```

And later get the Vercel CLI to get the backend running:

```
npm i -g vercel@latest
```

Then to build the QBasic Virtual Machine, run:

```
yarn build
```


Running
===

Run a development server using

```
vercel dev
```


Generating JWK encryption keys and secrets
===

In order for the API to be implemented using lambda functions, the authorization implementation uses JWT tokens. These are produced when a user logs in, and then their signature is verified without having to query the user information data store. Because of that, a unique set of signing and encryption keys is required for every deployment. These are then decoded when the lambda function runs to verify the signature on the JWT.

Use the `scripts/key-manager.mjs` to generate a KEY & IV pair using `generate-secret` command. Then you can generate a key pair for signing and encrypting the JWT tokens using `generate-pair`. You will need to generate two pairs, which will be encoded as a single, base64-encoded string. The resulting string needs to be put in the `keys.enc.json` file as `enc` and `sig` properties respectively. The KEY and IV secrets should be provided as environment variables `ENCRYPTION_KEY` and `ENCRYPTION_IV` for decryption by the lambda functions placed in the `/api` directory.
