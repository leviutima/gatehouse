import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { ZodValidationPipe } from './zod-validation.pipe.js';

const schema = z.object({
  username: z.string().trim().min(3),
  profile: z.object({ age: z.coerce.number().int().min(0) }),
});

describe('ZodValidationPipe', () => {
  const pipe = new ZodValidationPipe(schema);

  it('returns the parsed and transformed value', () => {
    expect(
      pipe.transform({ username: '  levi ', profile: { age: '30' } }),
    ).toEqual({
      username: 'levi',
      profile: { age: 30 },
    });
  });

  it('strips unknown keys', () => {
    expect(
      pipe.transform({ username: 'levi', profile: { age: 1 }, admin: true }),
    ).not.toHaveProperty('admin');
  });

  it('throws 400 listing every invalid field with its path', () => {
    let error: unknown;
    try {
      pipe.transform({ username: 'x', profile: { age: -1 } });
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(BadRequestException);
    const body = (error as BadRequestException).getResponse() as {
      error: string;
      issues: { path: string }[];
    };
    expect(body.error).toBe('validation_failed');
    expect(body.issues.map((issue) => issue.path)).toEqual([
      'username',
      'profile.age',
    ]);
  });
});
