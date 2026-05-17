import { Content } from '@google/genai'

export class Memory {
  private history: Content[] = []

  public getHistory(): Content[] {
    return this.history
  }

  public addMessage(role: 'user' | 'model', parts: any[]) {
    this.history.push({ role, parts })
  }

  public addFunctionCallAndResponse(functionCallPart: any, functionResponsePart: any) {
    this.history.push({ role: 'model', parts: [functionCallPart] })
    this.history.push({ role: 'user', parts: [functionResponsePart] })
  }

  public clear() {
    this.history = []
  }
}
