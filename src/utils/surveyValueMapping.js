const MULTI_VALUE_FIELDS = new Set([
  'ZonasPiorCobertura',
  'LocalRecarga',
  'FontePromocoes',
  'FontesConfianca',
]);

const FIELD_DEFINITIONS = {
  Provincia: {
    canonical: ['Cabinda', 'Zaire'],
    aliases: {
      Cabinda: ['cabinda province'],
      Zaire: ['zaire province'],
    },
  },
  Municipio: {
    canonical: ['Cabinda', "M'banza Congo", 'Soyo'],
    aliases: {
      "M'banza Congo": ['mbanza congo', 'm banza congo'],
    },
  },
  FaixaEtaria: {
    canonical: ['18–24', '25–34', '35–44', '45–54', '55+'],
    aliases: {
      '18–24': ['18-24', '18 a 24'],
      '25–34': ['25-34', '25 a 34'],
      '35–44': ['35-44', '35 a 44'],
      '45–54': ['45-54', '45 a 54'],
      '55+': ['55 ou mais', '55 +', '55 and above', '55 or more'],
    },
  },
  Genero: {
    canonical: ['Masculino', 'Feminino'],
    aliases: {
      Masculino: ['masculino ', 'male', 'm'],
      Feminino: ['feminino ', 'female', 'f'],
    },
  },
  Ocupacao: {
    canonical: [
      'Estudante',
      'Empregado - Privado',
      'Empregado - Público',
      'Trabalhador(a) por conta própria',
      'Desempregado(a)',
      'Outro (especificar)',
    ],
    aliases: {
      'Trabalhador(a) por conta própria': ['trabalhador por conta própria', 'trabalhador por conta propria'],
      'Desempregado(a)': ['desempregado'],
      'Outro (especificar)': ['outro'],
    },
  },
  TipoTelefone: {
    canonical: ['Smartphone', 'Feature Phone (Básico)'],
    aliases: {
      Smartphone: ['smart phone'],
      'Feature Phone (Básico)': [
        'feature phone (basico)',
        'feature phone',
        'telemovel simples (feature phone)',
        'telemóvel simples (feature phone)',
        'telefone basico',
        'telefone básico',
      ],
    },
  },
  Suporta4G: {
    canonical: ['Sim', 'Não', 'Não sei'],
    aliases: {
      Sim: ['yes', 'y'],
      'Não': ['nao', 'no', 'n'],
      'Não sei': ['nao sei', "don't know", 'dont know', 'unknown'],
    },
  },
  ConfiguracaoSIM: {
    canonical: ['SIM único', 'Dual SIM'],
    aliases: {
      'SIM único': ['sim unico', 'single sim'],
      'Dual SIM': ['dual-sim', 'dual sim '],
    },
  },
  OperadorAtual: {
    canonical: ['Unitel', 'Movicel', 'Ambos'],
    aliases: {
      Unitel: ['unitel '],
      Movicel: ['movicel '],
      Ambos: ['both'],
    },
  },
  OperadorMaisVisivel: {
    canonical: ['Unitel', 'Movicel', 'Ambos por igual', 'Nenhum'],
    aliases: {
      'Ambos por igual': ['ambos', 'both equally', 'equal'],
      Nenhum: ['nenhum ', 'none'],
    },
  },
  UsoTelefone: {
    canonical: ['Chamadas', 'Dados', 'SMS', 'Todos por igual'],
    aliases: {
      Chamadas: ['calls'],
      Dados: ['dados ', 'data'],
      SMS: ['sms '],
      'Todos por igual': ['todos igualmente', 'all equally'],
    },
  },
  FrequenciaRecarga: {
    canonical: ['Diariamente', 'De vez em quando', 'Semanalmente', 'Quinzenalmente', 'Mensalmente'],
    aliases: {
      Diariamente: ['diariamente '],
      'De vez em quando': ['de vez em quando ', 'occasionally'],
      Semanalmente: ['semanalmente '],
      Quinzenalmente: ['quinzenalmente ', 'biweekly', 'fortnightly'],
      Mensalmente: ['mensalmente '],
    },
  },
  ValorRecarga: {
    canonical: ['<200 Kz', '200–500 Kz', '500–1.000 Kz', '1.000–2.500 Kz', '2.500–5.000 Kz', '5.000+ Kz'],
    aliases: {
      '<200 Kz': ['< 200 kz', 'menos de 200 kz'],
      '200–500 Kz': ['200-500 kz', '200 a 500 kz'],
      '500–1.000 Kz': ['500-1.000 kz', '500 a 1.000 kz', '500-1000 kz'],
      '1.000–2.500 Kz': ['1.000-2.500 kz', '1.000 a 2.500 kz', '1000-2500 kz'],
      '2.500–5.000 Kz': ['2.500-5.000 kz', '2.500 a 5.000 kz', '2500-5000 kz'],
      '5.000+ Kz': ['5.000+ kz ', '5000+ kz', 'mais de 5.000 kz'],
    },
  },
  RazaoRecarga: {
    canonical: ['Conveniência', 'Proximidade', 'Confiança', 'Única opção disponível', 'Outro (especificar)'],
    aliases: {
      Conveniência: ['conveniencia', 'convenience'],
      Proximidade: ['proximity'],
      Confiança: ['confianca', 'trust'],
      'Única opção disponível': ['unica opcao disponivel', 'única opcao disponivel', 'only option available'],
      'Outro (especificar)': ['outro'],
    },
  },
  UsaMobileMoney: {
    canonical: ['Sim', 'Não'],
    aliases: {
      Sim: ['yes', 'y'],
      'Não': ['nao', 'no', 'n'],
    },
  },
  PacotePreferido: {
    canonical: ['Apenas dados', 'Apenas voz', 'Misto (voz + dados)', 'Redes sociais', 'Noturno/fim de semana', 'Pré-pago sem pacote'],
    aliases: {
      'Apenas dados': ['data only'],
      'Apenas voz': ['voice only'],
      'Misto (voz + dados)': ['misto', 'misto (voz e dados)', 'voz e dados', 'voice & data'],
      'Redes sociais': ['social media'],
      'Noturno/fim de semana': ['noturno / fim de semana', 'night/weekend'],
      'Pré-pago sem pacote': ['pre-pago sem pacote', 'pré pago sem pacote'],
    },
  },
  MudariaOperador: {
    canonical: ['Sim', 'Talvez', 'Não'],
    aliases: {
      Sim: ['yes', 'y'],
      Talvez: ['maybe'],
      'Não': ['nao', 'no', 'n'],
    },
  },
  InteresseDiscussao: {
    canonical: ['Sim', 'Não'],
    aliases: {
      Sim: ['yes', 'y'],
      'Não': ['nao', 'no', 'n'],
    },
  },
  TemGravacoes: {
    canonical: ['Sim', 'Nao'],
    aliases: {
      Sim: ['yes', 'y'],
      Nao: ['não', 'nao ', 'no', 'n'],
    },
  },
};

export const ANALYTICS_MAPPING_FIELDS = [
  'Provincia',
  'Municipio',
  'FaixaEtaria',
  'Genero',
  'Ocupacao',
  'TipoTelefone',
  'Suporta4G',
  'ConfiguracaoSIM',
  'OperadorAtual',
  'FrequenciaRecarga',
  'ValorRecarga',
  'MudariaOperador',
  'UsaMobileMoney',
  'PacotePreferido',
  'TemGravacoes',
];

const normalizeLookupToken = (value) =>
  String(value ?? '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’]/g, "'")
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .toLowerCase();

const cleanValue = (value) => String(value ?? '').trim().replace(/\s+/g, ' ');

const FIELD_LOOKUPS = Object.fromEntries(
  Object.entries(FIELD_DEFINITIONS).map(([field, config]) => {
    const lookup = new Map();

    config.canonical.forEach((canonicalValue) => {
      lookup.set(normalizeLookupToken(canonicalValue), canonicalValue);
    });

    Object.entries(config.aliases || {}).forEach(([canonicalValue, aliases]) => {
      aliases.forEach((alias) => {
        lookup.set(normalizeLookupToken(alias), canonicalValue);
      });
    });

    return [field, lookup];
  })
);

function normalizeSingleValue(field, rawValue) {
  const cleanedValue = cleanValue(rawValue);
  if (!cleanedValue) return '';

  const lookup = FIELD_LOOKUPS[field];
  if (!lookup) return cleanedValue;

  return lookup.get(normalizeLookupToken(cleanedValue)) || cleanedValue;
}

export function normalizeSurveyValue(field, rawValue) {
  if (rawValue === null || rawValue === undefined) return '';

  if (MULTI_VALUE_FIELDS.has(field)) {
    return String(rawValue)
      .split(',')
      .map((part) => normalizeSingleValue(field, part))
      .filter(Boolean)
      .join(', ');
  }

  return normalizeSingleValue(field, rawValue);
}

export function getSurveyValueMeta(field, rawValue) {
  const cleanedValue = cleanValue(rawValue);
  const normalizedValue = normalizeSurveyValue(field, rawValue);
  const hasDefinition = Boolean(FIELD_LOOKUPS[field]);
  const isMissing = !cleanedValue;
  const wasNormalized =
    Boolean(cleanedValue) &&
    Boolean(normalizedValue) &&
    normalizeLookupToken(cleanedValue) !== normalizeLookupToken(normalizedValue);
  const isCanonical =
    Boolean(cleanedValue) &&
    Boolean(normalizedValue) &&
    normalizeLookupToken(cleanedValue) === normalizeLookupToken(normalizedValue) &&
    FIELD_DEFINITIONS[field]?.canonical?.some(
      (canonicalValue) => normalizeLookupToken(canonicalValue) === normalizeLookupToken(normalizedValue)
    );
  const isUnmapped = Boolean(cleanedValue) && hasDefinition && !isCanonical && !wasNormalized;

  return {
    cleanedValue,
    normalizedValue,
    isMissing,
    isCanonical,
    wasNormalized,
    isUnmapped,
  };
}

export function translateSurveyValue(field, rawValue, t, { unknownLabel } = {}) {
  const { cleanedValue, normalizedValue, isMissing } = getSurveyValueMeta(field, rawValue);

  if (isMissing) return unknownLabel || '';

  const translationKey = normalizedValue || cleanedValue;
  return t(`survey.values.${translationKey}`, { defaultValue: translationKey });
}

export function normalizeSurveyRecord(record, fields = ANALYTICS_MAPPING_FIELDS) {
  const normalizedRecord = { ...record };

  fields.forEach((field) => {
    if (field in normalizedRecord) {
      normalizedRecord[field] = normalizeSurveyValue(field, normalizedRecord[field]);
    }
  });

  return normalizedRecord;
}

export function buildSurveyIntegrityReport(records, fields = ANALYTICS_MAPPING_FIELDS) {
  const fieldIssues = fields
    .map((field) => {
      const fieldSummary = {
        field,
        normalizedCount: 0,
        unmappedCount: 0,
        examples: new Map(),
      };

      records.forEach((record) => {
        const { cleanedValue, normalizedValue, wasNormalized, isUnmapped } = getSurveyValueMeta(field, record?.[field]);
        if (!cleanedValue) return;

        if (wasNormalized) fieldSummary.normalizedCount += 1;

        if (isUnmapped) {
          fieldSummary.unmappedCount += 1;
          const key = cleanedValue;
          const current = fieldSummary.examples.get(key) || { rawValue: cleanedValue, normalizedValue, count: 0 };
          current.count += 1;
          fieldSummary.examples.set(key, current);
        }
      });

      return {
        ...fieldSummary,
        examples: [...fieldSummary.examples.values()]
          .sort((a, b) => b.count - a.count)
          .slice(0, 3),
      };
    })
    .filter(({ normalizedCount, unmappedCount }) => normalizedCount > 0 || unmappedCount > 0)
    .sort((a, b) => b.unmappedCount + b.normalizedCount - (a.unmappedCount + a.normalizedCount));

  return {
    totalNormalized: fieldIssues.reduce((sum, item) => sum + item.normalizedCount, 0),
    totalUnmapped: fieldIssues.reduce((sum, item) => sum + item.unmappedCount, 0),
    fields: fieldIssues,
  };
}
