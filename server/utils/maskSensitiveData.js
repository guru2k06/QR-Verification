/**
 * Masks sensitive fields in the document metadata based on documentType category.
 * - Medical Report: removes clinical diagnosis/results fields entirely.
 * - Government ID: masks identification numbers (retains only the last 4 characters).
 * - General: masks credit card and bank account fields if present.
 * 
 * @param {string} documentType - The document classification
 * @param {object} rawData - Key-value pair metadata object
 * @returns {object} Masked/filtered metadata object
 */
function maskSensitiveData(documentType, rawData) {
  if (!rawData || typeof rawData !== 'object') {
    return {};
  }

  // Deep clone to avoid mutating original object
  const data = JSON.parse(JSON.stringify(rawData));
  const type = String(documentType).trim().toLowerCase();

  // Categorize
  let category = 'Academic';
  if (['certificate', 'marksheet', 'degree', 'bonafide', 'academic'].some(t => type.includes(t))) {
    category = 'Academic';
  } else if (['offer', 'experience', 'employment', 'job'].some(t => type.includes(t))) {
    category = 'Employment';
  } else if (['medical'].some(t => type.includes(t))) {
    category = 'Medical Report';
  } else if (['invoice', 'billing'].some(t => type.includes(t))) {
    category = 'Invoice';
  } else if (['legal', 'contract', 'agreement'].some(t => type.includes(t))) {
    category = 'Legal';
  } else if (['identity', 'id', 'government', 'passport', 'aadhaar'].some(t => type.includes(t))) {
    category = 'Government ID';
  }

  // Masking helper
  const maskNumberValue = (value) => {
    if (value === null || value === undefined) return '';
    const str = String(value).trim();
    if (str.length <= 4) return str;
    return 'X'.repeat(str.length - 4) + str.slice(-4);
  };

  // 1. Medical Report: remove diagnosis / results details completely
  if (category === 'Medical Report') {
    const prohibitedFields = ['diagnosis', 'results', 'symptoms', 'treatment', 'prescription', 'notes', 'medicalNotes'];
    prohibitedFields.forEach(field => {
      if (field in data) {
        delete data[field];
      }
      // Also check case-insensitive match
      Object.keys(data).forEach(k => {
        if (k.toLowerCase() === field.toLowerCase()) {
          delete data[k];
        }
      });
    });
  }

  // 2. Government ID: mask identification numbers (Aadhaar, Passport, SSN, etc.)
  if (category === 'Government ID') {
    Object.keys(data).forEach(key => {
      const lowerKey = key.toLowerCase();
      // Mask keys that look like numbers/identifiers, but skip standard descriptive fields
      const isIdKey = lowerKey.includes('number') || 
                      lowerKey.includes('id') || 
                      lowerKey.includes('ssn') || 
                      lowerKey.includes('passport') || 
                      lowerKey.includes('aadhaar');
      
      const isSystemField = key === 'documentId' || 
                            key === 'documentType' || 
                            key === 'idName' || 
                            key === 'recipientName';

      if (isIdKey && !isSystemField) {
        data[key] = maskNumberValue(data[key]);
      }
    });
  }

  // 3. Generic Masking (Accounts/Credit Cards) across all types
  Object.keys(data).forEach(key => {
    const lowerKey = key.toLowerCase();
    if (lowerKey.includes('creditcard') || lowerKey.includes('bankaccount') || lowerKey.includes('cardnumber')) {
      data[key] = maskNumberValue(data[key]);
    }
  });

  return data;
}

module.exports = maskSensitiveData;
