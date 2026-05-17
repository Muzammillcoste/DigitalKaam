import { GoogleGenAI, GenerateContentResponse } from '@google/genai'
import { Tool } from './Tool'
import { Memory } from './Memory'

export interface AgentConfig {
  name: string
  instructions: string
  tools?: Tool[]
  model?: string
}

export class Agent {
  public name: string
  public instructions: string
  public tools: Tool[]
  public model: string
  public memory: Memory
  private ai: GoogleGenAI

  constructor(config: AgentConfig) {
    this.name = config.name
    this.instructions = config.instructions
    this.tools = config.tools || []
    this.model = config.model || 'gemini-2.5-flash'
    this.memory = new Memory()
    
    // Initialize SDK
    this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  }

  public async run(userInput: string): Promise<string> {
    this.memory.addMessage('user', [{ text: userInput }])

    let keepRunning = true
    let finalResponseText = ''

    while (keepRunning) {
      keepRunning = false
      
      const contents = this.memory.getHistory()
      const requestOptions: any = {
        model: this.model,
        contents,
        config: {
          systemInstruction: this.instructions,
        }
      }

      if (this.tools.length > 0) {
        requestOptions.config.tools = [{
          functionDeclarations: this.tools.map(t => t.toFunctionDeclaration())
        }]
      }

      const response = await this.ai.models.generateContent(requestOptions)
      
      const functionCalls = response.functionCalls
      if (functionCalls && functionCalls.length > 0) {
        keepRunning = true
        // Execute tool calls
        for (const call of functionCalls) {
          const tool = this.tools.find(t => t.name === call.name)
          if (!tool) {
             throw new Error(`Tool ${call.name} not found`)
          }
          
          console.log(`[Agent: ${this.name}] Executing Tool: ${call.name}`, call.args)
          const toolResult = await tool.execute(call.args)
          
          // Append function call and result to memory
          this.memory.addFunctionCallAndResponse(
            { functionCall: call },
            { functionResponse: { name: call.name, response: toolResult } }
          )
        }
      } else {
        finalResponseText = response.text || ''
        this.memory.addMessage('model', [{ text: finalResponseText }])
      }
    }

    return finalResponseText
  }
}
