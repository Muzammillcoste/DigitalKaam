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
  /** Immutable base — stored so instructions can be refreshed each turn without losing base content. */
  public baseInstructions: string
  public tools: Tool[]
  public model: string
  public memory: Memory
  /**
   * Key/value pairs merged into EVERY tool call args by the server.
   * Used to inject sessionId and userId so the LLM cannot accidentally omit them.
   */
  public sessionMetadata: Record<string, any>
  private ai: GoogleGenAI

  constructor(config: AgentConfig) {
    this.name = config.name
    this.instructions = config.instructions
    this.baseInstructions = config.instructions
    this.tools = config.tools || []
    this.model = config.model || 'gemini-2.5-flash'
    this.memory = new Memory()
    this.sessionMetadata = {}
    
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
          
          // Merge server-side session metadata (sessionId, userId) into args.
          // This guarantees tools always receive them regardless of LLM behaviour.
          const mergedArgs = { ...call.args, ...this.sessionMetadata }
          console.log(`[Agent: ${this.name}] Executing Tool: ${call.name}`, mergedArgs)
          const toolResult = await tool.execute(mergedArgs)
          
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
