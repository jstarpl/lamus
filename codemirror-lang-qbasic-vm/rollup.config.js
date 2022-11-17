import typescript from "rollup-plugin-ts"
import {lezer} from "@lezer/generator/rollup"

// https://codesandbox.io/s/jgon2k?file=/src/boolexpr/grammar.ts

export default {
  input: "src/index.ts",
  external: id => id != "tslib" && !/^(\.?\/|\w:)/.test(id),
  output: [
    {file: "dist/index.cjs", format: "cjs"},
    {dir: "./dist", format: "es"}
  ],
  plugins: [lezer(), typescript()]
}
