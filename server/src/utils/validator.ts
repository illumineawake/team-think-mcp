import Ajv, { JSONSchemaType, ValidateFunction } from 'ajv';

/**
 * Validation utility using AJV for JSON Schema validation
 * Compiles and caches validator functions for performance
 */
export class Validator {
  private static instance: Validator | null = null;
  private ajv: Ajv;
  private compiledValidators: Map<string, ValidateFunction> = new Map();

  private constructor() {
    this.ajv = new Ajv({ 
      allErrors: true,
      removeAdditional: true,
      useDefaults: true,
      coerceTypes: true
    });
  }

  /**
   * Get singleton instance of validator
   */
  public static getInstance(): Validator {
    if (!Validator.instance) {
      Validator.instance = new Validator();
    }
    return Validator.instance;
  }

  /**
   * Compile and cache a JSON schema validator
   * @param schemaId Unique identifier for the schema
   * @param schema JSON schema object
   * @returns Compiled validator function
   */
  public compileSchema<T = any>(schemaId: string, schema: JSONSchemaType<T>): ValidateFunction<T> {
    // Check if already compiled and cached
    const cached = this.compiledValidators.get(schemaId);
    if (cached) {
      return cached as ValidateFunction<T>;
    }

    // Compile and cache the validator
    const validator = this.ajv.compile(schema);
    this.compiledValidators.set(schemaId, validator);
    
    return validator;
  }

  /**
   * Get a cached validator by schema ID
   * @param schemaId Schema identifier
   * @returns Cached validator function or undefined
   */
  public getValidator<T = any>(schemaId: string): ValidateFunction<T> | undefined {
    return this.compiledValidators.get(schemaId) as ValidateFunction<T> | undefined;
  }

  /**
   * Validate data against a compiled schema
   * @param schemaId Schema identifier
   * @param data Data to validate
   * @returns Validation result with errors if any
   */
  public validate<T = any>(schemaId: string, data: unknown): { 
    valid: boolean; 
    data?: T; 
    errors?: string[] 
  } {
    const validator = this.getValidator<T>(schemaId);
    if (!validator) {
      throw new Error(`No validator found for schema: ${schemaId}`);
    }

    const valid = validator(data);
    
    if (valid) {
      return { valid: true, data: data as T };
    } else {
      const errors = validator.errors?.map(error => {
        const path = error.instancePath || error.schemaPath;
        return `${path}: ${error.message}`;
      }) || ['Unknown validation error'];
      
      return { valid: false, errors };
    }
  }

  /**
   * Clear all cached validators (useful for testing)
   */
  public clearCache(): void {
    this.compiledValidators.clear();
  }

  /**
   * Get the number of cached validators
   */
  public getCacheSize(): number {
    return this.compiledValidators.size;
  }
}

/**
 * Convenience function to get validator instance
 */
export const getValidator = (): Validator => Validator.getInstance();