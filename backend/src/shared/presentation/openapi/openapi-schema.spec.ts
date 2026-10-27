import { z } from 'zod';
import { openApiSchema } from './openapi-schema.js';

describe('openApiSchema', () => {
  const schema = z.object({
    grant_type: z.literal('client_credentials'),
    scope: z.string().optional(),
    count: z.coerce.number().default(1),
  });

  it('describes a zod schema as an OpenAPI 3.0 schema object', () => {
    expect(openApiSchema(schema)).toEqual({
      type: 'object',
      properties: {
        grant_type: { type: 'string', enum: ['client_credentials'] },
        scope: { type: 'string' },
        count: { type: 'number', default: 1 },
      },
      required: ['grant_type', 'count'],
      additionalProperties: false,
    });
  });

  it('leaves fields with defaults optional when describing an input', () => {
    expect(openApiSchema(schema, 'input').required).toEqual(['grant_type']);
  });

  it('does not emit a JSON Schema dialect marker', () => {
    expect(openApiSchema(schema)).not.toHaveProperty('$schema');
  });
});
