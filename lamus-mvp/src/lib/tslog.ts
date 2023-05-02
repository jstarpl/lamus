export class Logger {
  constructor() {
    console.log("Logger")
  }
  getSubLogger(): Logger {
    return new Logger()
  }
  debug(...args: any[]): void {
    console.log(...args)
  }
  info(...args: any[]): void {
    console.log(...args)
  }
  warning(...args: any[]): void {
    console.warn(...args)
  }
  warn(...args: any[]): void {
    console.warn(...args)
  }
  error(...args: any[]): void {
    console.error(...args)
  }
  trace(...args: any[]): void {
    console.log(...args)
  }
  verbose(...args: any[]): void {
    console.log(...args)
  }
}
