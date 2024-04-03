import { LRParser } from "@lezer/lr"

declare module "*.grammar" {
  export const parser: LRParser 
}
