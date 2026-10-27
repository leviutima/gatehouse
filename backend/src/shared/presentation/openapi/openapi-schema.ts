import type { SchemaObject } from '@nestjs/swagger';
import { z } from 'zod';

export function openApiSchema(
  schema: z.ZodType,
  io: 'input' | 'output' = 'output',
): SchemaObject {
  return z.toJSONSchema(schema, { target: 'openapi-3.0', io }) as SchemaObject;
}
