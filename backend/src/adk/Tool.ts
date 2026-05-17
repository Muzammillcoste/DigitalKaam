import { FunctionDeclaration, Type } from '@google/genai'

export interface ToolConfig {
  name: string
  description: string
  parameters?: Record<string, any>
  execute: (args: any) => Promise<any>
}

export class Tool {
  public name: string
  public description: string
  public parameters: Record<string, any> | undefined
  public execute: (args: any) => Promise<any>

  constructor(config: ToolConfig) {
    this.name = config.name
    this.description = config.description
    this.parameters = config.parameters
    this.execute = config.execute
  }

  public toFunctionDeclaration(): FunctionDeclaration {
    return {
      name: this.name,
      description: this.description,
      parameters: this.parameters as any
    }
  }
}
