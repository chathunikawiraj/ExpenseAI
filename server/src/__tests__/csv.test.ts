describe('CSV Formula Injection Neutralization (FR-28, FR-29)', () => {
  const sanitizeCsvCell = (val: any): string => {
    const str = String(val ?? '').trim();
    // Neutralize formula injection: prefix =, +, -, @ with single quote '
    if (/^[=+\-@]/.test(str)) {
      return `'${str}`;
    }
    return str;
  };

  test('neutralizes formula injection characters (=, +, -, @)', () => {
    expect(sanitizeCsvCell('=SUM(A1:A10)')).toBe("'=SUM(A1:A10)");
    expect(sanitizeCsvCell('+123456')).toBe("'+123456");
    expect(sanitizeCsvCell('-50.00')).toBe("'-50.00");
    expect(sanitizeCsvCell('@cmd|"/c calc"!A0')).toBe("'@cmd|\"/c calc\"!A0");
  });

  test('preserves benign alphanumeric strings and standard amounts', () => {
    expect(sanitizeCsvCell('Hunter Macbook Pro')).toBe('Hunter Macbook Pro');
    expect(sanitizeCsvCell('1280.50')).toBe('1280.50');
    expect(sanitizeCsvCell('Apple Store Fifth Ave')).toBe('Apple Store Fifth Ave');
  });
});
