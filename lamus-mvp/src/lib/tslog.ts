export class Logger {
  name: string = ''
  constructor(opts?: { name?: string }) {
    this.name = opts?.name ?? ''
  }
  getSubLogger(opts?: { name?: string }): Logger {
    return new Logger({ name: opts?.name })
  }
  private getFormatedName(): string[] {
    return [ `%c${this.name}`, 'font-weight: bold' ]
  }
  debug(...args: any[]): void {
    console.log(...this.getFormatedName(), ...args)
  }
  info(...args: any[]): void {
    console.log(...this.getFormatedName(), ...args)
  }
  warning(...args: any[]): void {
    console.warn(...this.getFormatedName(), ...args)
  }
  warn(...args: any[]): void {
    console.warn(...this.getFormatedName(), ...args)
  }
  error(...args: any[]): void {
    console.error(...this.getFormatedName(), ...args)
  }
  trace(...args: any[]): void {
    console.log(...this.getFormatedName(), ...args)
  }
  verbose(...args: any[]): void {
    console.log(...this.getFormatedName(), ...args)
  }
}
