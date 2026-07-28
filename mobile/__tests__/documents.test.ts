import {
  documentKindFromMime, buildDocumentPath, isSizeAllowed, MAX_DOCUMENT_BYTES,
} from '@/data/documents';

describe('documentKindFromMime', () => {
  it('maps image mime types to image', () => {
    expect(documentKindFromMime('image/jpeg')).toBe('image');
    expect(documentKindFromMime('image/png')).toBe('image');
    expect(documentKindFromMime('image/heic')).toBe('image');
  });

  it('maps application/pdf to pdf', () => {
    expect(documentKindFromMime('application/pdf')).toBe('pdf');
  });

  it('rejects everything else', () => {
    expect(documentKindFromMime('text/plain')).toBeNull();
    expect(documentKindFromMime(undefined)).toBeNull();
    expect(documentKindFromMime('')).toBeNull();
  });
});

describe('buildDocumentPath', () => {
  it('puts the owner uid first (storage RLS requires it)', () => {
    expect(buildDocumentPath('user-1', 'abc', 'image')).toBe('user-1/abc.jpg');
    expect(buildDocumentPath('user-1', 'abc', 'pdf')).toBe('user-1/abc.pdf');
  });
});

describe('isSizeAllowed', () => {
  it('allows unknown sizes (bucket enforces server-side)', () => {
    expect(isSizeAllowed(undefined)).toBe(true);
  });
  it('allows at and below the cap, rejects above', () => {
    expect(isSizeAllowed(MAX_DOCUMENT_BYTES)).toBe(true);
    expect(isSizeAllowed(MAX_DOCUMENT_BYTES + 1)).toBe(false);
  });
});
