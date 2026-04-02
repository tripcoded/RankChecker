export const BATCH_RULES = [
  { name: 'IT', prefixes: ['2514670010', '2510670010'] },
  { name: 'CSE', prefixes: ['2514750010'] },
  { name: 'ECE', prefixes: ['2514830010'] },
  { name: 'Mechanical', prefixes: ['2514910010'] },
];

export function getBatchInfoFromRoll(rollNo: string): { code: string; name: string } {
  const digitsOnly = rollNo.replace(/\D/g, '');
  for (const rule of BATCH_RULES) {
    for (const prefix of rule.prefixes) {
      if (digitsOnly.startsWith(prefix)) {
        return { code: prefix, name: rule.name };
      }
    }
  }

  if (digitsOnly.length >= 10) {
    return { code: digitsOnly.slice(0, 10), name: 'General' };
  }

  if (rollNo.length > 3) {
    return { code: rollNo.slice(0, -3), name: 'General' };
  }

  return { code: rollNo, name: 'General' };
}

export function getBatchNameFromCode(code: string): string {
  for (const rule of BATCH_RULES) {
    if (rule.prefixes.includes(code)) {
      return rule.name;
    }
  }
  return 'General';
}

