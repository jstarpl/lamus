# Networking

## FETCH

:::usage

- :type[sub]
- 

:::

Connect to an HTTP/HTTPS server and request given URL, send an optional body
along with the request.

This Subroutine allows you to implement communication with REST APIs.

## WSOPEN

:::usage

- :type[sub]
- ```
  WSOPEN URL$, OUT ERR_CODE% [, HANDLE% [, PROTOCOL$]]
  ```
- `URL$`: :type[STRING] URL of the WebSocket server to connect to
- `ERR_CODE%`: :type[INTEGER] a variable that can receive the Error Code.
- `HANDLE%`: :type[INTEGER] :optional a number representing the connection.
  If it's already used, Error Code will be set and no connection will be
  created.
- `PROTOCOL$`: :type[STRING] :optional text representing the protocol that will
  be used by this connection. This allows the remote WebSocket server to select
  given protocol when supporting various protocols on the same WebSocket URL.

:::

Open a WebSocket connection to a given URL. If that's not possible for some
reason, `ERR_CODE%` will be set to `-1`. If the connection is succesfully
established, `ERR_CODE%` will be set to `0`.

## WSWRITE

Send a message through an established WebSocket connection. If the message could
not be sent, `ERR_CODE%` will be set to `-1`. Otherwise it will be set to `0`.

## WSREAD

Get a received message from the WebSocket connection buffer. The messages are
returned in the order they were received. If the buffer is empty, or there is
a some connection issue, the `ERR_CODE%` will be set to `-1`. Otherwise it will
be set to `0`.
