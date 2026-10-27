import type { ArgumentsHost } from '@nestjs/common';
import { DomainError } from '../../domain/errors/domain-error.js';
import { DomainErrorFilter } from './domain-error.filter.js';

class SampleConflictError extends DomainError {
  readonly kind = 'conflict';
  readonly code = 'sample_conflict';
}

class SampleNotFoundError extends DomainError {
  readonly kind = 'not_found';
  readonly code = 'sample_not_found';
}

function createHost() {
  const response = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  const host = {
    switchToHttp: () => ({ getResponse: () => response }),
  } as unknown as ArgumentsHost;
  return { host, response };
}

describe('DomainErrorFilter', () => {
  const filter = new DomainErrorFilter();

  it('maps a conflict error to 409 with its code and message', () => {
    const { host, response } = createHost();

    filter.catch(new SampleConflictError('already exists'), host);

    expect(response.status).toHaveBeenCalledWith(409);
    expect(response.json).toHaveBeenCalledWith({
      statusCode: 409,
      error: 'sample_conflict',
      message: 'already exists',
    });
  });

  it('maps a not found error to 404', () => {
    const { host, response } = createHost();

    filter.catch(new SampleNotFoundError('missing'), host);

    expect(response.status).toHaveBeenCalledWith(404);
  });

  it('names the error after its subclass', () => {
    expect(new SampleConflictError('x').name).toBe('SampleConflictError');
  });
});
