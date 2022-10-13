# Flow control

## IF ... THEN ... ELSE

:::usage

- :type[statement]
- ```
  IF condition1 THEN
      [statement block]
  [ELSEIF condition2 THEN]
      [statement block]
  [ELSE]
      [statement block]
  END IF
  ```
- ```
  IF condition THEN statement [ELSE statement]
  ```

:::

Controls the flow of the program by testing the conditions and executing
different the contained statement blocks if the condition is non-zero. The
`ELSE` keyword allows executing a statement block if none of the `IF`/`ELSEIF`
statements were true.
