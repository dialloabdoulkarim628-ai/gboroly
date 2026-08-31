import { BadRequestException, PipeTransform } from '@nestjs/common';
import type { ZodSchema } from 'zod';

/**
 * Valide le body/params contre un schéma Zod partagé (@gboroly/validation).
 * Ne jamais faire confiance au frontend : validation systématique côté API.
 */
export class ZodValidationPipe<T> implements PipeTransform {
  constructor(private readonly schema: ZodSchema<T>) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Entrée invalide',
          details: result.error.flatten(),
        },
      });
    }
    return result.data;
  }
}
