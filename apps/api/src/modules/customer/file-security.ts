import { fileTypeFromBuffer } from 'file-type';

import { AppError } from '../../common/errors/app-error.js';

const ALLOWED = new Map([
  ['image/jpeg', new Set(['jpg', 'jpeg'])],
  ['image/png', new Set(['png'])],
  ['image/webp', new Set(['webp'])],
  ['application/pdf', new Set(['pdf'])],
]);

export async function validateWarrantyFile(file: Express.Multer.File): Promise<{
  mimeType: string;
  extension: string;
}> {
  const detected = await fileTypeFromBuffer(file.buffer);
  const extension = file.originalname.split('.').pop()?.toLowerCase() ?? '';
  const permittedExtensions = detected ? ALLOWED.get(detected.mime) : undefined;
  if (
    !detected ||
    !permittedExtensions?.has(extension) ||
    detected.mime !== file.mimetype.toLowerCase()
  ) {
    throw new AppError({
      code: 'FILE_TYPE_INVALID',
      message: 'Upload a JPEG, PNG, WebP, or PDF file whose content matches its file type.',
      statusCode: 422,
    });
  }
  return { mimeType: detected.mime, extension: detected.ext };
}
