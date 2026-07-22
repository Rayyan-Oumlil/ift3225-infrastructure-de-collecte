import { Ajv, type ValidateFunction } from 'ajv';

const ajv = new Ajv();
const ISO_8601 = '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(\\.\\d+)?(Z|[+-]\\d{2}:\\d{2})?$';

const schema = {
  type: 'object',
  properties: {
    type: { type: 'string', enum: ['audio'] },
    value: { type: 'number', minimum: 0, maximum: 200 },
    location: { type: 'string', minLength: 1 },
    timestamp: { type: 'string', pattern: ISO_8601 },
  },
  required: ['type', 'value', 'location'],
  additionalProperties: false,
};

const validate: ValidateFunction = ajv.compile(schema);
export default validate;
