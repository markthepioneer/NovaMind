/**
 * Interface for all LLM providers
 */
export interface LLMProvider {
  /**
   * Get a completion from the LLM
   * @param prompt The prompt to send to the LLM
   * @param options Optional parameters for the request
   * @returns The LLM's response
   */
  getCompletion(prompt: string, options?: any): Promise<string>;

  /**
   * Get a structured completion from the LLM (JSON output)
   * @param prompt The prompt to send to the LLM
   * @param schema The JSON schema to validate against
   * @param options Optional parameters for the request
   * @returns The LLM's response as a structured object
   */
  getStructuredCompletion<T>(
    prompt: string,
    schema: any,
    options?: any
  ): Promise<T>;
}
